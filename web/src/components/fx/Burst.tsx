import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const COLORS = ["#ff6fae", "#0a1f5c", "#ffb3d4", "#3a5fc4"];

/** Small particle burst; re-fires every time `fire` changes. */
export function Burst({ fire }: { fire: number }) {
  const reduce = useReducedMotion();
  if (reduce || !fire) return null;
  return (
    <AnimatePresence>
      <span key={fire} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const d = 46 + (i % 3) * 16;
          return (
            <motion.span
              key={i}
              className="absolute block rounded-full"
              style={{ width: i % 2 ? 6 : 8, height: i % 2 ? 6 : 8, background: COLORS[i % COLORS.length] }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 0.75, ease: [0.25, 1, 0.5, 1] }}
            />
          );
        })}
      </span>
    </AnimatePresence>
  );
}
