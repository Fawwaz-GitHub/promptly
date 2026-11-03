import { getSettings, siteEnabled, MODE_LABELS, type Mode, type RefineResult, type Settings } from "./shared";

type Editable = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

let settings: Settings;
let active: Editable | null = null;
let panelOpen = false;
let lastResult: Extract<RefineResult, { ok: true }> | null = null;
let currentMode: Mode = "improve";

const host = location.host;

// ---------- Session hand-off from the Promptly website ----------
function listenForWebsiteAuth() {
  if (location.origin !== new URL(settings.apiBase).origin) return;
  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.data?.source !== "promptly-web" || e.data.type !== "PROMPTLY_AUTH") return;
    const res = await chrome.runtime.sendMessage({ type: "auth", payload: e.data.payload });
    if (res?.ok) window.postMessage({ source: "promptly-ext", type: "PROMPTLY_AUTH_OK" }, location.origin);
  });
}

// ---------- Editable detection ----------
function isEditable(el: Element | null): el is Editable {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return false; // single-line inputs are rarely prompts
  return el.isContentEditable;
}

function rootEditable(el: HTMLElement): Editable {
  // For contenteditable, walk up to the outermost editable host.
  if (el instanceof HTMLTextAreaElement) return el;
  let cur: HTMLElement = el;
  while (cur.parentElement && cur.parentElement.isContentEditable) cur = cur.parentElement;
  return cur;
}

function getText(el: Editable): string {
  return el instanceof HTMLTextAreaElement ? el.value : (el.innerText || "").replace(/\n{3,}/g, "\n\n");
}

function setText(el: Editable, text: string) {
  el.focus();
  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(el, text); // works with React-controlled inputs
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  // contenteditable (ChatGPT/ProseMirror, Claude, Gemini, Lexical, Gmail…): execCommand keeps the editor's state in sync
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);
  const ok = document.execCommand("insertText", false, text);
  if (!ok || getText(el).trim() !== text.trim()) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }
}

// ---------- UI (Shadow DOM so the page's CSS can't touch us) ----------
const hostEl = document.createElement("promptly-root");
hostEl.style.cssText = "all: initial; position: fixed; top: 0; left: 0; z-index: 2147483647;";
const shadow = hostEl.attachShadow({ mode: "open" });
shadow.innerHTML = `
<style>
  * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .badge { position: fixed; display: none; align-items: center; gap: 4px; height: 28px; padding: 0 10px 0 8px;
    border-radius: 999px; border: none; cursor: pointer; background: #6a45f5; color: #fff; font-size: 12px; font-weight: 600; line-height: 1;
    box-shadow: 0 4px 14px rgba(106,69,245,.35); transition: transform .12s, opacity .12s; }
  .badge:hover { transform: translateY(-1px); background: #5932d9; }
  .badge.busy svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .panel { position: fixed; display: none; width: 380px; max-width: calc(100vw - 24px); max-height: 60vh; overflow: hidden;
    flex-direction: column; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 16px;
    box-shadow: 0 20px 50px rgba(15,23,42,.18); font-size: 14px; line-height: 1.5; }
  .head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  .title { font-weight: 600; }
  .head select { margin-left: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 3px 6px; font-size: 12px; background: #fff; color: #334155; }
  .x { border: none; background: none; cursor: pointer; font-size: 18px; color: #94a3b8; padding: 0 2px; }
  .body { padding: 12px; overflow: auto; }
  .improved { white-space: pre-wrap; word-break: break-word; }
  .changes { margin: 12px 0 0; padding: 10px 0 0; border-top: 1px solid #f1f5f9; list-style: none; color: #475569; font-size: 13px; }
  .changes li::before { content: "✓ "; color: #7c5cff; }
  .err { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; border-radius: 10px; padding: 10px; }
  .foot { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-top: 1px solid #f1f5f9; }
  .meta { font-size: 12px; color: #94a3b8; margin-right: auto; }
  .btn { border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #e2e8f0; background: #fff; color: #0f172a; }
  .btn.primary { background: #6a45f5; border-color: #6a45f5; color: #fff; }
  .btn.primary:hover { background: #5932d9; }
  .sk { height: 10px; border-radius: 4px; background: #f1f5f9; margin: 8px 0; animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .5; } }
</style>
<button class="badge" part="badge" title="Improve with Promptly (Alt+Shift+P)">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
  <span>Promptly</span>
</button>
<div class="panel" role="dialog" aria-label="Promptly suggestion">
  <div class="head">
    <span class="title">✨ Promptly</span>
    <select class="mode">${Object.entries(MODE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
    <button class="x" title="Close">×</button>
  </div>
  <div class="body"></div>
  <div class="foot"></div>
</div>`;

