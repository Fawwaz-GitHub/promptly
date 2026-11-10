import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Nav } from "@/components/Nav";
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
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? "Promptly";
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<Editor />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account />} />
        <Route path="/extension" element={<Extension />} />
        <Route path="*" element={<main className="mx-auto max-w-6xl px-4 py-20 text-center text-slate-500">Page not found.</main>} />
      </Routes>
      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">© {new Date().getFullYear()} Promptly</footer>
    </>
  );
}
