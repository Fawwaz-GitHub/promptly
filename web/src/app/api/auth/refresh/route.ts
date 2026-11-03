import { supabaseConfigured } from "@/lib/supabase-server";
import { json, preflight } from "@/lib/http";

export const runtime = "nodejs";
export const OPTIONS = preflight;

/** Lets the Chrome extension swap a refresh token for a fresh access token without bundling Supabase keys. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return json(req, { error: "auth_disabled" }, 400);
  const { refresh_token } = await req.json().catch(() => ({}));
  if (typeof refresh_token !== "string") return json(req, { error: "bad_request" }, 400);
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) return json(req, { error: "session_expired" }, 401);
  const s = await res.json();
  return json(req, {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at,
    email: s.user?.email ?? null,
  });
}
