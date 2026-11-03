import { identify, getStore, supabaseConfigured } from "@/lib/supabase-server";
import { getStatus } from "@/lib/usage";
import { json, preflight } from "@/lib/http";

export const runtime = "nodejs";
export const OPTIONS = preflight;

export async function GET(req: Request) {
  const id = await identify(req);
  if ("error" in id) return json(req, { error: id.error }, id.status);
  const usage = await getStatus(id, getStore());
  return json(req, {
    signedIn: id.kind === "user",
    email: id.kind === "user" ? id.email : null,
    usage,
    authEnabled: supabaseConfigured(),
  });
}
