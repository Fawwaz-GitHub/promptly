import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
        <p className="text-sm text-slate-600">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>web/.env</code> to enable email sign-in. See the README.
        </p>
      </Card>
    );
  }

  if (session && forExtension) {
    return (
      <Card title={extDone ? "Extension connected 🎉" : "Connecting extension…"}>
        <p className="text-sm text-slate-600">
          {extDone
            ? `Signed in as ${session.user.email}. You can close this tab — the extension now has unlimited refinements.`
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
      {state === "sent" ? (
        <p className="text-sm text-slate-600">
          Check <b>{email}</b> for a magic link. Open it in this browser to finish signing in.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-slate-600">Free account · unlimited prompt refinements · no password needed.</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            disabled={state === "sending"}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && <p className="text-sm text-rose-600">{msg}</p>}
        </form>
      )}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