const badge = shadow.querySelector<HTMLButtonElement>(".badge")!;
const panel = shadow.querySelector<HTMLDivElement>(".panel")!;
const body = shadow.querySelector<HTMLDivElement>(".body")!;
const foot = shadow.querySelector<HTMLDivElement>(".foot")!;
const modeSel = shadow.querySelector<HTMLSelectElement>(".mode")!;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function position() {
  if (!active || !active.isConnected) return hideAll();
  const r = active.getBoundingClientRect();
  if (r.width < 120 || r.height < 24 || r.bottom < 0 || r.top > innerHeight) {
    badge.style.display = "none";
    return;
  }
  const hasText = getText(active).trim().length >= 3;
  badge.style.display = hasText || panelOpen ? "inline-flex" : "none";
  const bw = badge.offsetWidth || 96;
  badge.style.left = `${Math.min(r.right - bw - 22, innerWidth - bw - 8)}px`;
  badge.style.top = `${Math.max(4, Math.min(r.bottom - 38, innerHeight - 36))}px`;

  if (panelOpen) {
    const pw = Math.min(380, innerWidth - 24);
    const ph = panel.offsetHeight || 220;
    const left = Math.max(12, Math.min(r.right - pw, innerWidth - pw - 12));
    const above = r.top - ph - 8;
    const top = above > 8 ? above : Math.min(r.bottom + 8, innerHeight - ph - 8);
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(8, top)}px`;
  }
}

function hideAll() {
  badge.style.display = "none";
  closePanel();
}

function closePanel() {
  panelOpen = false;
  panel.style.display = "none";
}

function renderLoading() {
  body.innerHTML = `<div class="sk" style="width:90%"></div><div class="sk" style="width:70%"></div><div class="sk" style="width:80%"></div>`;
  foot.innerHTML = `<span class="meta">Improving your prompt…</span>`;
}

function usageText(u?: { remaining: number | null; limit: number | null }) {
  if (!u || u.remaining === null) return "Unlimited";
  return `${u.remaining} of ${u.limit} free left`;
}

function render(res: RefineResult) {
  if (!res.ok) {
    lastResult = null;
    body.innerHTML = `<div class="err">${esc(res.message)}</div>`;
    foot.innerHTML =
      res.error === "limit_reached" || res.error === "session_expired"
        ? `<span class="meta">Free & unlimited with email</span><button class="btn primary" data-act="login">Sign in</button>`
        : `<span class="meta"></span><button class="btn" data-act="retry">Try again</button>`;
    return;
  }
  lastResult = res;
  body.innerHTML =
    `<div class="improved">${esc(res.improved)}</div>` +
    (res.changes.length ? `<ul class="changes">${res.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : "");
  foot.innerHTML = `<span class="meta">${esc(usageText(res.usage))}</span>
    <button class="btn" data-act="copy">Copy</button>
    <button class="btn primary" data-act="replace">Replace</button>`;
}

async function improve() {
  if (!active) return;
  const text = getText(active).trim();
  if (text.length < 3) return;
  panelOpen = true;
  panel.style.display = "flex";
  modeSel.value = currentMode;
  renderLoading();
  badge.classList.add("busy");
  position();
  try {
    const res: RefineResult = await chrome.runtime.sendMessage({ type: "refine", text, mode: currentMode });
    render(res ?? { ok: false, error: "error", message: "No response from extension." });
  } catch {
    render({ ok: false, error: "reload", message: "Promptly was updated. Please reload this page." });
  } finally {
    badge.classList.remove("busy");
    position();
  }
}

// ---------- Events ----------
badge.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus in the text box
badge.addEventListener("click", () => (panelOpen ? closePanel() : improve()));
panel.addEventListener("mousedown", (e) => {
  if ((e.target as HTMLElement).tagName !== "SELECT") e.preventDefault();
});
shadow.querySelector(".x")!.addEventListener("click", closePanel);
modeSel.addEventListener("change", () => {
  currentMode = modeSel.value as Mode;
  chrome.storage.sync.set({ mode: currentMode });
  improve();
});
foot.addEventListener("click", async (e) => {
  const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
  if (act === "replace" && active && lastResult) {
    setText(active, lastResult.improved);
    closePanel();
  } else if (act === "copy" && lastResult) {
    await navigator.clipboard.writeText(lastResult.improved).catch(() => {});
    (e.target as HTMLElement).textContent = "Copied!";
  } else if (act === "login") {
    chrome.runtime.sendMessage({ type: "openLogin" });
  } else if (act === "retry") {
    improve();
  }
});

document.addEventListener(
  "focusin",
  (e) => {
    if (!siteEnabled(settings, host)) return;
    const t = (e.composedPath()[0] as Element) || (e.target as Element);
    if (hostEl.contains(t) || t === hostEl) return;
    if (isEditable(t)) {
      const el = rootEditable(t as HTMLElement);
      if (el !== active) closePanel();
      active = el;
      position();
    }
  },
  true,
);
document.addEventListener("input", () => active && position(), true);
document.addEventListener(
  "mousedown",
  (e) => {
    if (!panelOpen) return;
    const path = e.composedPath();
    if (!path.includes(hostEl) && !path.includes(active as EventTarget)) closePanel();
  },
  true,
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panelOpen) closePanel();
});
addEventListener("scroll", () => active && position(), true);
addEventListener("resize", () => active && position());

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "shortcut" && active && siteEnabled(settings, host)) improve();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  for (const [k, v] of Object.entries(changes)) (settings as any)[k] = v.newValue;
  if (changes.mode) currentMode = changes.mode.newValue as Mode;
  if (!siteEnabled(settings, host)) {
    hideAll();
    active = null;
  }
});

// ---------- Boot ----------
(async () => {
  settings = await getSettings();
  currentMode = settings.mode;
  listenForWebsiteAuth();
  // Don't show the floating button on the Promptly website itself — it has its own editor.
  if (location.origin === new URL(settings.apiBase).origin) return;
  document.documentElement.appendChild(hostEl);
  // If a field is already focused when we load (e.g. autofocus on ChatGPT)
  const f = document.activeElement;
  if (siteEnabled(settings, host) && isEditable(f)) {
    active = rootEditable(f as HTMLElement);
    position();
  }
})();
