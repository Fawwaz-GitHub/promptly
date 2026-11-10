import logging

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import ratelimit
from .config import Settings, get_settings
from .deps import client_ip, get_http, get_store, identify
from .openrouter import UpstreamError, refine_prompt
from .plans import PLANS
from .prompts import MODES
from .usage import Identity, UsageStore, check_and_consume, get_status, refund

log = logging.getLogger("promptly")
router = APIRouter(prefix="/api")


def err(status: int, error: str, message: str, **extra) -> JSONResponse:
    return JSONResponse({"error": error, "message": message, **extra}, status_code=status)


class RefineIn(BaseModel):
    text: str = ""
    mode: str = "improve"


@router.post("/refine")
async def refine(
    request: Request,
    settings: Settings = Depends(get_settings),
    http: httpx.AsyncClient = Depends(get_http),
    store: UsageStore = Depends(get_store),
):
    if not ratelimit.rate_limit(f"ip:{client_ip(request)}", settings.rate_limit_per_minute):
        return err(429, "rate_limited", "Too many requests. Slow down a little.")

    try:
        body = RefineIn.model_validate(await request.json())
    except Exception:
        return err(400, "bad_request", "Body must be JSON like {\"text\": \"...\", \"mode\": \"improve\"}")
    text = body.text.strip()
    mode = body.mode if body.mode in MODES else "improve"
    if len(text) < 3:
        return err(400, "bad_request", "Write a little more first.")

    ident: Identity = await identify(request, settings, http)
    plan = "anonymous" if ident.kind == "anon" else ident.plan
    max_chars = PLANS[plan].max_chars
    if len(text) > max_chars:
        return err(413, "too_long", f"Prompts are limited to {max_chars} characters on your plan.")

    allowed, status = await check_and_consume(ident, store)
    if not allowed:
        msg = (
            f"You've used your {PLANS['anonymous'].lifetime} free refinements. "
            "Sign in with your email for unlimited refinements — it's free."
            if ident.kind == "anon"
            else "You've reached your plan's limit for today."
        )
        return err(402, "limit_reached", msg, usage=status.model_dump())

    try:
        result = await refine_prompt(text, mode, settings, http)
    except Exception as e:
        try:
            await refund(ident, store)
        except Exception:
            pass
        ue = e if isinstance(e, UpstreamError) else UpstreamError("Something went wrong talking to the AI.")
        log.warning("refine failed: %r", e)
        return err(ue.status, "upstream", ue.message)

    try:
        await store.log_event(
            user_id=ident.user_id, device_id=ident.device_id if ident.kind == "anon" else None,
            chars_in=len(text), model=result["model"], mode=mode,
        )
    except Exception as e:
        log.warning("log_event failed: %r", e)

    return {**result, "original": text, "mode": mode, "usage": status.model_dump()}


@router.get("/me")
async def me(
    request: Request,
    settings: Settings = Depends(get_settings),
    http: httpx.AsyncClient = Depends(get_http),
    store: UsageStore = Depends(get_store),
):
    ident = await identify(request, settings, http)
    status = await get_status(ident, store)
    return {
        "signedIn": ident.kind == "user",
        "email": ident.email,
        "usage": status.model_dump(),
        "authEnabled": settings.supabase_enabled,
    }


class RefreshIn(BaseModel):
    refresh_token: str


@router.post("/auth/refresh")
async def refresh(body: RefreshIn, settings: Settings = Depends(get_settings), http: httpx.AsyncClient = Depends(get_http)):
    """Lets the Chrome extension swap a refresh token for a fresh access token without bundling Supabase keys."""
    if not settings.supabase_enabled:
        return err(400, "auth_disabled", "Sign-in is not configured on this server.")
    r = await http.post(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/token",
        params={"grant_type": "refresh_token"},
        headers={"apikey": settings.supabase_anon_key},
        json={"refresh_token": body.refresh_token},
    )
    if r.status_code != 200:
        return err(401, "session_expired", "Please sign in again.")
    s = r.json()
    return {
        "access_token": s.get("access_token"),
        "refresh_token": s.get("refresh_token"),
        "expires_at": s.get("expires_at"),
        "email": (s.get("user") or {}).get("email"),
    }
