import time
from datetime import datetime, timezone
from typing import Protocol

from pydantic import BaseModel

from .plans import PLANS


class Identity(BaseModel):
    kind: str  # "anon" | "user"
    device_id: str | None = None
    ip: str = "unknown"
    user_id: str | None = None
    email: str | None = None
    plan: str = "anonymous"


class UsageStatus(BaseModel):
    plan: str
    limit: int | None  # None = unlimited
    used: int
    remaining: int | None  # None = unlimited
    period: str  # "lifetime" | "daily" | "unlimited"


class UsageStore(Protocol):
    async def consume_anon(self, device_id: str, ip: str, limit: int) -> int | None: ...
    async def refund_anon(self, device_id: str) -> None: ...
    async def get_anon_used(self, device_id: str) -> int: ...
    async def count_user_today(self, user_id: str) -> int: ...
    async def log_event(self, *, user_id: str | None, device_id: str | None, chars_in: int, model: str, mode: str) -> None: ...


def _status(plan: str, limit: int | None, used: int, period: str) -> UsageStatus:
    return UsageStatus(plan=plan, limit=limit, used=used, remaining=None if limit is None else max(0, limit - used), period=period)


def start_of_utc_day() -> float:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


async def get_status(ident: Identity, store: UsageStore) -> UsageStatus:
    if ident.kind == "anon":
        limit = PLANS["anonymous"].lifetime or 0
        return _status("anonymous", limit, await store.get_anon_used(ident.device_id), "lifetime")
    daily = PLANS[ident.plan].daily
    if daily is None:
        return _status(ident.plan, None, 0, "unlimited")
    return _status(ident.plan, daily, await store.count_user_today(ident.user_id), "daily")


async def check_and_consume(ident: Identity, store: UsageStore) -> tuple[bool, UsageStatus]:
    """Reserve one refinement. Call `refund` if the AI request then fails."""
    if ident.kind == "anon":
        limit = PLANS["anonymous"].lifetime or 0
        used = await store.consume_anon(ident.device_id, ident.ip, limit)
        if used is None:
            return False, _status("anonymous", limit, limit, "lifetime")
        return True, _status("anonymous", limit, used, "lifetime")
    daily = PLANS[ident.plan].daily
    if daily is None:
        return True, _status(ident.plan, None, 0, "unlimited")
    used = await store.count_user_today(ident.user_id)
    if used >= daily:
        return False, _status(ident.plan, daily, used, "daily")
    # The usage_events row written after success is what counts for users.
    return True, _status(ident.plan, daily, used + 1, "daily")


async def refund(ident: Identity, store: UsageStore) -> None:
    if ident.kind == "anon":
        await store.refund_anon(ident.device_id)


class MemoryStore:
    """In-memory store for local development without Supabase (resets on restart)."""

    def __init__(self) -> None:
        self.anon: dict[str, int] = {}
        self.events: list[tuple[str | None, str | None, float]] = []

    async def consume_anon(self, device_id: str, ip: str, limit: int) -> int | None:
        n = self.anon.get(device_id, 0)
        if n >= limit:
            return None
        self.anon[device_id] = n + 1
        return n + 1

    async def refund_anon(self, device_id: str) -> None:
        if self.anon.get(device_id, 0) > 0:
            self.anon[device_id] -= 1

    async def get_anon_used(self, device_id: str) -> int:
        return self.anon.get(device_id, 0)

    async def count_user_today(self, user_id: str) -> int:
        start = start_of_utc_day()
        return sum(1 for uid, _, at in self.events if uid == user_id and at >= start)

    async def log_event(self, *, user_id, device_id, chars_in, model, mode) -> None:
        self.events.append((user_id, device_id, time.time()))
