import { identify, getStore, clientIp } from "@/lib/supabase-server";
import { checkAndConsume, refund } from "@/lib/usage";
import { refinePrompt, UpstreamError } from "@/lib/openrouter";
import { isMode } from "@/lib/prompts";
import { PLANS } from "@/lib/plans";
import { rateLimit } from "@/lib/ratelimit";
import { json, preflight } from "@/lib/http";

export const runtime = "nodejs";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  if (!rateLimit(`ip:${clientIp(req)}`, 30, 60_000)) {
    return json(req, { error: "rate_limited", message: "Too many requests. Slow down a little." }, 429);
  }

  let body: { text?: unknown; mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "bad_request", message: "Body must be JSON" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const mode = isMode(body.mode) ? body.mode : "improve";
  if (text.length < 3) return json(req, { error: "bad_request", message: "Write a little more first." }, 400);

  const id = await identify(req);
  if ("error" in id) return json(req, { error: id.error, message: "Please sign in again." }, id.status);

  const plan = id.kind === "anon" ? "anonymous" : id.plan;
  const maxChars = PLANS[plan].maxChars;
  if (text.length > maxChars) {
    return json(req, { error: "too_long", message: `Prompts are limited to ${maxChars} characters on your plan.` }, 413);
  }

  const store = getStore();
  const consumed = await checkAndConsume(id, store);
  if (!consumed.allowed) {
    return json(
      req,
      {
        error: "limit_reached",
        message:
          id.kind === "anon"
            ? `You've used your ${PLANS.anonymous.lifetime} free refinements. Sign in with your email for unlimited refinements — it's free.`
            : "You've reached your plan's limit for today.",
        usage: consumed.status,
      },
      402,
    );
  }

  try {
    const result = await refinePrompt(text, mode);
    await store
      .logEvent({
        userId: id.kind === "user" ? id.userId : undefined,
        deviceId: id.kind === "anon" ? id.deviceId : undefined,
        charsIn: text.length,
        model: result.model,
        mode,
      })
      .catch((e) => console.error("logEvent failed", e));
    return json(req, { ...result, original: text, mode, usage: consumed.status });
  } catch (e) {
    await refund(id, store).catch(() => {});
    const err = e instanceof UpstreamError ? e : new UpstreamError("Something went wrong talking to the AI.");
    console.error("refine failed:", e);
    return json(req, { error: "upstream", message: err.message }, err.status);
  }
}
