import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { API_URL, ApiError, authEnabled, fetchMe, refine, useSession, type RefineResponse, type Usage } from "@/lib/client";
import { MODES, type Mode } from "@/lib/modes";
import { Toggle } from "@/components/Toggle";
import { Diff } from "@/components/Diff";
import { Arrow, Check, Copy, Sparkles } from "@/components/Icons";
import { Burst } from "@/components/fx/Burst";
import { Magnetic } from "@/components/fx/Magnetic";
import { btn, card } from "@/components/ui";
import { FREE_DAILY } from "@/lib/limits";

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
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState(0);
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
        setBurst((b) => b + 1);
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("error", `Can't reach the Promptly API at ${API_URL}. Is the backend running?`);
        setError(err);
        setShake((s) => s + 1);
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
  const canRun = enabled && !busy && text.trim().length >= 3 && !outOfFree;

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">Editor</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Make your prompt shine.</h1>
        </div>
        <div className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 transition-colors duration-300 ${enabled ? "border-bubble-200 bg-bubble-50" : "border-ink-100 bg-white"}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={String(enabled)}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              className="w-24 text-sm font-bold text-ink-900"
            >
              Promptly {enabled ? "on" : "off"}
            </motion.span>
          </AnimatePresence>
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
        <section className={`${card} flex flex-col transition-shadow duration-300 focus-within:shadow-[0_0_0_4px_var(--color-bubble-200),0_20px_50px_-24px_rgba(10,31,92,0.35)]`} aria-label="Your prompt">
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
            <Segmented
              id="mode"
              value={mode}
              options={(Object.keys(MODES) as Mode[]).map((m) => ({ value: m, label: MODES[m].label, title: MODES[m].description }))}
              onChange={(m) => {
                setMode(m);
                savePref("promptly_mode", m);
              }}
            />
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-bubble-500"
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
          <label htmlFor="prompt" className="sr-only">Prompt</label>
          <textarea
            id="prompt"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(text);
            }}
            placeholder={`Type or paste your prompt…\n\ne.g. "${SAMPLE}"`}
            className="min-h-72 flex-1 resize-y bg-transparent px-5 py-4 text-base leading-relaxed text-ink-900 outline-none placeholder:text-ink-500 focus-visible:outline-none"
            maxLength={12000}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
            <span className="text-xs font-medium text-ink-600">
              <motion.span key={text.length > 0 ? "has" : "none"} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
                {text.length}
              </motion.span>{" "}
              chars · Ctrl/⌘ + Enter
            </span>
            <div className="flex gap-2">
              <AnimatePresence>
                {!text && (
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    onClick={() => setText(SAMPLE)}
                    className={`${btn.small} text-ink-800 hover:bg-ink-50`}
                  >
                    Try example
                  </motion.button>
                )}
              </AnimatePresence>
              <Magnetic strength={0.2}>
                <span className="relative inline-block">
                  <button onClick={() => run(text)} disabled={!canRun} className={`${btn.primary} relative overflow-hidden`}>
                    {busy && <span aria-hidden className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.6)_50%,transparent_70%)] bg-[length:200%_100%]" />}
                    <motion.span animate={busy ? { rotate: 360 } : { rotate: 0 }} transition={busy ? { repeat: Infinity, duration: 1.2, ease: "linear" } : {}}>
                      <Sparkles />
                    </motion.span>
                    <span className="relative">{busy ? "Improving…" : "Improve prompt"}</span>
                  </button>
                  <Burst fire={burst} />
                </span>
              </Magnetic>
            </div>
          </div>
        </section>

        {/* Output */}
        <section className={`${card} relative flex min-h-80 flex-col overflow-hidden`} aria-label="Improved prompt" aria-live="polite" aria-busy={busy}>
          <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
            <Segmented
              id="view"
              value={view}
              options={[
                { value: "improved", label: "Improved" },
                { value: "diff", label: "Show changes" },
              ]}
              onChange={setView}
            />
          </div>

          <div className="flex-1 px-5 py-4">
            <AnimatePresence mode="wait">
              {!enabled ? (
                <Fade key="off"><Empty>Promptly is turned off. Switch it on to get suggestions.</Empty></Fade>
              ) : error ? (
                <motion.div key={`err-${shake}`} initial={{ x: 0 }} animate={{ x: [0, -10, 10, -6, 6, 0] }} transition={{ duration: 0.45 }}>
                  <div className="rounded-2xl border-2 border-bubble-300 bg-bubble-50 p-5 text-ink-900" role="alert">
                    <p className="font-semibold">{error.message}</p>
                    {error.code === "limit_reached" && authEnabled && !session && (
                      <Link to="/login" className={`${btn.primary} mt-4`}>
                        Sign in free for {FREE_DAILY} a day <Arrow />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ) : busy && !result ? (
                <Fade key="busy"><Skeleton /></Fade>
              ) : !result ? (
                <Fade key="empty">
                  <Empty>
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }} className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bubble-100 text-bubble-700">
                      <Sparkles className="h-6 w-6" />
                    </motion.span>
                    Your improved prompt will appear here.
                  </Empty>
                </Fade>
              ) : (
                <motion.div key={`res-${burst}-${view}`} className={busy ? "opacity-50 transition-opacity" : "transition-opacity"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {view === "improved" ? <WordReveal text={result.improved} /> : <Diff from={result.original} to={result.improved} />}
                  {result.changes.length > 0 && (
                    <motion.ul
                      className="mt-6 space-y-2 border-t border-ink-100 pt-4 text-sm"
                      initial="hidden"
                      animate="show"
                      variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}
                    >
                      {result.changes.map((c, i) => (
                        <motion.li key={i} className="flex items-start gap-2.5 text-ink-800" variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bubble-100 text-bubble-700">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          {c}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {enabled && result && (
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="flex justify-end gap-2 border-t border-ink-100 px-4 py-3">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(result.improved);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  className={`${btn.ghost} min-h-10 px-4 py-2 text-sm`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={String(copied)} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                      {copied ? <Check className="h-4 w-4 text-bubble-700" /> : <Copy />}
                    </motion.span>
                  </AnimatePresence>
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => {
                    setText(result.improved);
                    lastSent.current = result.improved;
                  }}
                  className={`${btn.dark} min-h-10 px-4 py-2 text-sm`}
                >
                  Use this <Arrow />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

/** Segmented control with a spring-animated sliding pill. */
function Segmented<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-2xl bg-ink-50 p-1" role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`relative min-h-9 cursor-pointer rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${active ? "text-white" : "text-ink-700 hover:text-ink-900"}`}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-xl bg-ink-900 shadow-md" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function WordReveal({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{text}</p>;
  return (
    <motion.p
      className="whitespace-pre-wrap break-words text-lg leading-relaxed text-ink-900"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: Math.min(0.02, 1.2 / Math.max(1, text.split(" ").length)) } } }}
    >
      {text.split(/(\s+)/).map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <motion.span key={i} className="inline-block" variants={{ hidden: { opacity: 0, y: 10, filter: "blur(6px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } }}>
            {w}
          </motion.span>
        ),
      )}
    </motion.p>
  );
}

function UsageBar({ usage, signedIn }: { usage: Usage | null; signedIn: boolean }) {
  if (!usage) return <div className="mb-5 h-[60px]" />;
  if (usage.remaining === null) {
    return (
      <p className="mb-5 text-sm font-semibold text-ink-700">
        <span className="rounded-full bg-bubble-100 px-2.5 py-1 font-bold text-bubble-700">Unlimited</span> refinements on your plan.
      </p>
    );
  }
  const limit = usage.limit || 1;
  const left = usage.remaining / limit;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const label = usage.period === "daily" ? "left today" : "free tries left";
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl bg-ink-900 px-4 py-3 text-white">
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none" stroke="var(--color-bubble-500)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - left), opacity: left > 0 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </svg>
      <p className="text-sm">
        <motion.span key={usage.remaining} initial={{ scale: 1.6, color: "#ff6fae" }} animate={{ scale: 1, color: "#ffffff" }} className="inline-block text-lg font-extrabold">
          {usage.remaining}
        </motion.span>{" "}
        <span className="font-semibold text-ink-200">of {usage.limit} {label}</span>
        {usage.remaining === 0 && (
          <span className="ml-2 font-semibold text-bubble-300">
            {usage.period === "daily" ? "· back tomorrow" : "· sign in to keep going"}
          </span>
        )}
      </p>
      {authEnabled && !signedIn && (
        <Link to="/login" className="group ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-bubble-300 hover:text-bubble-200">
          Sign in free for {FREE_DAILY} a day
          <span className="transition-transform group-hover:translate-x-1"><Arrow /></span>
        </Link>
      )}
    </motion.div>
  );
}

function Fade({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center text-center text-sm font-medium text-ink-600">{children}</div>;
}

function Skeleton() {
  return (
    <div className="space-y-3 pt-2" aria-label="Improving">
      {[92, 78, 86, 60, 70].map((w, i) => (
        <motion.div key={w} className="skeleton h-4" style={{ width: `${w}%` }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} />
      ))}
    </div>
  );
}
