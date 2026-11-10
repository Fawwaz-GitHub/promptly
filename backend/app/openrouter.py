import json
import re

import httpx

from .config import Settings
from .prompts import build_messages


class UpstreamError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.message = message
        self.status = status


def parse_model_output(raw: str) -> dict:
    """Pull the JSON object out of a model reply (models sometimes wrap it in ``` fences or prose)."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.I)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            obj = json.loads(cleaned[start : end + 1])
            improved = obj.get("improved") if isinstance(obj, dict) else None
            if isinstance(improved, str) and improved.strip():
                changes = [c for c in obj.get("changes", []) if isinstance(c, str)][:5] if isinstance(obj.get("changes"), list) else []
                return {"improved": improved.strip(), "changes": changes}
        except json.JSONDecodeError:
            pass
    if not cleaned:
        raise UpstreamError("Empty response from model")
    return {"improved": cleaned, "changes": []}


async def refine_prompt(text: str, mode: str, settings: Settings, client: httpx.AsyncClient) -> dict:
    if not settings.openrouter_api_key:
        raise UpstreamError("OPENROUTER_API_KEY is not set on the server", 500)
    models = settings.models
    try:
        res = await client.post(
            f"{settings.openrouter_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": (settings.frontend_urls or ["http://localhost:3000"])[0],
                "X-Title": "Promptly",
            },
            json={
                "model": models[0],
                "models": models,  # OpenRouter tries these in order if one is unavailable/rate-limited
                "messages": build_messages(text, mode),
                "temperature": 0.1 if mode == "grammar" else 0.4,
                "max_tokens": 1500,
            },
            timeout=45,
        )
    except httpx.HTTPError as e:
        raise UpstreamError(f"Could not reach the AI provider: {e.__class__.__name__}") from e

    if res.status_code >= 400:
        if res.status_code == 429:
            raise UpstreamError("The free AI model is busy right now. Please try again in a moment.", 503)
        raise UpstreamError(f"AI provider error ({res.status_code}) {res.text[:200]}")

    data = res.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        content = None
    if not content:
        raise UpstreamError("AI provider returned no content")
    return {**parse_model_output(content), "model": data.get("model") or models[0]}
