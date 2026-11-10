import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import ratelimit
from app.config import Settings, get_settings
from app.deps import get_http, get_store
from app.main import app
from app.usage import MemoryStore


def fake_openrouter(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    assert request.headers["authorization"] == "Bearer test-key"
    assert body["models"][0] == "test/model:free"
    reply = json.dumps({"improved": "Write a polite email to my manager.", "changes": ["Fixed grammar"]})
    return httpx.Response(200, json={"model": "test/model:free", "choices": [{"message": {"content": reply}}]})


@pytest.fixture
def client():
    store = MemoryStore()
    http = httpx.AsyncClient(transport=httpx.MockTransport(fake_openrouter))
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None, openrouter_api_key="test-key", openrouter_model="test/model:free"
    )
    app.dependency_overrides[get_http] = lambda: http
    app.dependency_overrides[get_store] = lambda: store
    ratelimit.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


H = {"X-Device-Id": "testdevice01"}


def test_refine_then_limit(client):
    for i in range(2):
        r = client.post("/api/refine", json={"text": "write me email for boss i want leave"}, headers=H)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["improved"].startswith("Write a polite")
        assert d["changes"] == ["Fixed grammar"]
        assert d["usage"]["remaining"] == 1 - i
    r = client.post("/api/refine", json={"text": "another prompt"}, headers=H)
    assert r.status_code == 402
    assert r.json()["error"] == "limit_reached"
    me = client.get("/api/me", headers=H).json()
    assert me["usage"]["remaining"] == 0 and me["signedIn"] is False


def test_validation(client):
    assert client.post("/api/refine", json={"text": "hi"}, headers=H).status_code == 400
    assert client.post("/api/refine", json={"text": "hello world"}).json()["error"] == "missing_device_id"
    assert client.post("/api/refine", json={"text": "x" * 5000}, headers=H).status_code == 413


def test_cors_for_extension_and_frontend(client):
    for origin in ("chrome-extension://abcdefghijklmnopabcdefghijklmnop", "http://localhost:3000"):
        r = client.options(
            "/api/refine",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-device-id,content-type"},
        )
        assert r.headers.get("access-control-allow-origin") == origin
    r = client.options("/api/refine", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


def test_swagger_documents_routes_and_headers(client):
    spec = client.get("/openapi.json").json()
    refine = spec["paths"]["/api/refine"]["post"]
    assert refine["requestBody"]["content"]["application/json"]["schema"]["properties"]["text"]
    assert any(p["name"] == "X-Device-Id" for p in refine["parameters"])
    assert "HTTPBearer" in spec["components"]["securitySchemes"]
    assert client.get("/docs").status_code == 200
    assert {p["id"]: p for p in client.get("/api/plans").json()}["free"]["daily"] == 5
