import { motion, useScroll, useSpring } from "motion/react";

/** Thin pink reading-progress bar pinned to the top of the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-bubble-500" style={{ scaleX }} />;
}
