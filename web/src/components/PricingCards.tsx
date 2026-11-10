import { Link } from "react-router-dom";
import { Check } from "./Icons";
import { Tilt } from "./fx/Tilt";
import { RevealItem, Stagger } from "./fx/Reveal";
import { btn } from "./ui";
import { FREE_DAILY, GUEST_LIMIT } from "@/lib/limits";

const tiers = [
  {
    name: "Guest",
    price: "$0",
    note: "No sign-up",
    features: [`${GUEST_LIMIT} prompt refinements to try it`, "Web editor + Chrome extension", "All rewrite modes"],
    cta: { label: "Try it now", href: "/app" },
  },
  {
    name: "Free",
    price: "$0",
    note: "Sign in with email",
    highlight: true,
    features: [`${FREE_DAILY} refinements every day`, "Sync your login to the extension", "Improve, Grammar & Concise modes"],
    cta: { label: "Sign in free", href: "/login" },
  },
  {
    name: "Pro",
    price: "Soon",
    note: "Coming soon",
    features: ["Unlimited refinements", "Best premium AI models", "Longer prompts (12k chars)", "Priority speed"],
    cta: null,
  },
];

export function PricingCards() {
  return (
    <Stagger className="grid gap-6 md:grid-cols-3">
      {tiers.map((t) => (
        <RevealItem key={t.name}>
          <Tilt max={6} className="h-full rounded-3xl">
            <div
              className={`relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-shadow duration-300 ${
                t.highlight
                  ? "bg-ink-900 text-white shadow-[0_30px_60px_-25px_rgba(10,31,92,0.7)]"
                  : "border border-ink-100 bg-white text-ink-900 shadow-[0_12px_40px_-24px_rgba(10,31,92,0.3)] hover:shadow-[0_24px_50px_-24px_rgba(10,31,92,0.4)]"
              }`}
            >
              {t.highlight && (
                <span className="absolute right-5 top-5 rounded-full bg-bubble-500 px-3 py-1 text-xs font-bold text-ink-900">Most popular</span>
              )}
              <h3 className="text-lg font-bold">{t.name}</h3>
              <p className={`text-sm ${t.highlight ? "text-ink-200" : "text-ink-600"}`}>{t.note}</p>
              <p className="mt-5 text-5xl font-extrabold tracking-tight">{t.price}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.highlight ? "bg-bubble-500 text-ink-900" : "bg-bubble-100 text-bubble-700"}`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className={t.highlight ? "text-ink-50" : "text-ink-800"}>{f}</span>
                  </li>
                ))}
              </ul>
              {t.cta ? (
                <Link to={t.cta.href} className={`mt-7 ${t.highlight ? btn.primary : btn.ghost}`}>
                  {t.cta.label}
                </Link>
              ) : (
                <button disabled className={`mt-7 ${btn.ghost}`}>
                  Upgrade, coming soon
                </button>
              )}
            </div>
          </Tilt>
        </RevealItem>
      ))}
    </Stagger>
  );
}
