import { PricingCards } from "@/components/PricingCards";

export default function Pricing() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Simple pricing</h1>
      <p className="mt-2 text-slate-600">Promptly is free today. A Pro plan with premium models is on the way.</p>
      <div className="mt-8">
        <PricingCards />
      </div>
    </main>
  );
}
