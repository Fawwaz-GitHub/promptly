// Builds the extension against the live URLs and writes ../web/public/promptly-extension.zip,
// which the website's /extension page offers for download.
//   PROMPTLY_API_BASE=... PROMPTLY_SITE_BASE=... npm run release
import { execSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const env = {
  ...process.env,
  PROMPTLY_API_BASE: process.env.PROMPTLY_API_BASE || "https://promptly-api.vercel.app",
  PROMPTLY_SITE_BASE: process.env.PROMPTLY_SITE_BASE || "https://promptly-web-ecru.vercel.app",
};
execSync("node build.mjs", { stdio: "inherit", env });

const out = resolve("../web/public/promptly-extension.zip");
const stage = mkdtempSync(join(tmpdir(), "promptly-"));
cpSync("dist", join(stage, "promptly-extension"), { recursive: true });
rmSync(out, { force: true });
execSync(`zip -qr "${out}" promptly-extension`, { cwd: stage, stdio: "inherit" });
rmSync(stage, { recursive: true, force: true });
console.log(`Wrote ${out}`);
