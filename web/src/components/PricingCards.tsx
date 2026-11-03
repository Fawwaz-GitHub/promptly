import Link from "next/link";

const tiers = [
  {
    name: "Guest",
    price: "$0",
    note: "No sign-up",
    features: ["5 prompt refinements", "Web editor + Chrome extension", "All rewrite modes"],
    cta: { label: "Try it now", href: "/app" },
  },
  {
    name: "Free",
    price: "$0",
    note: "Sign in with email",
    highlight: true,
    features: ["Unlimited refinements", "Sync your login to the extension", "Grammar, Improve & Concise modes"],
    cta: { label: "Sign in free", href: "/login" },
  },
  {
    name: "Pro",
    price: "Soon",
    note: "Coming soon",
    features: ["Best premium AI models", "Longer prompts (12k chars)", "Custom styles & prompt library", "Priority speed"],
    cta: null,
  },
];

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {tiers.map((t) => (
        <div
          key={t.name}
          className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${t.highlight ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"}`}
        >
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">{t.name}</h3>
            <span className="text-xs text-slate-500">{t.note}</span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{t.price}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
            {t.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {t.cta ? (
            <Link
              href={t.cta.href}
              className={`mt-6 rounded-lg px-4 py-2 text-center text-sm font-medium ${t.highlight ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-200 hover:bg-slate-50"}`}
            >
              {t.cta.label}
            </Link>
          ) : (
            <button disabled className="mt-6 cursor-not-allowed rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">
              Upgrade — coming soon
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
