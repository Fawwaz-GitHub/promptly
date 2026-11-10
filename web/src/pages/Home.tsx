import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PricingCards } from "@/components/PricingCards";
import { Arrow, Bolt, Globe, Puzzle, Sparkles, Spell, Wand } from "@/components/Icons";
import { Blobs } from "@/components/fx/Blobs";
import { Counter } from "@/components/fx/Counter";
import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal, RevealItem, Stagger } from "@/components/fx/Reveal";
import { Spotlight } from "@/components/fx/Spotlight";
import { Tilt } from "@/components/fx/Tilt";
import { btn, card } from "@/components/ui";
import { GUEST_LIMIT } from "@/lib/limits";

const DEMOS = [
  {
    before: "write me a email to my boss i want leave next week because my sister weding",
    after: "Write a polite email to my manager requesting leave next week for my sister's wedding. Include the dates [start–end], offer a handover plan, and keep it under 150 words.",
  },
  {
    before: "explain quantum computer simple",
    after: "Explain how a quantum computer works to a curious beginner. Use one everyday analogy, avoid equations, and finish with three real-world uses in under 200 words.",
  },
  {
    before: "make python code read csv and chart sales",
    after: "Write a Python script that reads sales.csv with pandas, totals sales by month, and plots a labelled bar chart with matplotlib. Add brief comments and save it as sales.png.",
  },
];

const SITES = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot", "Gmail", "Notion", "Slack", "Grok", "Mistral"];

export default function Home() {
  return (
    <main>
      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <Stats />
      <ExtensionCta />
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Free to start. Free to keep.</h2>
        </Reveal>
        <div className="mt-10">
          <PricingCards />
        </div>
      </section>
    </main>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const words = ["Write", "it", "messy."];
  return (
    <Spotlight>
      <section className="relative isolate overflow-hidden">
        <Blobs />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:pt-24">
          <motion.span
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="inline-flex items-center gap-2 rounded-full border border-bubble-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-ink-800 shadow-sm backdrop-blur"
          >
            <Sparkles className="h-4 w-4 text-bubble-500" /> Grammarly, but for AI prompts
          </motion.span>

          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
            <span className="block">
              {words.map((w, i) => (
                <motion.span
                  key={w}
                  className="mr-[0.25em] inline-block"
                  initial={reduce ? false : { opacity: 0, y: 40, rotate: -6 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: 0.1 + i * 0.09, type: "spring", stiffness: 200, damping: 16 }}
                >
                  {w}
                </motion.span>
              ))}
            </span>
            <motion.span
              className="relative inline-block"
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: "spring", stiffness: 180, damping: 14 }}
            >
              <span className="relative z-10">Send it perfect.</span>
              <motion.span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-4 origin-left rounded-full bg-bubble-300 sm:bottom-2 sm:h-6"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              />
            </motion.span>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-700"
          >
            Promptly fixes your grammar and rewrites your prompts with a clear goal, context and output format, so ChatGPT, Claude and Gemini get it right the first time.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72 }}
            className="mt-9 flex flex-wrap justify-center gap-3"
          >
            <Magnetic>
              <Link to="/app" className={`${btn.primary} px-7 py-3.5 text-base`}>
                <Sparkles /> Try it free <Arrow />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link to="/extension" className={`${btn.ghost} px-7 py-3.5 text-base`}>
                <Puzzle className="h-4 w-4" /> Get the extension
              </Link>
            </Magnetic>
          </motion.div>
          <p className="mt-4 text-sm text-ink-600">{GUEST_LIMIT} free tries, no sign-up needed</p>

          <LiveDemo />
        </div>
      </section>
    </Spotlight>
  );
}

