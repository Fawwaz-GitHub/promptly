import asyncio

from app.openrouter import parse_model_output
from app.plans import PLANS
from app.usage import Identity, MemoryStore, check_and_consume, get_status, refund

anon = Identity(kind="anon", device_id="device12345", ip="1.1.1.1")
user = Identity(kind="user", user_id="u1", email="a@b.c", plan="free")


def run(c):
    return asyncio.run(c)


def test_anonymous_gets_exactly_two():
    s = MemoryStore()
    for i in range(1, 3):
        ok, st = run(check_and_consume(anon, s))
        assert ok and st.remaining == 2 - i
    ok, st = run(check_and_consume(anon, s))
    assert not ok and st.remaining == 0


def test_refund_after_failure():
    s = MemoryStore()
    run(check_and_consume(anon, s))
    run(refund(anon, s))
    assert run(get_status(anon, s)).used == 0


def test_signed_in_free_gets_five_per_day():
    s = MemoryStore()
    for i in range(5):
        ok, st = run(check_and_consume(user, s))
        assert ok and st.remaining == 4 - i and st.period == "daily"
        run(s.log_event(user_id="u1", device_id=None, chars_in=1, model="m", mode="improve"))
    ok, st = run(check_and_consume(user, s))
    assert not ok and st.remaining == 0


def test_daily_limit_for_future_paid_tiers():
    s = MemoryStore()
    prev = PLANS["free"].daily
    PLANS["free"].daily = 2
    try:
        for _ in range(2):
            assert run(check_and_consume(user, s))[0]
            run(s.log_event(user_id="u1", device_id=None, chars_in=1, model="m", mode="improve"))
        assert not run(check_and_consume(user, s))[0]
    finally:
        PLANS["free"].daily = prev


def test_parse_model_output():
    r = parse_model_output('```json\n{"improved":"Hello there.","changes":["Fixed grammar"]}\n```')
    assert r == {"improved": "Hello there.", "changes": ["Fixed grammar"]}
    assert parse_model_output("Just plain text")["improved"] == "Just plain text"


def test_models_capped_at_three_for_openrouter():
    from app.config import Settings

    s = Settings(_env_file=None, openrouter_model="a:free", openrouter_fallback_models="b:free, a:free, c:free, d:free")
    assert s.models == ["a:free", "b:free", "c:free"]
