import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Promptly — better prompts, instantly",
  description: "Promptly fixes grammar and rewrites your AI prompts so you get better answers. Web app and Chrome extension.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Nav />
        {children}
        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">© {new Date().getFullYear()} Promptly</footer>
      </body>
    </html>
  );
}
