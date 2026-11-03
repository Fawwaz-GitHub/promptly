"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authEnabled, fetchMe, refine, useSession, type RefineResponse, type Usage } from "@/lib/client";
import { MODES, type Mode } from "@/lib/prompts";
import { Toggle } from "@/components/Toggle";
import { Diff } from "@/components/Diff";

const SAMPLE = "write me a email to my boss i want leave next week because my sister weding";

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function savePref(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export default function EditorPage() {
  const { session, loading: sessionLoading } = useSession();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("improve");
  const [enabled, setEnabled] = useState(true);
  const [auto, setAuto] = useState(false);
  const [result, setResult] = useState<RefineResponse | null>(null);
  const [view, setView] = useState<"improved" | "diff">("improved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [copied, setCopied] = useState(false);
  const lastSent = useRef("");

  useEffect(() => {
    setEnabled(loadPref("promptly_enabled", true));
    setAuto(loadPref("promptly_auto", false));
    setMode(loadPref("promptly_mode", "improve"));
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    fetchMe(session).then((m) => setUsage(m.usage)).catch(() => {});
  }, [session, sessionLoading]);

  const run = useCallback(
    async (input: string) => {
      if (!enabled || input.trim().length < 3) return;
      lastSent.current = input;
      setBusy(true);
      setError(null);
      try {
        const r = await refine(input, mode, session);
        setResult(r);
        setUsage(r.usage);
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("error", "Network error — is the server running?");
        setError(err);
        if (err.usage) setUsage(err.usage);
      } finally {
        setBusy(false);
      }
    },
    [enabled, mode, session],
  );

  // Auto-suggest: refine after the user pauses typing.
  useEffect(() => {
    if (!enabled || !auto || busy) return;
    if (text.trim().length < 12 || text === lastSent.current) return;
    const t = setTimeout(() => run(text), 1500);
    return () => clearTimeout(t);
  }, [text, enabled, auto, busy, run]);

  const outOfFree = usage?.remaining === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prompt editor</h1>
          <p className="text-sm text-slate-500">Write your prompt, Promptly rewrites it so AI understands you better.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className={`text-sm font-medium ${enabled ? "text-brand-700" : "text-slate-500"}`}>
            Promptly {enabled ? "on" : "off"}
          </span>
          <Toggle
            label="Enable Promptly"
            checked={enabled}
            onChange={(v) => {
              setEnabled(v);
              savePref("promptly_enabled", v);
            }}
          />
        </div>
      </div>

      <UsageBar usage={usage} signedIn={!!session} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                title={MODES[m].description}
                onClick={() => {
                  setMode(m);
                  savePref("promptly_mode", m);
                }}
                className={`rounded-lg px-3 py-1 text-sm ${mode === m ? "bg-brand-100 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {MODES[m].label}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="accent-brand-600"
                checked={auto}
                disabled={!enabled}
                onChange={(e) => {
                  setAuto(e.target.checked);
                  savePref("promptly_auto", e.target.checked);
                }}
              />
              Auto-suggest
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(text);
            }}
            placeholder={`Type or paste your prompt…\n\ne.g. "${SAMPLE}"`}
            className="min-h-72 flex-1 resize-y rounded-b-2xl px-4 py-3 outline-none placeholder:text-slate-400"
            maxLength={12000}
          />
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-400">{text.length} chars · Ctrl/⌘ + Enter</span>
            <div className="flex gap-2">
              {!text && (
                <button onClick={() => setText(SAMPLE)} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Try example
                </button>
              )}
              <button
                onClick={() => run(text)}
                disabled={!enabled || busy || text.trim().length < 3 || outOfFree}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Improving…" : "✨ Improve prompt"}
              </button>
            </div>
          </div>
        </section>

        {/* Output */}
        <section className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            {(["improved", "diff"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1 text-sm ${view === v ? "bg-slate-100 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {v === "improved" ? "Improved" : "Show changes"}
              </button>
            ))}
            {result && <span className="ml-auto truncate text-xs text-slate-400">{result.model}</span>}
          </div>

          <div className="flex-1 px-4 py-3">
            {!enabled && <Empty>Promptly is turned off. Switch it on to get suggestions.</Empty>}
            {enabled && error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <p>{error.message}</p>
                {error.code === "limit_reached" && authEnabled && !session && (
                  <Link href="/login" className="mt-3 inline-block rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white">
                    Sign in with email — free & unlimited
                  </Link>
                )}
              </div>
            )}
            {enabled && !error && busy && !result && <Skeleton />}
            {enabled && !error && !busy && !result && <Empty>Your improved prompt will appear here.</Empty>}
            {enabled && result && (
              <div className={busy ? "opacity-50" : ""}>
                {view === "improved" ? (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{result.improved}</p>
                ) : (
                  <Diff from={result.original} to={result.improved} />
                )}
                {result.changes.length > 0 && (
                  <ul className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    {result.changes.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-brand-500">✓</span> {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {enabled && result && (
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(result.improved);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => {
                  setText(result.improved);
                  lastSent.current = result.improved;
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Use this
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function UsageBar({ usage, signedIn }: { usage: Usage | null; signedIn: boolean }) {
  if (!usage || usage.remaining === null) {
    return signedIn ? (
      <p className="mb-4 text-sm text-slate-500">
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">Unlimited</span> refinements on your Free plan.
      </p>
    ) : null;
  }
  const pct = usage.limit ? (usage.used / usage.limit) * 100 : 0;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm">
      <span className="font-medium text-brand-700">
        {usage.remaining} of {usage.limit} free refinements left
      </span>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      {authEnabled && !signedIn && (
        <Link href="/login" className="ml-auto font-medium text-brand-700 hover:underline">
          Sign in for unlimited →
        </Link>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-slate-400">{children}</div>;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 pt-2">
      {[90, 75, 85, 60].map((w) => (
        <div key={w} className="h-3 rounded bg-slate-100" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
