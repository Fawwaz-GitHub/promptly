import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Download, Sparkles } from "@/components/Icons";
import { Blobs } from "@/components/fx/Blobs";
import { Burst } from "@/components/fx/Burst";
import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal, RevealItem, Stagger } from "@/components/fx/Reveal";
import { btn, card } from "@/components/ui";

const ZIP = "/promptly-extension.zip";
const code = "rounded-md bg-ink-50 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-900";

const STEPS: [string, ReactNode][] = [
  ["Download", <>Download <b>promptly-extension.zip</b> using the button above.</>],
  ["Unzip", <>Unzip it. You'll get a folder named <code className={code}>promptly-extension</code>.</>],
  ["Open extensions", <>In Chrome, go to <code className={code}>chrome://extensions</code> and turn on <b>Developer mode</b> (top right).</>],
  ["Load it", <>Click <b>Load unpacked</b> and select the <code className={code}>promptly-extension</code> folder.</>],
  ["Use it", <>Pin Promptly from the puzzle-piece menu. Click into any text box, such as ChatGPT, Claude or Gemini, and press the sparkle button or <b>Alt+Shift+P</b>.</>],
];

export default function Extension() {
  const [fired, setFired] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  return (
    <main className="relative isolate overflow-hidden">
      <Blobs />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">Chrome extension</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Promptly, in every text box.</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-700">
            Fix grammar and improve your prompts right where you write them. Review the rewrite, then replace your text in one click.
            Turn it off globally or per site from the toolbar popup.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Magnetic>
              <span className="relative inline-block">
                <a href={ZIP} download onClick={() => setFired((f) => f + 1)} className={`${btn.primary} px-7 py-3.5 text-base`}>
                  <Download /> Download extension (.zip)
                </a>
                <Burst fire={fired} />
              </span>
            </Magnetic>
            <span className="text-sm font-medium text-ink-600">Works in Chrome, Edge, Brave and other Chromium browsers.</span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="mt-14 text-2xl font-extrabold tracking-tight">Install in 5 steps</h2>
          <p className="mt-1 text-sm text-ink-600">Tick each step off as you go.</p>
        </Reveal>
        <Stagger className="mt-5 space-y-3" gap={0.08}>
          {STEPS.map(([title, body], i) => {
            const isDone = done.includes(i);
            return (
              <RevealItem key={title}>
                <motion.button
                  type="button"
                  aria-pressed={isDone}
                  onClick={() => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${card} flex w-full cursor-pointer gap-4 p-5 text-left transition-colors duration-300 ${isDone ? "border-bubble-300 bg-bubble-50" : "hover:border-ink-200"}`}
                >
                  <motion.span
                    animate={isDone ? { scale: [1, 1.25, 1], rotate: [0, 12, 0] } : {}}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold transition-colors duration-300 ${isDone ? "bg-bubble-500 text-ink-900" : "bg-ink-900 text-white"}`}
                  >
                    {isDone ? <Sparkles /> : i + 1}
                  </motion.span>
                  <span>
                    <span className={`block font-bold ${isDone ? "text-ink-600 line-through decoration-bubble-500 decoration-2" : "text-ink-900"}`}>{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-700">{body}</span>
                  </span>
                </motion.button>
              </RevealItem>
            );
          })}
        </Stagger>
        {done.length === STEPS.length && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-ink-900 p-4 text-center font-bold text-white">
            All set. Go write something messy.
          </motion.p>
        )}

        <div className="mt-10 rounded-2xl border-2 border-bubble-200 bg-bubble-50 p-5 text-sm leading-relaxed text-ink-800">
          <p className="font-bold text-ink-900">Updating from an older version?</p>
          <p className="mt-1">
            Remove the old Promptly in <code className={code}>chrome://extensions</code>, then load the new folder. If the sparkle button
            doesn't show on a page that was already open, refresh that page once.
          </p>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-ink-600">
          Chrome may sometimes show a notice about developer-mode extensions. That's normal for extensions installed outside the Chrome Web Store, and you can dismiss it.
          To update, download the new zip, replace the folder, and click the reload icon on Promptly in <code className={code}>chrome://extensions</code>.
        </p>
      </div>
    </main>
  );
}
