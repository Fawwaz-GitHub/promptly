import { NextResponse } from "next/server";

/** CORS so the Chrome extension (and the site itself) can call the API. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const extId = process.env.NEXT_PUBLIC_EXTENSION_ID;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const allowed =
    origin === site ||
    (origin.startsWith("chrome-extension://") && (!extId || origin === `chrome-extension://${extId}`));
  return allowed
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id",
        Vary: "Origin",
      }
    : {};
}

export function json(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(req) });
}

export function preflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
