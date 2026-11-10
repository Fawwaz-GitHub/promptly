import type { ReactNode } from "react";

const ZIP = "/promptly-extension.zip";

const STEPS: [string, ReactNode][] = [
  ["Download", <>Download <b>promptly-extension.zip</b> using the button above.</>],
  ["Unzip", <>Unzip it. You'll get a folder named <code className="rounded bg-slate-100 px-1">promptly-extension</code>.</>],
  ["Open extensions", <>In Chrome, go to <code className="rounded bg-slate-100 px-1">chrome://extensions</code> and turn on <b>Developer mode</b> (top right).</>],
  ["Load it", <>Click <b>Load unpacked</b> and select the <code className="rounded bg-slate-100 px-1">promptly-extension</code> folder.</>],
  ["Use it", <>Pin Promptly from the puzzle-piece menu. Click into any text box, such as ChatGPT, Claude or Gemini, and press the ✨ button or <b>Alt+Shift+P</b>.</>],
];

export default function Extension() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Promptly for Chrome</h1>
      <p className="mt-3 text-slate-600">
        Fix grammar and improve your prompts right inside any text box. Review the rewrite, then replace your text in one click.
        You can turn it off globally or per site from the toolbar popup.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href={ZIP} download className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-brand-700">
          Download extension (.zip)
        </a>
        <span className="text-sm text-slate-500">Works in Chrome, Edge, Brave and other Chromium browsers.</span>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Install in 5 steps</h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
            <div>
              <div className="font-medium">{title}</div>
              <div className="mt-0.5 text-sm text-slate-600">{body}</div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-slate-500">
        Chrome may sometimes show a notice about developer-mode extensions. That's normal for extensions installed outside the Chrome Web Store, and you can dismiss it.
        To update, download the new zip, replace the folder, and click the reload icon on Promptly in <code className="rounded bg-slate-100 px-1">chrome://extensions</code>.
      </p>
    </main>
  );
}
