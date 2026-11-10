// Shared class recipes. Pink fills carry deep-blue text for contrast (7.4:1).
const press = "transition-[transform,background-color,box-shadow,color] duration-200 ease-[var(--ease-out-quart)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

export const btn = {
  primary: `${press} inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-bubble-500 px-5 py-2.5 font-semibold text-ink-900 shadow-[0_8px_24px_-8px_rgba(255,111,174,0.8)] hover:bg-bubble-400 hover:shadow-[0_12px_32px_-8px_rgba(255,111,174,0.9)]`,
  dark: `${press} inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink-900 px-5 py-2.5 font-semibold text-white hover:bg-ink-800`,
  ghost: `${press} inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-ink-100 bg-white px-5 py-2.5 font-semibold text-ink-900 hover:border-ink-200 hover:bg-ink-50`,
  small: `${press} inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold`,
};

export const card = "rounded-3xl border border-ink-100 bg-white shadow-[0_1px_0_rgba(10,31,92,0.04),0_12px_40px_-20px_rgba(10,31,92,0.25)]";
