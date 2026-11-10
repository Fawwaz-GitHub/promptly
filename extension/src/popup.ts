import { getSettings, MODE_LABELS, type Mode, type Settings, type Usage } from "./shared";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function currentHost(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const u = new URL(tab?.url || "");
    return u.protocol.startsWith("http") ? u.host : null;
  } catch {
    return null;
  }
}

function renderStatus(s: Settings, host: string | null) {
  const on = s.enabled && !!host && !s.disabledSites.includes(host);
  $("status").textContent = !s.enabled ? "Turned off" : !host ? "Not available on this page" : on ? "Active on this page" : "Off on this site";
  $("siteHint").textContent = host ? "Enable on this site" : "Chrome doesn't allow extensions here";
  $("siteRow").classList.toggle("disabled", !s.enabled || !host);
  $<HTMLInputElement>("siteEnabled").disabled = !s.enabled || !host;
}

async function loadAccount() {
  const me = await chrome.runtime.sendMessage({ type: "me" });
  const usageEl = $("usage");
  if (!me || me.error) {
    usageEl.textContent = "Can't reach the Promptly server.";
    usageEl.style.color = "#c01d66";
    return;
  }
  const u: Usage = me.usage;
  if (me.signedIn) {
    usageEl.textContent = u.remaining === null ? "Unlimited refinements" : `${u.remaining} left today`;
    $("signedIn").hidden = false;
    $("email").textContent = me.email || "Signed in";
  } else {
    const pct = u.limit ? (u.used / u.limit) * 100 : 0;
    usageEl.innerHTML = `${u.remaining} of ${u.limit} free refinements left<div class="bar"><i style="width:${pct}%"></i></div>`;
    $("login").hidden = !me.authEnabled;
  }
}

(async () => {
  const s = await getSettings();
  const host = await currentHost();

  const enabled = $<HTMLInputElement>("enabled");
  const siteEnabled = $<HTMLInputElement>("siteEnabled");
  const mode = $<HTMLSelectElement>("mode");

  enabled.checked = s.enabled;
  $("siteName").textContent = host || "This page";
  siteEnabled.checked = !!host && !s.disabledSites.includes(host);
  mode.innerHTML = Object.entries(MODE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  mode.value = s.mode;
  renderStatus(s, host);

  enabled.addEventListener("change", async () => {
    s.enabled = enabled.checked;
    await chrome.storage.sync.set({ enabled: s.enabled });
    renderStatus(s, host);
  });
  siteEnabled.addEventListener("change", async () => {
    if (!host) return;
    s.disabledSites = siteEnabled.checked ? s.disabledSites.filter((h) => h !== host) : [...new Set([...s.disabledSites, host])];
    await chrome.storage.sync.set({ disabledSites: s.disabledSites });
    renderStatus(s, host);
  });
  mode.addEventListener("change", () => chrome.storage.sync.set({ mode: mode.value as Mode }));
  $("login").addEventListener("click", () => chrome.runtime.sendMessage({ type: "openLogin" }));
  $("signout").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "signout" });
    location.reload();
  });
  $("openApp").addEventListener("click", async (e) => {
    e.preventDefault();
    const { siteBase } = await getSettings();
    chrome.tabs.create({ url: `${siteBase}/app` });
  });

  loadAccount();
})();
