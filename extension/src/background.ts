import { getSettings, type Auth, type Msg, type RefineResult } from "./shared";

async function deviceId(): Promise<string> {
  const { deviceId } = await chrome.storage.local.get("deviceId");
  if (typeof deviceId === "string") return deviceId;
  const id = "ext" + crypto.randomUUID().replace(/-/g, "");
  await chrome.storage.local.set({ deviceId: id });
  return id;
}

async function getAuth(): Promise<Auth | null> {
  const { auth } = await chrome.storage.local.get("auth");
  return (auth as Auth) || null;
}

async function refreshAuth(apiBase: string, auth: Auth): Promise<Auth | null> {
  try {
    const res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    if (!res.ok) throw new Error("refresh failed");
    const next = (await res.json()) as Auth;
    const merged = { ...next, email: next.email ?? auth.email };
    await chrome.storage.local.set({ auth: merged });
    return merged;
  } catch {
    await chrome.storage.local.remove("auth");
    return null;
  }
}

/** Call the Promptly API, attaching the session (refreshing it if needed) or the device id. */
async function api(path: string, init: RequestInit = {}): Promise<{ status: number; data: any }> {
  const { apiBase } = await getSettings();
  let auth = await getAuth();
  if (auth && auth.expires_at * 1000 < Date.now() + 60_000) auth = await refreshAuth(apiBase, auth);

  const send = async (a: Auth | null) => {
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-Device-Id": await deviceId() };
    if (a) headers.Authorization = `Bearer ${a.access_token}`;
    const res = await fetch(`${apiBase}${path}`, { ...init, headers });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  let r = await send(auth);
  if (r.status === 401 && auth) {
    auth = await refreshAuth(apiBase, auth);
    r = await send(auth);
  }
  return r;
}

async function handle(msg: Msg, sender: chrome.runtime.MessageSender): Promise<unknown> {
  const settings = await getSettings();
  switch (msg.type) {
    case "refine": {
      try {
        const { status, data } = await api("/api/refine", {
          method: "POST",
          body: JSON.stringify({ text: msg.text, mode: msg.mode ?? settings.mode }),
        });
        if (status >= 400) return { ok: false, error: data.error || "error", message: data.message || `Error ${status}`, usage: data.usage } satisfies RefineResult;
        return { ok: true, ...data } satisfies RefineResult;
      } catch {
        return { ok: false, error: "network", message: `Can't reach Promptly at ${settings.apiBase}. Is the server running?` } satisfies RefineResult;
      }
    }
    case "me": {
      try {
        const { data } = await api("/api/me");
        const auth = await getAuth();
        return { ...data, email: auth?.email ?? data.email ?? null };
      } catch {
        return { error: "network" };
      }
    }
    case "auth": {
      // Only accept a session that was handed over by a page on the configured Promptly site.
      const origin = sender.tab?.url ? new URL(sender.tab.url).origin : "";
      if (origin !== new URL(settings.apiBase).origin) return { ok: false };
      await chrome.storage.local.set({ auth: msg.payload });
      return { ok: true };
    }
    case "signout":
      await chrome.storage.local.remove("auth");
      return { ok: true };
    case "openLogin":
      await chrome.tabs.create({ url: `${settings.apiBase}/login?ext=1` });
      return { ok: true };
  }
}

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse);
  return true; // async response
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "improve-prompt" && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "shortcut" }).catch(() => {});
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await deviceId();
  if (reason === "install") {
    const { apiBase } = await getSettings();
    chrome.tabs.create({ url: `${apiBase}/app?welcome=extension` }).catch(() => {});
  }
});
