import { motion } from "motion/react";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 ${checked ? "bg-bubble-500" : "bg-ink-200"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
        className={`h-6 w-6 rounded-full bg-white shadow-md ${checked ? "ml-auto" : ""}`}
      />
    </button>
  );
}
