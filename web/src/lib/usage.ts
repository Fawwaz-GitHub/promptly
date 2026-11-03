import { PLANS, type PlanId } from "./plans.ts";

export type Identity =
  | { kind: "anon"; deviceId: string; ip: string }
  | { kind: "user"; userId: string; email: string | null; plan: PlanId };

export interface UsageStore {
  /** Atomically increment the device counter if it is below `limit`. Returns new count, or null if the limit is reached. */
  consumeAnon(deviceId: string, ip: string, limit: number): Promise<number | null>;
  refundAnon(deviceId: string): Promise<void>;
  getAnonUsed(deviceId: string): Promise<number>;
  /** Refinements by this user since 00:00 UTC today. */
  countUserToday(userId: string): Promise<number>;
  logEvent(e: { userId?: string; deviceId?: string; charsIn: number; model: string; mode: string }): Promise<void>;
}

export interface UsageStatus {
  plan: PlanId;
  /** null = unlimited */
  limit: number | null;
  used: number;
  /** null = unlimited */
  remaining: number | null;
  period: "lifetime" | "daily" | "unlimited";
}

export type ConsumeResult = { allowed: true; status: UsageStatus } | { allowed: false; status: UsageStatus };

function status(plan: PlanId, limit: number | null, used: number, period: UsageStatus["period"]): UsageStatus {
  return { plan, limit, used, remaining: limit === null ? null : Math.max(0, limit - used), period };
}

export async function getStatus(id: Identity, store: UsageStore): Promise<UsageStatus> {
  if (id.kind === "anon") {
    const limit = PLANS.anonymous.lifetime ?? 0;
    return status("anonymous", limit, await store.getAnonUsed(id.deviceId), "lifetime");
  }
  const daily = PLANS[id.plan].daily;
  if (daily === null) return status(id.plan, null, 0, "unlimited");
  return status(id.plan, daily, await store.countUserToday(id.userId), "daily");
}

/** Reserve one refinement for this caller. Call `refund` if the AI request then fails. */
export async function checkAndConsume(id: Identity, store: UsageStore): Promise<ConsumeResult> {
  if (id.kind === "anon") {
    const limit = PLANS.anonymous.lifetime ?? 0;
    const used = await store.consumeAnon(id.deviceId, id.ip, limit);
    if (used === null) return { allowed: false, status: status("anonymous", limit, limit, "lifetime") };
    return { allowed: true, status: status("anonymous", limit, used, "lifetime") };
  }
  const daily = PLANS[id.plan].daily;
  if (daily === null) return { allowed: true, status: status(id.plan, null, 0, "unlimited") };
  const used = await store.countUserToday(id.userId);
  if (used >= daily) return { allowed: false, status: status(id.plan, daily, used, "daily") };
  // Logged usage_events row (written after success) is what counts for users.
  return { allowed: true, status: status(id.plan, daily, used + 1, "daily") };
}

export async function refund(id: Identity, store: UsageStore) {
  if (id.kind === "anon") await store.refundAnon(id.deviceId);
}

/** In-memory store for local development without Supabase (resets on server restart). */
export class MemoryStore implements UsageStore {
  anon = new Map<string, number>();
  events: { userId?: string; deviceId?: string; at: number }[] = [];
  async consumeAnon(deviceId: string, _ip: string, limit: number) {
    const n = this.anon.get(deviceId) ?? 0;
    if (n >= limit) return null;
    this.anon.set(deviceId, n + 1);
    return n + 1;
  }
  async refundAnon(deviceId: string) {
    const n = this.anon.get(deviceId) ?? 0;
    if (n > 0) this.anon.set(deviceId, n - 1);
  }
  async getAnonUsed(deviceId: string) {
    return this.anon.get(deviceId) ?? 0;
  }
  async countUserToday(userId: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return this.events.filter((e) => e.userId === userId && e.at >= start.getTime()).length;
  }
  async logEvent(e: { userId?: string; deviceId?: string }) {
    this.events.push({ userId: e.userId, deviceId: e.deviceId, at: Date.now() });
  }
}
