#!/usr/bin/env node
// Vendors ONLY the firmware page and its runtime dependencies out of the
// `web/` submodule into renderer/. Everything else in the website is ignored.
//
// Generated (cleaned + recreated on every run): renderer/{js,css,components,assets}
// Authored (never touched here): renderer/index.html, main.js, preload.js
//
// Run: npm run sync

import { cp, rm, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const web = join(root, "web");
const out = join(root, "renderer");

// source (relative to web/)  ->  dest (relative to renderer/)
const COPIES = [
  // entry + firmware modules
  ["js/pages/Firmware.js", "js/pages/Firmware.js"],
  ["js/pages/firmware", "js/pages/firmware"],
  // config + midi
  ["js/config/firmware-config.js", "js/config/firmware-config.js"],
  ["js/config/Settings.js", "js/config/Settings.js"],
  ["js/midi/MidiManager.js", "js/midi/MidiManager.js"],
  // controller templates fetched at runtime (.html + .css per device)
  ["components/controllers/firmware", "components/controllers/firmware"],
  // styles
  ["css/main.css", "css/main.css"],
  ["css/fonts.css", "css/fonts.css"],
  ["css/Firmware.css", "css/Firmware.css"],
  ["css/Settings.css", "css/Settings.css"],
  // fonts + device thumbnails
  ["public/assets/fonts", "assets/fonts"],
  ["public/assets/images/Firmware", "assets/images/Firmware"],
  // favicon + brand logo used by index.html / launcher.html
  ["public/assets/images/EntropyMusic/logoico_tpbg.svg", "assets/images/EntropyMusic/logoico_tpbg.svg"],
  ["public/assets/images/EntropyMusic/logo_tpbg.svg", "assets/images/EntropyMusic/logo_tpbg.svg"],
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(web))) {
    console.error(`Missing web/ submodule at ${web}. Run: git submodule update --init`);
    process.exit(1);
  }

  // Clean only the generated subtrees, leave index.html etc. intact.
  for (const sub of ["js", "css", "components", "assets"]) {
    await rm(join(out, sub), { recursive: true, force: true });
  }

  let copied = 0;
  for (const [src, dest] of COPIES) {
    const from = join(web, src);
    const to = join(out, dest);
    if (!(await exists(from))) {
      console.warn(`  skip (missing): web/${src}`);
      continue;
    }
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to, { recursive: true });
    console.log(`  + ${dest}`);
    copied += 1;
  }

  console.log(`\nDone. Vendored ${copied} firmware path(s) into renderer/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
