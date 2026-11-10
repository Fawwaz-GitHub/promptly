import { PricingCards } from "@/components/PricingCards";
import { Blobs } from "@/components/fx/Blobs";
import { Reveal } from "@/components/fx/Reveal";

export default function Pricing() {
  return (
    <main className="relative isolate overflow-hidden">
      <Blobs />
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-bubble-700">Pricing</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Simple, friendly pricing.</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-700">Promptly is free today. A Pro plan with unlimited use and premium models is on the way.</p>
        </Reveal>
        <div className="mt-12">
          <PricingCards />
        </div>
      </div>
    </main>
  );
}
