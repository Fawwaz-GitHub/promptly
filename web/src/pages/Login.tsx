import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Mail, Sparkles } from "@/components/Icons";
import { Blobs } from "@/components/fx/Blobs";
import { btn, card } from "@/components/ui";
import { FREE_DAILY } from "@/lib/limits";
import { authEnabled, sendSessionToExtension, supabase, useSession } from "@/lib/client";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const forExtension = params.get("ext") === "1";
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [extDone, setExtDone] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (forExtension) {
      sendSessionToExtension(session);
      const onMsg = (e: MessageEvent) => {
        if (e.source === window && e.data?.source === "promptly-ext" && e.data.type === "PROMPTLY_AUTH_OK") setExtDone(true);
      };
      window.addEventListener("message", onMsg);
      return () => window.removeEventListener("message", onMsg);
    }
    navigate("/app", { replace: true });
  }, [session, forExtension, navigate]);

  if (!authEnabled) {
    return (
      <Card title="Sign-in is not configured">
        <p className="text-ink-700">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>web/.env</code> to enable email sign-in. See the README.
        </p>
      </Card>
    );
  }

  if (session && forExtension) {
    return (
      <Card title={extDone ? "Extension connected" : "Connecting extension…"}>
        {extDone && <SuccessBadge />}
        <p className="text-ink-700">
          {extDone
            ? `Signed in as ${session.user.email}. You can close this tab. The extension now gets ${FREE_DAILY} refinements a day.`
            : "Make sure the Promptly extension is installed and its Server URL matches this site, then refresh."}
        </p>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const redirect = `${window.location.origin}/login${forExtension ? "?ext=1" : ""}`;
    const { error } = await supabase()!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) {
      setState("error");
      setMsg(error.message);
    } else setState("sent");
  }

  return (
    <Card title={forExtension ? "Sign in to connect the extension" : "Sign in to Promptly"}>
      <AnimatePresence mode="wait">
        {state === "sent" ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.2 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-bubble-100 text-bubble-700"
            >
              <Mail className="h-8 w-8" />
            </motion.div>
            <p className="mt-5 text-ink-700">
              Check <b className="text-ink-900">{email}</b> for a magic link. Open it in this browser to finish signing in.
            </p>
            <button onClick={() => setState("idle")} className="mt-4 cursor-pointer text-sm font-semibold text-bubble-700 underline underline-offset-4">
              Use a different email
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <ul className="space-y-2 text-sm text-ink-800">
              {[`${FREE_DAILY} prompt refinements every day`, "Works in the web editor and the extension", "No password, just a magic link"].map((f, i) => (
                <motion.li key={f} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bubble-100 text-bubble-700"><Check className="h-3.5 w-3.5" /></span>
                  {f}
                </motion.li>
              ))}
            </ul>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-ink-900">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-h-12 w-full rounded-2xl border-2 border-ink-100 px-4 text-ink-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-500 focus:border-bubble-500 focus:shadow-[0_0_0_4px_var(--color-bubble-100)] focus-visible:outline-none"
              />
            </div>
            <button disabled={state === "sending"} className={`${btn.primary} w-full`}>
              <motion.span animate={state === "sending" ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Sparkles />
              </motion.span>
              {state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            <AnimatePresence>
              {state === "error" && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="alert" className="text-sm font-semibold text-bubble-700">
                  {msg}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="relative isolate overflow-hidden px-4 py-20">
      <Blobs />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`${card} mx-auto max-w-md p-8`}
      >
        <h1 className="mb-5 text-2xl font-extrabold tracking-tight">{title}</h1>
        {children}
      </motion.div>
    </main>
  );
}

function SuccessBadge() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 14 }}
      className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bubble-500 text-ink-900"
    >
      <Check className="h-7 w-7" />
    </motion.div>
  );
}
