import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { Close, Menu } from "./Icons";
import { btn } from "./ui";
import { authEnabled, useSession } from "@/lib/client";

const LINKS = [
  { to: "/app", label: "Editor" },
  { to: "/extension", label: "Extension" },
  { to: "/pricing", label: "Pricing" },
];

export function Nav() {
  const { session } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));

  const account = authEnabled ? (session ? { to: "/account", label: "Account" } : null) : null;
  const links = account ? [...LINKS, account] : LINKS;

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "border-b border-ink-100 bg-white/85 shadow-[0_8px_30px_-20px_rgba(10,31,92,0.4)] backdrop-blur-xl" : "bg-white/0"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="group flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-ink-900">
          <motion.span whileHover={{ rotate: -12, scale: 1.08 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
            <Logo />
          </motion.span>
          Promptly
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="relative rounded-xl px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:text-ink-900">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-xl bg-ink-50 ring-1 ring-ink-100" transition={{ type: "spring", stiffness: 500, damping: 34 }} />
                  )}
                  {l.label}
                </>
              )}
            </NavLink>
          ))}
          {authEnabled && !session && (
            <Link to="/login" className={`${btn.primary} ml-2 min-h-10 px-4 py-2 text-sm`}>
              Sign in
            </Link>
          )}
        </nav>

        <button className={`${btn.small} text-ink-900 hover:bg-ink-50 md:hidden`} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <Close /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            key={pathname}
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden border-b border-ink-100 bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 pb-4">
              {links.map((l, i) => (
                <motion.div key={l.to} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 * i }}>
                  <NavLink to={l.to} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-xl px-4 py-3 font-semibold ${isActive ? "bg-ink-50 text-ink-900" : "text-ink-700"}`}>
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              {authEnabled && !session && (
                <Link to="/login" onClick={() => setOpen(false)} className={`${btn.primary} mt-2`}>
                  Sign in
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
