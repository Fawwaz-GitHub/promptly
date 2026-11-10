import logging

import httpx
from fastapi import APIRouter, Depends, Header, Request, Security
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from . import ratelimit
from .config import Settings, get_settings
from .deps import client_ip, get_http, get_store, identify
from .openrouter import UpstreamError, refine_prompt
from .plans import PLANS
from .prompts import MODES
from .usage import Identity, UsageStore, check_and_consume, get_status, refund

log = logging.getLogger("promptly")
router = APIRouter(prefix="/api")

# Documented in Swagger (the "Authorize" button); `identify` reads the same headers from the request.
bearer = HTTPBearer(auto_error=False, description="Supabase access token of a signed-in user. Leave empty to call as a guest.")
DeviceId = Header(
    None,
    alias="X-Device-Id",
    description="Guest identifier (8-64 chars of A-Z, a-z, 0-9, _ or -). Required when no Bearer token is sent.",
    examples=["swaggerdemo01"],
)


class UsageOut(BaseModel):
    plan: str = Field(examples=["anonymous"])
    limit: int | None = Field(description="null = unlimited", examples=[2])
    used: int = Field(examples=[1])
    remaining: int | None = Field(description="null = unlimited", examples=[1])
    period: str = Field(description='"lifetime" for guests, "daily" for signed-in users, or "unlimited"', examples=["lifetime"])


class RefineOut(BaseModel):
    improved: str = Field(examples=["Write a polite email to my manager asking for leave tomorrow. Keep it under 120 words."])
    changes: list[str] = Field(examples=[["Fixed grammar and spelling", "Added length constraint"]])
    model: str = Field(examples=["google/gemma-4-31b-it:free"])
    original: str = Field(examples=["write me email to boss for leave tomorow"])
    mode: str = Field(examples=["improve"])
    usage: UsageOut


class MeOut(BaseModel):
    signedIn: bool
    email: str | None
    usage: UsageOut
    authEnabled: bool


class ErrorOut(BaseModel):
    error: str = Field(examples=["limit_reached"])
    message: str = Field(examples=["You've used your 2 free refinements."])


class PlanOut(BaseModel):
    id: str
    label: str
    lifetime: int | None
    daily: int | None
    max_chars: int


def err(status: int, error: str, message: str, **extra) -> JSONResponse:
    return JSONResponse({"error": error, "message": message, **extra}, status_code=status)


class RefineIn(BaseModel):
    text: str = Field("", description="The prompt to improve (3+ characters).", examples=["write me email to boss for leave tomorow"])
    mode: str = Field("improve", description="improve | grammar | concise", examples=["improve"])


@router.post(
    "/refine",
    tags=["Refine"],
    summary="Improve a prompt",
    description="Rewrites a prompt with a free OpenRouter model. Counts against the caller's limit: "
    "guests get 2 refinements in total, signed-in users get 5 per UTC day.",
    response_model=RefineOut,
    responses={
        400: {"model": ErrorOut, "description": "Bad body or missing X-Device-Id"},
        401: {"model": ErrorOut, "description": "Expired Bearer token"},
        402: {"model": ErrorOut, "description": "Usage limit reached (`usage` included)"},
        413: {"model": ErrorOut, "description": "Prompt too long for the plan"},
        429: {"model": ErrorOut, "description": "Too many requests from this IP"},
        502: {"model": ErrorOut, "description": "AI provider error"},
        503: {"model": ErrorOut, "description": "Free model busy, retry shortly"},
    },
    openapi_extra={"requestBody": {"required": True, "content": {"application/json": {"schema": RefineIn.model_json_schema()}}}},
)
async def refine(
    request: Request,
    _auth: HTTPAuthorizationCredentials | None = Security(bearer),
    _device: str | None = DeviceId,
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
            f"Sign in with your email for {PLANS['free'].daily} refinements a day — it's free."
            if ident.kind == "anon"
            else f"You've used today's {status.limit} refinements. Come back tomorrow!"
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


@router.get(
    "/me",
    tags=["Account"],
    summary="Who am I and how many refinements are left",
    response_model=MeOut,
    responses={400: {"model": ErrorOut}, 401: {"model": ErrorOut}},
)
async def me(
    request: Request,
    _auth: HTTPAuthorizationCredentials | None = Security(bearer),
    _device: str | None = DeviceId,
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


@router.get("/plans", tags=["Account"], summary="Usage limits for every plan", response_model=list[PlanOut])
async def plans():
    return [PlanOut(id=k, label=v.label, lifetime=v.lifetime, daily=v.daily, max_chars=v.max_chars) for k, v in PLANS.items()]


class RefreshIn(BaseModel):
    refresh_token: str


@router.post(
    "/auth/refresh",
    tags=["Account"],
    summary="Exchange a refresh token for a new access token",
    responses={400: {"model": ErrorOut}, 401: {"model": ErrorOut}},
)
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
