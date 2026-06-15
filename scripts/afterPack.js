// electron-builder afterPack hook.
//
// electron-builder's `electronLanguages` option does not reliably prune the
// bundled Chromium locale packs on macOS, leaving ~40MB of unused `.lproj`
// directories inside the Electron Framework. This hook deletes every locale
// the app doesn't ship, keeping only the ones we support.
//
// Keep list is intentionally narrow; update it if the UI gains a language.

const fs = require("node:fs");
const path = require("node:path");

const KEEP = new Set(["en", "en_GB", "zh_CN", "zh_TW"]);

function pruneLprojDir(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".lproj")) continue;
    const locale = entry.slice(0, -".lproj".length);
    if (KEEP.has(locale)) continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    removed++;
  }
  return removed;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const frameworks = path.join(
    context.appOutDir,
    appName,
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Versions",
    "A",
    "Resources",
  );

  const removed = pruneLprojDir(frameworks);
  console.log(`  • afterPack: pruned ${removed} unused locale pack(s)`);
};
