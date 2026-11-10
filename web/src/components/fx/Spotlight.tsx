import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ReactNode } from "react";

/** A soft pink light that trails the pointer across a section. */
export function Spotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(-400), { stiffness: 90, damping: 20 });
  const y = useSpring(useMotionValue(-400), { stiffness: 90, damping: 20 });
  const bg = useMotionTemplate`radial-gradient(520px circle at ${x}px ${y}px, rgba(255,111,174,0.18), transparent 65%)`;
  return (
    <div
      className={`relative ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
    >
      {!reduce && <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: bg }} />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
