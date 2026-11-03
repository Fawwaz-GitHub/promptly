"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMe, sendSessionToExtension, supabase, useSession, type Usage } from "@/lib/client";

export default function Account() {
  const { session, loading } = useSession();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) fetchMe(session).then((m) => setUsage(m.usage));
  }, [session]);

  if (loading) return null;
  if (!session)
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-slate-600">You&apos;re not signed in.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 font-medium text-white">Sign in</Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-xl px-4 py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Row label="Email">{session.user.email}</Row>
        <Row label="Plan">
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-sm font-medium capitalize text-brand-700">{usage?.plan ?? "free"}</span>
        </Row>
        <Row label="Refinements">{usage?.remaining === null ? "Unlimited" : usage ? `${usage.remaining} left today` : "…"}</Row>
        <Row label="Chrome extension">
          <button
            onClick={() => {
              sendSessionToExtension(session);
              setSent(true);
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {sent ? "Sent to extension ✓" : "Connect extension"}
          </button>
        </Row>
      </div>
      <div className="mt-6 flex justify-between">
        <button disabled className="cursor-not-allowed rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">
          Upgrade to Pro — coming soon
        </button>
        <button
          onClick={() => supabase()!.auth.signOut().then(() => (window.location.href = "/"))}
          className="rounded-lg px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span>{children}</span>
    </div>
  );
}
