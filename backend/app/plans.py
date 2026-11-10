"""Single source of truth for usage limits.

To launch a paid tier later:
  1. Set a limit for "free" (e.g. daily=20) and keep "pro" unlimited (or vice versa).
  2. Set profiles.plan = 'pro' from a Stripe webhook.
Nothing else in the code needs to change.
"""
from dataclasses import dataclass
from typing import Literal

PlanId = Literal["anonymous", "free", "pro"]


@dataclass
class PlanLimits:
    lifetime: int | None  # max refinements ever (guests); None = no cap
    daily: int | None  # max refinements per UTC day; None = no cap
    max_chars: int
    label: str


PLANS: dict[str, PlanLimits] = {
    "anonymous": PlanLimits(lifetime=5, daily=None, max_chars=4000, label="Guest"),
    "free": PlanLimits(lifetime=None, daily=None, max_chars=4000, label="Free"),
    "pro": PlanLimits(lifetime=None, daily=None, max_chars=12000, label="Pro"),
}
