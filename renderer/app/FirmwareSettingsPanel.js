import settings, { ACCENTS, SETTINGS_CHANGED_EVENT } from "./Settings.js";

// Self-contained settings panel — APP-OWNED (renderer/app/, not vendored from
// the website). It injects its own modal into <body> and self-attaches on load,
// so the synced firmware page needs no knowledge of it. A page only needs a
// trigger element (any `[data-open-settings]`); opening also responds to the
// native menu's "Settings…" item via the `open-firmware-settings` window event.
//
// The Language section drives the i18n engine (window.i18n) that the website
// ships and sync-firmware vendors — that is the only translation logic the app
// needs; all strings live in the website's locales/*.json.
class FirmwareSettingsPanel {
  constructor() {
    this.modal = null;
    this.bound = false;
  }

  attach() {
    if (this.bound) return;
    this.bound = true;

    this.render();

    document.querySelectorAll("[data-open-settings]").forEach((el) =>
      el.addEventListener("click", () => this.open())
    );
    // Native menu (main process) → renderer bridge.
    window.addEventListener("open-firmware-settings", () => this.open());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.modal && !this.modal.hidden) this.close();
    });

    // Keep controls in sync if settings change elsewhere (toolbar auto-sync
    // toggle, reset, or the other page).
    window.addEventListener(SETTINGS_CHANGED_EVENT, () => this.syncControls());
    // Reflect the language the i18n engine detects/loads.
    window.i18n?.addListener?.("init", () => this.syncLanguage());
    window.i18n?.addListener?.("languageChanged", () => this.syncLanguage());
    this.syncControls();
  }

  render() {
    const existing = document.getElementById("firmwareSettingsModal");
    if (existing) {
      this.modal = existing;
      return;
    }

    const swatches = ACCENTS.map((accent) => {
      const label = accent.id.charAt(0).toUpperCase() + accent.id.slice(1);
      return `<button type="button" class="Settings-swatch" data-value="${accent.id}" style="--swatch:${accent.value}" aria-label="${label}"></button>`;
    }).join("");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="SettingsModal" id="firmwareSettingsModal" hidden>
        <div class="SettingsModal-backdrop" data-dismiss-firmware-settings></div>
        <div class="SettingsModal-dialog" role="dialog" aria-modal="true" aria-labelledby="firmwareSettingsTitle">
          <button type="button" class="SettingsModal-close" id="firmwareSettingsClose" aria-label="Close settings">×</button>
          <h2 class="SettingsModal-title" id="firmwareSettingsTitle" data-i18n="pages.firmware.settings.title">Settings</h2>
          <div class="Settings">
            <section class="Settings-group">
              <h3 data-i18n="pages.firmware.settings.appearance">Appearance</h3>
              <div class="Settings-row">
                <div class="Settings-label">
                  <span class="Settings-name" data-i18n="pages.firmware.settings.accent">Accent color</span>
                  <span class="Settings-hint" data-i18n="pages.firmware.settings.accentHint">Highlight color used across the app.</span>
                </div>
                <div class="Settings-swatches" role="group" aria-label="Accent color">${swatches}</div>
              </div>
              <label class="Settings-row" for="setReduceMotion">
                <span class="Settings-label">
                  <span class="Settings-name" data-i18n="pages.firmware.settings.reduceMotion">Reduce motion</span>
                  <span class="Settings-hint" data-i18n="pages.firmware.settings.reduceMotionHint">Minimize animations and transitions.</span>
                </span>
                <input type="checkbox" id="setReduceMotion" data-setting="reduceMotion" />
              </label>
              <label class="Settings-row" for="setLanguage">
                <span class="Settings-label">
                  <span class="Settings-name" data-i18n="pages.firmware.settings.language">Language</span>
                  <span class="Settings-hint" data-i18n="pages.firmware.settings.languageHint">Display language for the app interface.</span>
                </span>
                <select id="setLanguage" data-language-select>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </label>
            </section>
            <section class="Settings-group">
              <h3 data-i18n="pages.firmware.settings.behavior">Behavior</h3>
              <label class="Settings-row" for="setAutoSync">
                <span class="Settings-label">
                  <span class="Settings-name" data-i18n="pages.firmware.settings.autoSync">Auto-sync on device select</span>
                  <span class="Settings-hint" data-i18n="pages.firmware.settings.autoSyncHint">Read settings from the device as soon as it is chosen.</span>
                </span>
                <input type="checkbox" id="setAutoSync" data-setting="autoSync" />
              </label>
              <label class="Settings-row" for="setConfirmUpload">
                <span class="Settings-label">
                  <span class="Settings-name" data-i18n="pages.firmware.settings.confirmUpload">Confirm before upload</span>
                  <span class="Settings-hint" data-i18n="pages.firmware.settings.confirmUploadHint">Ask before sending settings to the hardware.</span>
                </span>
                <input type="checkbox" id="setConfirmUpload" data-setting="confirmUpload" />
              </label>
              <label class="Settings-row" for="setDefaultView">
                <span class="Settings-label">
                  <span class="Settings-name" data-i18n="pages.firmware.settings.defaultView">Default editor view</span>
                  <span class="Settings-hint" data-i18n="pages.firmware.settings.defaultViewHint">View shown when the editor opens.</span>
                </span>
                <select id="setDefaultView" data-setting="defaultView">
                  <option value="single" data-i18n="pages.firmware.settings.single">Single</option>
                  <option value="table" data-i18n="pages.firmware.settings.table">Table</option>
                </select>
              </label>
            </section>
            <div class="Settings-footer">
              <button type="button" class="Settings-button" data-settings-reset data-i18n="pages.firmware.settings.reset">Reset to defaults</button>
            </div>
          </div>
        </div>
      </div>`;

    this.modal = wrapper.firstElementChild;
    document.body.appendChild(this.modal);

    this.modal
      .querySelector("#firmwareSettingsClose")
      ?.addEventListener("click", () => this.close());
    this.modal
      .querySelectorAll("[data-dismiss-firmware-settings]")
      .forEach((el) => el.addEventListener("click", () => this.close()));
    this.modal
      .querySelector("[data-settings-reset]")
      ?.addEventListener("click", () => settings.reset());

    this.bindControls();
  }

  bindControls() {
    // Checkboxes and selects: one generic handler keyed by data-setting.
    this.modal.querySelectorAll("input[data-setting], select[data-setting]").forEach((el) => {
      el.addEventListener("change", () => {
        const value = el.type === "checkbox" ? el.checked : el.value;
        settings.set(el.dataset.setting, value);
      });
    });

    // Accent swatches.
    this.modal.querySelectorAll(".Settings-swatch[data-value]").forEach((el) => {
      el.addEventListener("click", () => settings.set("accent", el.dataset.value));
    });

    // Language: not a stored setting — it drives the i18n engine, which keeps
    // its own preference in localStorage and re-translates the page.
    this.modal
      .querySelector("[data-language-select]")
      ?.addEventListener("change", (event) => {
        window.i18n?.switchLanguage?.(event.target.value);
      });
  }

  syncLanguage() {
    const select = this.modal?.querySelector("[data-language-select]");
    if (select && window.i18n?.getCurrentLanguage) {
      select.value = window.i18n.getCurrentLanguage();
    }
  }

  syncControls() {
    if (!this.modal) return;
    this.modal.querySelectorAll("input[data-setting], select[data-setting]").forEach((el) => {
      const value = settings.get(el.dataset.setting);
      if (el.type === "checkbox") el.checked = Boolean(value);
      else el.value = value;
    });
    const accent = settings.get("accent");
    this.modal.querySelectorAll(".Settings-swatch[data-value]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.value === accent);
      el.setAttribute("aria-pressed", el.dataset.value === accent ? "true" : "false");
    });
    this.syncLanguage();
  }

  open() {
    if (this.modal) this.modal.hidden = false;
  }

  close() {
    if (this.modal) this.modal.hidden = true;
  }
}

const panel = new FirmwareSettingsPanel();

// Self-attach once the DOM is ready (no import from the synced firmware page).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => panel.attach());
} else {
  panel.attach();
}

export default panel;
