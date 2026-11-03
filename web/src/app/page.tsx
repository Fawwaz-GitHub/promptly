import Link from "next/link";
import { PricingCards } from "@/components/PricingCards";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">Like Grammarly, for AI prompts</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Write it messy. <span className="text-brand-600">Send it perfect.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Promptly fixes your grammar and rewrites your prompts with clear goals, context and output format — so ChatGPT, Claude and Gemini give you better answers the first time.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/app" className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-brand-700">
            Try Promptly free
          </Link>
          <a href="#extension" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium hover:bg-slate-50">
            Get the Chrome extension
          </a>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4 text-left md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Before</p>
            <p className="mt-2 text-slate-700">write me a email to my boss i want leave next week because my sister weding</p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm ring-2 ring-brand-50">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">After Promptly</p>
            <p className="mt-2 text-slate-700">
              Write a polite, professional email to my manager requesting leave next week to attend my sister&apos;s wedding. Include the dates [start–end date], offer to hand over urgent work, and keep it under 150 words.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            ["Fix grammar", "Spelling, punctuation and phrasing cleaned up instantly — or use Grammar-only mode to keep your wording."],
            ["Improve clarity", "Adds the goal, context, constraints and output format that AI models need to answer well."],
            ["Works everywhere", "The Chrome extension adds a Promptly button to every text box — ChatGPT, Claude, Gemini, Gmail and more."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="extension" className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:p-10">
          <h2 className="text-2xl font-semibold">Promptly for Chrome</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Click the ✨ button that appears on any text box, review the rewrite, and replace your text in one click. Turn it off globally or per site from the toolbar popup.
          </p>
          <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-slate-300">
            <li>Open <code className="rounded bg-white/10 px-1">chrome://extensions</code> and enable Developer mode</li>
            <li>Click “Load unpacked” and select the <code className="rounded bg-white/10 px-1">extension/dist</code> folder</li>
            <li>Pin Promptly and sign in from the popup for unlimited use</li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Pricing</h2>
        <PricingCards />
      </section>
    </main>
  );
}
