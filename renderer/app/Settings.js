// User settings for the firmware configurator — APP-OWNED.
//
// This module (and the settings panel beside it) is authored in the Electron
// app, NOT vendored from the website via sync-firmware. It lives in
// renderer/app/ so the sync step (which wipes renderer/{js,css,components,assets})
// never touches it. A small localStorage-backed store with live "apply" for
// appearance settings.
//
// Behavior settings (auto-sync, confirm-before-upload, default view) are read
// by the synced firmware page via the optional window.__firmwareSettings hook
// it looks for; on the website that hook is absent and those settings simply
// don't exist. Language is handled separately by the i18n engine.

const STORAGE_KEY = "entropy.firmware.settings";

export const SETTINGS_CHANGED_EVENT = "firmware-settings-changed";

// Accent swatches. White is the design default; the rest re-tint the single
// accent variable the editor uses everywhere.
export const ACCENTS = [
  { id: "white", value: "#ffffff" },
  { id: "green", value: "#3ad07f" },
  { id: "blue", value: "#5b9dff" },
  { id: "amber", value: "#f7c948" },
  { id: "pink", value: "#ff6f9c" },
  { id: "violet", value: "#b78bff" },
];

export const DEFAULTS = {
  accent: "white",
  reduceMotion: false,
  autoSync: true,
  confirmUpload: false,
  defaultView: "single", // "single" | "table"
};

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

class SettingsStore extends EventTarget {
  constructor() {
    super();
    this.values = { ...DEFAULTS, ...readStored() };
  }

  get(key) {
    return key in this.values ? this.values[key] : DEFAULTS[key];
  }

  getAll() {
    return { ...this.values };
  }

  set(key, value) {
    if (!(key in DEFAULTS)) return;
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.persist();
    this.applyAppearance();
    this.emitChange(key);
  }

  reset() {
    this.values = { ...DEFAULTS };
    this.persist();
    this.applyAppearance();
    this.emitChange(null);
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      /* storage unavailable; settings stay in-memory for the session */
    }
  }

  emitChange(key) {
    const detail = { key, values: this.getAll() };
    this.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail }));
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail }));
  }

  // Appearance settings affect the DOM directly and are safe to call early.
  applyAppearance() {
    const accent = ACCENTS.find((a) => a.id === this.get("accent")) || ACCENTS[0];
    document.documentElement.style.setProperty("--firmware-accent", accent.value);
    if (document.body) {
      document.body.classList.toggle("reduce-motion", Boolean(this.get("reduceMotion")));
    }
  }
}

const settings = new SettingsStore();
// Apply as soon as the module loads so the accent doesn't flash white first.
settings.applyAppearance();

// Bridge for the synced firmware page (FirmwarePage.setupAppSettings), which is
// shared with the website and must not import app-only code. It reads behavior
// settings from this global only when present.
if (typeof window !== "undefined") {
  window.__firmwareSettings = settings;
}

export default settings;
