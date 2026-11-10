import { diffWords } from "diff";
import { motion, useReducedMotion } from "motion/react";

export function Diff({ from, to }: { from: string; to: string }) {
  const reduce = useReducedMotion();
  const parts = diffWords(from, to);
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((p, i) =>
        p.added || p.removed ? (
          <motion.span
            key={i}
            className={p.added ? "diff-add" : "diff-del"}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.8), type: "spring", stiffness: 300, damping: 24 }}
          >
            {p.value}
          </motion.span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </div>
  );
}
