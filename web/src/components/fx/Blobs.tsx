/** Slow floating colour fields behind hero sections (paused for reduced motion via CSS). */
export function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="animate-float absolute -left-24 top-10 h-80 w-80 rounded-full bg-bubble-300/50 blur-3xl" />
      <div className="animate-float-slow absolute -right-20 top-40 h-96 w-96 rounded-full bg-ink-300/40 blur-3xl" />
      <div className="animate-float absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-bubble-200/60 blur-3xl [animation-delay:-4s]" />
    </div>
  );
}