/** Types a messy prompt, then "fixes" it, cycling through examples. Hover to pause. */
function LiveDemo() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(reduce ? DEMOS[0].before : "");
  const [phase, setPhase] = useState<"typing" | "fixing" | "done">(reduce ? "done" : "typing");
  const [paused, setPaused] = useState(false);
  const demo = DEMOS[idx];

  useEffect(() => {
    if (reduce || paused) return;
    if (phase === "typing") {
      if (typed.length < demo.before.length) {
        const t = setTimeout(() => setTyped(demo.before.slice(0, typed.length + 1)), 32);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("fixing"), 450);
      return () => clearTimeout(t);
    }
    if (phase === "fixing") {
      const t = setTimeout(() => setPhase("done"), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % DEMOS.length);
      setTyped("");
      setPhase("typing");
    }, 3800);
    return () => clearTimeout(t);
  }, [typed, phase, paused, demo.before, reduce]);

  return (
    <Reveal delay={0.2} className="mx-auto mt-16 max-w-4xl">
      <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} className={`${card} grid overflow-hidden text-left md:grid-cols-2`}>
        <div className="border-b border-ink-100 p-6 md:border-b-0 md:border-r">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">You type</p>
          <p className="mt-3 min-h-24 font-medium text-ink-800" aria-live="off">
            {typed}
            {phase === "typing" && <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-blink bg-bubble-500" />}
          </p>
        </div>
        <div className="relative bg-ink-50/60 p-6">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-bubble-700">
            <Sparkles className="h-3.5 w-3.5" /> Promptly sends
          </p>
          <div className="mt-3 min-h-24">
            <AnimatePresence mode="wait">
              {phase === "fixing" && (
                <motion.div key="fix" exit={{ opacity: 0 }} className="space-y-2.5 pt-1">
                  {[92, 80, 64].map((w) => <div key={w} className="skeleton h-3.5" style={{ width: `${w}%` }} />)}
                </motion.div>
              )}
              {phase === "done" && (
                <motion.p
                  key={`done-${idx}`}
                  className="font-medium text-ink-900"
                  initial={reduce ? false : "hidden"}
                  animate="show"
                  exit={{ opacity: 0 }}
                  variants={{ show: { transition: { staggerChildren: 0.018 } } }}
                >
                  {demo.after.split(" ").map((w, i) => (
                    <motion.span key={i} className="inline-block" variants={{ hidden: { opacity: 0, y: 8, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } }}>
                      {w}&nbsp;
                    </motion.span>
                  ))}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Examples">
        {DEMOS.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === idx}
            aria-label={`Example ${i + 1}`}
            onClick={() => {
              setIdx(i);
              setTyped(reduce ? DEMOS[i].before : "");
              setPhase(reduce ? "done" : "typing");
            }}
            className="flex h-6 cursor-pointer items-center px-1"
          >
            <motion.span layout className={`block h-2 rounded-full ${i === idx ? "w-8 bg-bubble-500" : "w-2 bg-ink-200 hover:bg-ink-300"}`} />
          </button>
        ))}
      </div>
    </Reveal>
  );
}

