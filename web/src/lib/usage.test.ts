import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, checkAndConsume, refund, getStatus, type Identity } from "./usage.ts";
import { PLANS } from "./plans.ts";
import { parseModelOutput } from "./openrouter.ts";

const anon: Identity = { kind: "anon", deviceId: "device12345", ip: "1.1.1.1" };
const user: Identity = { kind: "user", userId: "u1", email: "a@b.c", plan: "free" };

test("anonymous devices get exactly 5 refinements", async () => {
  const s = new MemoryStore();
  for (let i = 1; i <= 5; i++) {
    const r = await checkAndConsume(anon, s);
    assert.equal(r.allowed, true);
    assert.equal(r.status.remaining, 5 - i);
  }
  const blocked = await checkAndConsume(anon, s);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.status.remaining, 0);
});

test("refund gives back a refinement after an upstream failure", async () => {
  const s = new MemoryStore();
  await checkAndConsume(anon, s);
  await refund(anon, s);
  assert.equal((await getStatus(anon, s)).used, 0);
});

test("signed-in free users are unlimited", async () => {
  const s = new MemoryStore();
  for (let i = 0; i < 50; i++) {
    assert.equal((await checkAndConsume(user, s)).allowed, true);
    await s.logEvent({ userId: "u1", charsIn: 10, model: "m", mode: "improve" });
  }
  assert.equal((await getStatus(user, s)).remaining, null);
});

test("a daily plan limit is enforced when configured (future paid tiers)", async () => {
  const s = new MemoryStore();
  const prev = PLANS.free.daily;
  PLANS.free.daily = 2;
  try {
    for (let i = 0; i < 2; i++) {
      assert.equal((await checkAndConsume(user, s)).allowed, true);
      await s.logEvent({ userId: "u1", charsIn: 1, model: "m", mode: "improve" });
    }
    assert.equal((await checkAndConsume(user, s)).allowed, false);
  } finally {
    PLANS.free.daily = prev;
  }
});

test("parses model JSON even with code fences", () => {
  const r = parseModelOutput('```json\n{"improved":"Hello there.","changes":["Fixed grammar"]}\n```');
  assert.deepEqual(r, { improved: "Hello there.", changes: ["Fixed grammar"] });
  assert.equal(parseModelOutput("Just plain text").improved, "Just plain text");
});
