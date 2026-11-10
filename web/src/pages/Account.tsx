import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Check } from "@/components/Icons";
import { RevealItem, Stagger } from "@/components/fx/Reveal";
import { btn, card } from "@/components/ui";
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
        <p className="text-lg font-semibold text-ink-800">You&apos;re not signed in.</p>
        <Link to="/login" className={`${btn.primary} mt-5`}>Sign in</Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-xl px-4 py-14">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">Account</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Hi there.</h1>
      <Stagger className={`${card} mt-6 divide-y divide-ink-100`}>
        <Row label="Email">{session.user.email}</Row>
        <Row label="Plan">
          <span className="rounded-full bg-ink-900 px-3 py-1 text-sm font-bold capitalize text-white">{usage?.plan ?? "free"}</span>
        </Row>
        <Row label="Refinements">
          {usage?.remaining === null ? "Unlimited" : usage ? <UsageDots used={usage.used} limit={usage.limit ?? 0} /> : "…"}
        </Row>
        <Row label="Chrome extension">
          <button
            onClick={() => {
              sendSessionToExtension(session);
              setSent(true);
            }}
            className={`${btn.ghost} min-h-10 px-4 py-2 text-sm`}
          >
            {sent ? <><Check className="h-4 w-4 text-bubble-700" /> Sent to extension</> : "Connect extension"}
          </button>
        </Row>
      </Stagger>
      <div className="mt-6 flex justify-between">
        <button disabled className={`${btn.ghost} text-sm`}>
          Upgrade to Pro, coming soon
        </button>
        <button
          onClick={() => supabase()!.auth.signOut().then(() => (window.location.href = "/"))}
          className={`${btn.small} min-h-11 px-4 text-ink-800 hover:bg-bubble-50 hover:text-bubble-700`}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RevealItem className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
      <span className="text-sm font-semibold text-ink-600">{label}</span>
      <span className="font-semibold text-ink-900">{children}</span>
    </RevealItem>
  );
}

function UsageDots({ used, limit }: { used: number; limit: number }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex gap-1.5" aria-hidden>
        {Array.from({ length: limit }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 500, damping: 18 }}
            className={`h-3 w-3 rounded-full ${i < limit - used ? "bg-bubble-500" : "bg-ink-100"}`}
          />
        ))}
      </span>
      {Math.max(0, limit - used)} left today
    </span>
  );
}
