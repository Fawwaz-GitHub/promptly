import logging
import os
import re
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

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
    if os.environ.get("VERCEL") and not settings.supabase_enabled:
        logging.getLogger("promptly").warning(
            "Running on Vercel without Supabase: usage limits are kept in memory and reset "
            "between serverless invocations. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    app = FastAPI(
        title="Promptly API",
        version="0.3.0",
        description=(
            "Backend for **Promptly**, which improves AI prompts with free OpenRouter models.\n\n"
            "**Limits:** guests get **2** refinements in total, identified by the `X-Device-Id` header. "
            "Signed-in users get **5 per day**, sent as `Authorization: Bearer <Supabase access token>`.\n\n"
            "To try it here, open `POST /api/refine`, click **Try it out**, and fill in `X-Device-Id` with any 8+ character id."
        ),
        openapi_tags=[
            {"name": "Refine", "description": "Prompt improvement"},
            {"name": "Account", "description": "Usage, plans and sessions"},
            {"name": "System", "description": "Health checks"},
        ],
        swagger_ui_parameters={"defaultModelsExpandDepth": 0, "tryItOutEnabled": True, "displayRequestDuration": True},
        lifespan=lifespan,
    )

    ext = re.escape(settings.extension_id) if settings.extension_id else "[a-p]{32}"
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_urls,
        allow_origin_regex=rf"^chrome-extension://{ext}$",
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Device-Id"],
    )

    @app.exception_handler(AuthError)
    async def _auth_error(_: Request, e: AuthError):
        return JSONResponse({"error": e.error, "message": e.message}, status_code=e.status)

    @app.get("/", include_in_schema=False)
    async def root():
        return RedirectResponse("/docs")

    @app.get("/health", tags=["System"], summary="Health check")
    async def health():
        return {"ok": True, "auth": settings.supabase_enabled, "model": settings.openrouter_model}

    app.include_router(router)
    return app


app = create_app()
