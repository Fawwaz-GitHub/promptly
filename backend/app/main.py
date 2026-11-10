import re
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .deps import AuthError
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=30)
    yield
    await app.state.http.aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Promptly API", version="0.2.0", lifespan=lifespan)

    ext = re.escape(settings.extension_id) if settings.extension_id else "[a-p]{32}"
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip().rstrip("/") for o in settings.frontend_url.split(",") if o.strip()],
        allow_origin_regex=rf"^chrome-extension://{ext}$",
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Device-Id"],
    )

    @app.exception_handler(AuthError)
    async def _auth_error(_: Request, e: AuthError):
        return JSONResponse({"error": e.error, "message": e.message}, status_code=e.status)

    @app.get("/health")
    async def health():
        return {"ok": True, "auth": settings.supabase_enabled, "model": settings.openrouter_model}

    app.include_router(router)
    return app


app = create_app()
