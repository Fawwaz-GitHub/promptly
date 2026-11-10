declare const __API_BASE__: string;
declare const __SITE_BASE__: string;
/** FastAPI backend */
export const DEFAULT_API_BASE = __API_BASE__;
/** React website (login, editor) */
export const DEFAULT_SITE_BASE = __SITE_BASE__;

export type Mode = "improve" | "grammar" | "concise";
export const MODE_LABELS: Record<Mode, string> = { improve: "Improve", grammar: "Grammar only", concise: "Concise" };

export interface Settings {
  enabled: boolean;
  disabledSites: string[];
  mode: Mode;
  apiBase: string;
  siteBase: string;
}
export const DEFAULT_SETTINGS: Settings = { enabled: true, disabledSites: [], mode: "improve", apiBase: DEFAULT_API_BASE, siteBase: DEFAULT_SITE_BASE };

export interface Auth {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  email: string | null;
}

export interface Usage {
  plan: "anonymous" | "free" | "pro";
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface RefineOk {
  ok: true;
  improved: string;
  changes: string[];
  original: string;
  model: string;
  usage: Usage;
}
export interface RefineErr {
  ok: false;
  error: string;
  message: string;
  usage?: Usage;
}
export type RefineResult = RefineOk | RefineErr;

export type Msg =
  | { type: "refine"; text: string; mode?: Mode }
  | { type: "me" }
  | { type: "auth"; payload: Auth }
  | { type: "signout" }
  | { type: "openLogin" };

export async function getSettings(): Promise<Settings> {
  const { enabled, disabledSites, mode } = await chrome.storage.sync.get({
    enabled: DEFAULT_SETTINGS.enabled,
    disabledSites: DEFAULT_SETTINGS.disabledSites,
    mode: DEFAULT_SETTINGS.mode,
  });
  // Server URLs are fixed at build time, so an old saved value can never point the extension at the wrong backend.
  return { enabled, disabledSites, mode, apiBase: DEFAULT_API_BASE, siteBase: DEFAULT_SITE_BASE } as Settings;
}

export function siteEnabled(s: Settings, host: string) {
  return s.enabled && !s.disabledSites.includes(host);
}
