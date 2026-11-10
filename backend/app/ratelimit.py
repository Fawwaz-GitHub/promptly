"""Tiny fixed-window rate limiter per key (IP). Per process only; use Redis for multi-instance deployments."""
import time

_buckets: dict[str, list[float]] = {}  # key -> [count, reset_at]


def rate_limit(key: str, max_requests: int = 30, window_s: float = 60) -> bool:
    now = time.time()
    b = _buckets.get(key)
    if b is None or b[1] < now:
        _buckets[key] = [1, now + window_s]
        if len(_buckets) > 10_000:
            for k in [k for k, v in _buckets.items() if v[1] < now]:
                del _buckets[k]
        return True
    b[0] += 1
    return b[0] <= max_requests


def reset() -> None:
    _buckets.clear()
