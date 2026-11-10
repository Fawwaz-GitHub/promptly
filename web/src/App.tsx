import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { Logo } from "@/components/Logo";
import { ScrollProgress } from "@/components/fx/ScrollProgress";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/Login";
import Account from "@/pages/Account";
import Extension from "@/pages/Extension";

const TITLES: Record<string, string> = {
  "/": "Promptly — better prompts, instantly",
  "/app": "Editor — Promptly",
  "/pricing": "Pricing — Promptly",
  "/login": "Sign in — Promptly",
  "/account": "Account — Promptly",
  "/extension": "Chrome extension — Promptly",
};

export default function App() {
  const location = useLocation();
  const reduce = useReducedMotion();
  useEffect(() => {
    document.title = TITLES[location.pathname] ?? "Promptly";
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <ScrollProgress />
      <Nav />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          id="main"
          className="flex-1"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<Editor />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="/extension" element={<Extension />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <footer className="bg-ink-900 text-ink-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm sm:flex-row">
          <span className="flex items-center gap-2 font-bold text-white">
            <span className="rounded-[10px] ring-2 ring-white/20"><Logo className="h-7 w-7" /></span> Promptly
          </span>
          <nav className="flex gap-5" aria-label="Footer">
            <Link className="hover:text-bubble-300" to="/app">Editor</Link>
            <Link className="hover:text-bubble-300" to="/extension">Extension</Link>
            <Link className="hover:text-bubble-300" to="/pricing">Pricing</Link>
          </nav>
          <span>© {new Date().getFullYear()} Promptly</span>
        </div>
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-28 text-center">
      <p className="text-7xl font-extrabold text-bubble-500">404</p>
      <p className="mt-4 text-lg font-semibold">This page wandered off.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-bubble-700 underline underline-offset-4">Back home</Link>
    </main>
  );
}
