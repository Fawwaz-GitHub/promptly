import { getSettings, siteEnabled, MODE_LABELS, type Mode, type RefineResult, type Settings } from "./shared";

// The script can be injected twice (by the manifest and on install/update); only run once per frame.
const w = window as unknown as { __promptlyLoaded?: boolean };
if (!w.__promptlyLoaded) {
  w.__promptlyLoaded = true;
  main();
}

function main() {

type Editable = HTMLTextAreaElement | HTMLInputElement | HTMLElement;
const TEXT_INPUT_TYPES = new Set(["", "text", "search", "email", "url"]);
const isField = (el: Editable): el is HTMLTextAreaElement | HTMLInputElement => el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;

let settings: Settings;
let active: Editable | null = null;
let panelOpen = false;
let lastResult: Extract<RefineResult, { ok: true }> | null = null;
let currentMode: Mode = "improve";

const host = location.host;

// ---------- Session hand-off from the Promptly website ----------
function listenForWebsiteAuth() {
  if (location.origin !== new URL(settings.siteBase).origin) return;
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
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase()) && !el.readOnly && !el.disabled;
  return el.isContentEditable;
}

function rootEditable(el: HTMLElement): Editable {
  // For contenteditable, walk up to the outermost editable host.
  if (isField(el)) return el;
  let cur: HTMLElement = el;
  while (cur.parentElement && cur.parentElement.isContentEditable) cur = cur.parentElement;
  return cur;
}

function getText(el: Editable): string {
  return isField(el) ? el.value : (el.innerText || "").replace(/\n{3,}/g, "\n\n");
}

function setText(el: Editable, text: string) {
  el.focus();
  if (isField(el)) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
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
    border-radius: 999px; border: none; cursor: pointer; background: #ff6fae; color: #0a1f5c; font-size: 12px; font-weight: 600; line-height: 1;
    box-shadow: 0 6px 18px rgba(255,111,174,.55); transition: transform .15s, background .15s, padding .15s; }
  .badge.compact { width: 28px; padding: 0; justify-content: center; }
  .badge.compact span { display: none; }
  .badge:active { transform: scale(.94); }
  .badge:hover { transform: translateY(-1px); background: #ff8fc0; }
  .badge.busy svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .panel { position: fixed; display: none; width: 380px; max-width: calc(100vw - 24px); max-height: 60vh; overflow: hidden;
    flex-direction: column; background: #fff; color: #0a1f5c; border: 1px solid #e8edfa; border-radius: 18px;
    box-shadow: 0 24px 60px -12px rgba(10,31,92,.35); font-size: 14px; line-height: 1.5; }
  .head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e8edfa; }
  .title { font-weight: 700; display: flex; align-items: center; gap: 6px; }
  .title i { width: 8px; height: 8px; border-radius: 50%; background: #ff6fae; }
  .head select { margin-left: auto; border: 1px solid #e8edfa; border-radius: 8px; padding: 3px 6px; font-size: 12px; background: #fff; color: #0a1f5c; }
  .x { border: none; background: none; cursor: pointer; font-size: 18px; color: #6680d1; padding: 0 2px; }
  .body { padding: 12px; overflow: auto; }
  .improved { white-space: pre-wrap; word-break: break-word; }
  .changes { margin: 12px 0 0; padding: 10px 0 0; border-top: 1px solid #e8edfa; list-style: none; color: #12307f; font-size: 13px; }
  .changes li::before { content: "✓ "; color: #ff6fae; }
  .err { background: #fff4f9; color: #0a1f5c; border: 1px solid #ffb3d4; border-radius: 10px; padding: 10px; }
  .foot { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-top: 1px solid #e8edfa; }
  .meta { font-size: 12px; color: #3a5fc4; margin-right: auto; }
  .btn { border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid #e8edfa; background: #fff; color: #0a1f5c; }
  .btn.primary { background: #ff6fae; border-color: #ff6fae; color: #0a1f5c; }
  .btn.primary:hover { background: #ff8fc0; }
  .sk { height: 10px; border-radius: 4px; background: #ffe8f2; margin: 8px 0; animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .5; } }
</style>
<button class="badge" part="badge" title="Improve with Promptly (Alt+Shift+P)">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>
  <span>Promptly</span>
</button>
<div class="panel" role="dialog" aria-label="Promptly suggestion">
  <div class="head">
    <span class="title"><i></i>Promptly</span>
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
  if (r.width < 80 || r.height < 20 || r.bottom < 0 || r.top > innerHeight) {
    badge.style.display = "none";
    return;
  }
  const hasText = getText(active).trim().length >= 3;
  badge.classList.toggle("compact", !hasText && !panelOpen);
  badge.style.display = "inline-flex";
  const bw = badge.offsetWidth || 96;
  const single = active instanceof HTMLInputElement || r.height < 48;
  badge.style.left = `${Math.max(4, Math.min(r.right - bw - (single ? 6 : 14), innerWidth - bw - 8))}px`;
  const top = single ? r.top + (r.height - 28) / 2 : r.bottom - 38;
  badge.style.top = `${Math.max(4, Math.min(top, innerHeight - 36))}px`;

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
        ? `<span class="meta">Free with email: 5 a day</span><button class="btn primary" data-act="login">Sign in</button>`
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
  panelOpen = true;
  if (text.length < 3) {
    panel.style.display = "flex";
    lastResult = null;
    body.innerHTML = `<div class="meta" style="font-size:13px">Type a prompt first, then click the sparkle to improve it.</div>`;
    foot.innerHTML = "";
    position();
    return;
  }
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
  "focusout",
  () =>
    setTimeout(() => {
      if (panelOpen || !active) return;
      let a: Element | null = document.activeElement;
      while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement; // look inside page web components
      if (a === hostEl || a === active || (a instanceof HTMLElement && active.contains(a))) return;
      badge.style.display = "none";
      active = null;
    }, 150),
  true,
);
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
  if (location.origin === new URL(settings.siteBase).origin) return;
  document.documentElement.appendChild(hostEl);
  // If a field is already focused when we load (e.g. autofocus on ChatGPT)
  const f = document.activeElement;
  if (siteEnabled(settings, host) && isEditable(f)) {
    active = rootEditable(f as HTMLElement);
    position();
  }
})();
}
