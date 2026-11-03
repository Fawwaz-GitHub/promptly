import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MemoryStore, type Identity, type UsageStore } from "./usage.ts";
import { isPlanId } from "./plans.ts";

const g = globalThis as unknown as { __promptlyMem?: MemoryStore; __promptlyAdmin?: SupabaseClient };

export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project"),
  );
}

export function admin(): SupabaseClient {
  return (g.__promptlyAdmin ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ));
}

class SupabaseStore implements UsageStore {
  private db: SupabaseClient;
  constructor(db: SupabaseClient) {
    this.db = db;
  }
  async consumeAnon(deviceId: string, ip: string, limit: number) {
    const { data, error } = await this.db.rpc("consume_anon", { p_device: deviceId, p_ip: ip, p_limit: limit });
    if (error) throw error;
    return data === -1 ? null : (data as number);
  }
  async refundAnon(deviceId: string) {
    await this.db.rpc("refund_anon", { p_device: deviceId });
  }
  async getAnonUsed(deviceId: string) {
    const { data } = await this.db.from("anon_usage").select("count").eq("device_id", deviceId).maybeSingle();
    return data?.count ?? 0;
  }
  async countUserToday(userId: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { count } = await this.db
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString());
    return count ?? 0;
  }
  async logEvent(e: { userId?: string; deviceId?: string; charsIn: number; model: string; mode: string }) {
    await this.db.from("usage_events").insert({
      user_id: e.userId ?? null,
      device_id: e.deviceId ?? null,
      chars_in: e.charsIn,
      model: e.model,
      mode: e.mode,
    });
  }
}

export function getStore(): UsageStore {
  if (supabaseConfigured()) return new SupabaseStore(admin());
  return (g.__promptlyMem ??= new MemoryStore());
}

const DEVICE_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown"
  );
}

/** Resolve the caller from `Authorization: Bearer <supabase access token>` or `X-Device-Id`. */
export async function identify(req: Request): Promise<Identity | { error: string; status: number }> {
  const ip = clientIp(req);
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (token && supabaseConfigured()) {
    const db = admin();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return { error: "session_expired", status: 401 };
    const { data: profile } = await db.from("profiles").select("plan").eq("id", data.user.id).maybeSingle();
    return {
      kind: "user",
      userId: data.user.id,
      email: data.user.email ?? null,
      plan: isPlanId(profile?.plan) && profile.plan !== "anonymous" ? profile.plan : "free",
    };
  }

  const deviceId = req.headers.get("x-device-id") || "";
  if (!DEVICE_RE.test(deviceId)) return { error: "missing_device_id", status: 400 };
  return { kind: "anon", deviceId, ip };
}
