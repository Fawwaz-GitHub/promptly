"""Usage store backed by Supabase Postgres (via the PostgREST HTTP API, using the service-role key)."""
from datetime import datetime, timezone

import httpx

from .config import Settings
from .usage import start_of_utc_day


class SupabaseStore:
    def __init__(self, settings: Settings, client: httpx.AsyncClient):
        self.base = f"{settings.supabase_url.rstrip('/')}/rest/v1"
        key = settings.supabase_service_role_key
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        self.client = client

    async def _rpc(self, fn: str, args: dict):
        r = await self.client.post(f"{self.base}/rpc/{fn}", headers=self.headers, json=args)
        r.raise_for_status()
        return r.json() if r.content else None

    async def consume_anon(self, device_id: str, ip: str, limit: int) -> int | None:
        n = await self._rpc("consume_anon", {"p_device": device_id, "p_ip": ip, "p_limit": limit})
        return None if n == -1 else int(n)

    async def refund_anon(self, device_id: str) -> None:
        await self._rpc("refund_anon", {"p_device": device_id})

    async def get_anon_used(self, device_id: str) -> int:
        r = await self.client.get(
            f"{self.base}/anon_usage", headers=self.headers, params={"device_id": f"eq.{device_id}", "select": "count"}
        )
        r.raise_for_status()
        rows = r.json()
        return rows[0]["count"] if rows else 0

    async def count_user_today(self, user_id: str) -> int:
        since = datetime.fromtimestamp(start_of_utc_day(), timezone.utc).isoformat()
        r = await self.client.get(
            f"{self.base}/usage_events",
            headers={**self.headers, "Prefer": "count=exact", "Range": "0-0"},
            params={"user_id": f"eq.{user_id}", "created_at": f"gte.{since}", "select": "id"},
        )
        r.raise_for_status()
        total = r.headers.get("content-range", "*/0").split("/")[-1]
        return int(total) if total.isdigit() else 0

    async def log_event(self, *, user_id, device_id, chars_in, model, mode) -> None:
        r = await self.client.post(
            f"{self.base}/usage_events",
            headers={**self.headers, "Prefer": "return=minimal"},
            json={"user_id": user_id, "device_id": device_id, "chars_in": chars_in, "model": model, "mode": mode},
        )
        r.raise_for_status()

    async def get_plan(self, user_id: str) -> str | None:
        r = await self.client.get(
            f"{self.base}/profiles", headers=self.headers, params={"id": f"eq.{user_id}", "select": "plan"}
        )
        r.raise_for_status()
        rows = r.json()
        return rows[0]["plan"] if rows else None
