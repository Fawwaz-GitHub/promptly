// Bundles the extension into ./dist. Set PROMPTLY_API_BASE to bake in your deployed URL:
//   PROMPTLY_API_BASE=https://promptly.vercel.app npm run build
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const apiBase = (process.env.PROMPTLY_API_BASE || "http://localhost:3000").replace(/\/$/, "");

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("static", "dist", { recursive: true });

const ctx = await esbuild.context({
  entryPoints: { background: "src/background.ts", content: "src/content.ts", popup: "src/popup.ts" },
  bundle: true,
  format: "iife",
  target: "chrome110",
  outdir: "dist",
  define: { __API_BASE__: JSON.stringify(apiBase) },
  logLevel: "info",
});

if (watch) await ctx.watch();
else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log(`Built extension → dist/ (API: ${apiBase})`);
}
