from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app


def test_vercel_entrypoint_exports_app():
    import index

    assert index.app.title == "Promptly API"


def test_frontend_url_accepts_comma_separated_origins(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://promptly.vercel.app, https://promptly-git-dev.vercel.app/")
    get_settings.cache_clear()
    try:
        assert Settings(_env_file=None).frontend_urls == [
            "https://promptly.vercel.app",
            "https://promptly-git-dev.vercel.app",
        ]
        with TestClient(create_app()) as c:
            for origin in ("https://promptly.vercel.app", "https://promptly-git-dev.vercel.app"):
                r = c.options("/api/refine", headers={"Origin": origin, "Access-Control-Request-Method": "POST"})
                assert r.headers.get("access-control-allow-origin") == origin
    finally:
        get_settings.cache_clear()