function Marquee() {
  return (
    <section aria-label="Works on" className="border-y border-ink-100 bg-white py-6">
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-ink-500">Works in every text box, including</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-12 hover:[animation-play-state:paused]">
          {[...SITES, ...SITES].map((s, i) => (
            <span key={i} className="text-xl font-extrabold text-ink-300 transition-colors hover:text-ink-900" aria-hidden={i >= SITES.length}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: <Spell />, title: "Fix grammar", text: "Spelling, punctuation and phrasing cleaned up instantly. Grammar-only mode keeps your exact wording." },
    { icon: <Wand />, title: "Sharpen the ask", text: "Adds the goal, context, constraints and output format that AI models need to answer well." },
    { icon: <Globe />, title: "Works everywhere", text: "The Chrome extension adds a Promptly button to every text box, from ChatGPT to Gmail." },
    { icon: <Bolt />, title: "One click away", text: "Press Alt+Shift+P, review the rewrite side by side, and replace your text in one click." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <Reveal>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">Why Promptly</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Better prompts in, better answers out.</h2>
      </Reveal>
      <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <RevealItem key={f.title} className="h-full">
            <Tilt className="h-full rounded-3xl">
              <div className={`${card} group h-full p-6 transition-colors duration-300 hover:border-bubble-200`}>
                <motion.div
                  whileHover={{ rotate: [0, -12, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-white transition-colors duration-300 group-hover:bg-bubble-500 group-hover:text-ink-900"
                >
                  {f.icon}
                </motion.div>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{f.text}</p>
              </div>
            </Tilt>
          </RevealItem>
        ))}
      </Stagger>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["Write", "Type your prompt the way it comes to mind. Typos welcome."],
    ["Improve", "Pick Improve, Grammar or Concise, then hit the sparkle button."],
    ["Send", "Compare the changes, copy it, or replace your text in place."],
  ];
  return (
    <section className="bg-ink-50/70 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Three steps, five seconds.</h2>
        </Reveal>
        <Stagger className="relative mt-12 grid gap-8 md:grid-cols-3" gap={0.15}>
          <motion.div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-1 origin-left rounded-full bg-gradient-to-r from-ink-900 via-bubble-500 to-ink-900 md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
          />
          {steps.map(([t, d], i) => (
            <RevealItem key={t} className="relative">
              <motion.div
                whileHover={{ scale: 1.12 }}
                className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 text-xl font-extrabold text-white ring-8 ring-ink-50"
              >
                {i + 1}
              </motion.div>
              <h3 className="mt-5 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-ink-700">{d}</p>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { n: 3, s: "", label: "rewrite modes" },
    { n: 16, s: "+", label: "free AI models" },
    { n: 5, s: "s", label: "average rewrite" },
    { n: 0, s: "", label: "dollars to start", prefix: "$" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <Stagger className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map((s) => (
          <RevealItem key={s.label} className="text-center">
            <p className="text-5xl font-extrabold tracking-tight text-ink-900">
              {s.prefix}
              <Counter to={s.n} suffix={s.s} />
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-600">{s.label}</p>
          </RevealItem>
        ))}
      </Stagger>
    </section>
  );
}

function ExtensionCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-6">
      <Reveal>
        <Spotlight className="overflow-hidden rounded-[2rem] bg-ink-900">
          <div className="grid items-center gap-10 p-8 text-white md:grid-cols-[1.3fr_1fr] md:p-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-300">Chrome extension</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">A sparkle button in every text box.</h2>
              <p className="mt-4 max-w-lg leading-relaxed text-ink-200">
                Click it, review the rewrite, replace your text. Turn it off globally or per site from the toolbar. Free, no Chrome Web Store needed.
              </p>
              <Magnetic className="mt-8">
                <Link to="/extension" className={`${btn.primary} px-7 py-3.5`}>
                  Download &amp; install <Arrow />
                </Link>
              </Magnetic>
            </div>
            <ExtensionMock />
          </div>
        </Spotlight>
      </Reveal>
    </section>
  );
}

/** Tiny animated mock of the extension's in-page badge and popover. */
function ExtensionMock() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-3xl bg-white p-5 text-ink-900 shadow-2xl">
      <div className="flex gap-1.5" aria-hidden>
        {["bg-bubble-500", "bg-ink-300", "bg-ink-200"].map((c) => <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />)}
      </div>
      <div className="relative mt-4 rounded-2xl border-2 border-ink-100 p-4 pr-14 text-sm text-ink-700">
        how do i make my resume better for job
        <motion.button
          type="button"
          aria-label="Show Promptly suggestion"
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.15, rotate: 8 }}
          whileTap={{ scale: 0.9 }}
          animate={open ? {} : { boxShadow: ["0 0 0 0 rgba(255,111,174,0.7)", "0 0 0 10px rgba(255,111,174,0)"] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="absolute bottom-3 right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-bubble-500 text-ink-900"
        >
          <Sparkles />
        </motion.button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="mt-3 rounded-2xl bg-ink-900 p-4 text-sm text-white"
          >
            Review my resume for a [job title] role and suggest 5 specific improvements to wording, structure and impact.
            <div className="mt-3 flex justify-end">
              <span className="rounded-lg bg-bubble-500 px-3 py-1 text-xs font-bold text-ink-900">Replace</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && <p className="mt-3 text-center text-xs font-semibold text-ink-500">Tap the sparkle</p>}
    </div>
  );
}
