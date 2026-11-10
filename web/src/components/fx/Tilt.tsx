import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";

/** 3D tilt toward the pointer with a soft pink glare that follows it. */
export function Tilt({ children, className = "", max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 200, damping: 20 };
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 25 });
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgba(255,111,174,0.16), transparent 60%)`;

  return (
    <motion.div
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerEnter={(e) => e.pointerType === "mouse" && glareOpacity.set(1)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        glareOpacity.set(0);
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      {!reduce && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glare, opacity: glareOpacity }} />}
    </motion.div>
  );
}
