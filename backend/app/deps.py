import re

import httpx
from fastapi import Depends, Request

from .config import Settings, get_settings
from .supabase_store import SupabaseStore
from .usage import Identity, MemoryStore, UsageStore

_memory = MemoryStore()
DEVICE_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


class AuthError(Exception):
    def __init__(self, error: str, status: int, message: str):
        self.error, self.status, self.message = error, status, message


def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


def get_store(settings: Settings = Depends(get_settings), http: httpx.AsyncClient = Depends(get_http)) -> UsageStore:
    if settings.supabase_enabled:
        return SupabaseStore(settings, http)
    return _memory


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


async def identify(
    request: Request,
    settings: Settings = Depends(get_settings),
    http: httpx.AsyncClient = Depends(get_http),
) -> Identity:
    """Resolve the caller from `Authorization: Bearer <supabase access token>` or `X-Device-Id`."""
    ip = client_ip(request)
    auth = request.headers.get("authorization", "")
    token = auth[7:].strip() if auth.startswith("Bearer ") else None

    if token and settings.supabase_enabled:
        r = await http.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={"apikey": settings.supabase_anon_key or settings.supabase_service_role_key, "Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            raise AuthError("session_expired", 401, "Please sign in again.")
        user = r.json()
        plan = await SupabaseStore(settings, http).get_plan(user["id"])
        return Identity(
            kind="user",
            user_id=user["id"],
            email=user.get("email"),
            plan=plan if plan in ("free", "pro") else "free",
            ip=ip,
        )

    device_id = request.headers.get("x-device-id", "")
    if not DEVICE_RE.match(device_id):
        raise AuthError("missing_device_id", 400, "Missing or invalid X-Device-Id header.")
    return Identity(kind="anon", device_id=device_id, ip=ip)
