import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { authEnabled, useSession } from "@/lib/client";

export function Nav() {
  const { session } = useSession();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo /> Promptly
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/app" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">Editor</Link>
          <Link to="/extension" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">Extension</Link>
          <Link to="/pricing" className="hidden rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 sm:block">Pricing</Link>
          {authEnabled &&
            (session ? (
              <Link to="/account" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">Account</Link>
            ) : (
              <Link to="/login" className="ml-1 rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">Sign in</Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
