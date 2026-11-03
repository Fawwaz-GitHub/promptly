"use client";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const authEnabled = Boolean(url && anon && !url.includes("your-project"));

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  return (client ??= createClient(url!, anon!, { auth: { persistSession: true, detectSessionInUrl: true } }));
}

export function deviceId(): string {
  const KEY = "promptly_device_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "nostorage" + Math.random().toString(36).slice(2, 12);
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authEnabled);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export interface Usage {
  plan: "anonymous" | "free" | "pro";
  limit: number | null;
  used: number;
  remaining: number | null;
  period: "lifetime" | "daily" | "unlimited";
}

export interface RefineResponse {
  improved: string;
  changes: string[];
  model: string;
  original: string;
  usage: Usage;
}

export class ApiError extends Error {
  code: string;
  usage?: Usage;
  constructor(code: string, message: string, usage?: Usage) {
    super(message);
    this.code = code;
    this.usage = usage;
  }
}

function headers(session: Session | null): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json", "X-Device-Id": deviceId() };
  if (session) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

export async function refine(text: string, mode: string, session: Session | null): Promise<RefineResponse> {
  const res = await fetch("/api/refine", { method: "POST", headers: headers(session), body: JSON.stringify({ text, mode }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "error", data.message || "Something went wrong", data.usage);
  return data;
}

export async function fetchMe(session: Session | null): Promise<{ usage: Usage; signedIn: boolean; email: string | null }> {
  const res = await fetch("/api/me", { headers: headers(session) });
  return res.json();
}

/** Hand the session to the Promptly Chrome extension (its content script listens on this site). */
export function sendSessionToExtension(session: Session) {
  window.postMessage(
    {
      source: "promptly-web",
      type: "PROMPTLY_AUTH",
      payload: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        email: session.user.email,
      },
    },
    window.location.origin,
  );
}
