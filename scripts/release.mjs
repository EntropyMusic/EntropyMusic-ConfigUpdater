#!/usr/bin/env node
// One-command release for the Entropy Music firmware app.
//
// Architecture: the auto-update FEED (latest*.yml) is hosted on our own domain
// (entropymusic.cc/updates/, served from the website repo's public/updates/),
// while the heavy INSTALLERS live on GitHub Releases. electron-builder's generic
// provider emits a feed with bare filenames; this script uploads the installers
// to GitHub, rewrites the feed's url/path to absolute GitHub Release URLs, and
// copies the feed into the website repo so a deploy publishes it.
//
//   npm run release                 build (current OS) -> GitHub release -> feed
//   npm run release -- --skip-build use whatever is already in dist/
//   npm run release -- --skip-publish  rewrite+copy feed only (no GitHub, no push)
//
// electron-builder only builds for the OS it runs on, so for a full Win+mac+Linux
// release, run this once per OS against the SAME version/tag (uploads are additive,
// feeds for each platform are written independently).
//
// Env overrides:
//   GH_REPO    default EntropyMusic/EntropyMusic-ConfigUpdater (must be public)
//   SITE_REPO  default ../EntropyMusic-Website  (the website repo working copy)

import { readFile, writeFile, readdir, mkdir, access } from "node:fs/promises";
import { execFileSync, execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = join(root, "dist");

const GH_REPO = process.env.GH_REPO || "EntropyMusic/EntropyMusic-ConfigUpdater";
const SITE_REPO = resolve(root, process.env.SITE_REPO || "../EntropyMusic-Website");
const FEED_DIR = join(SITE_REPO, "public", "updates");

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const skipPublish = args.includes("--skip-publish");

const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const VERSION = pkg.version;
const TAG = `v${VERSION}`;
const BASE = `https://github.com/${GH_REPO}/releases/download/${TAG}`;

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}
function has(bin) {
  try {
    execSync(`command -v ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── Preflight ──────────────────────────────────────────────────────────────
if (!(await exists(SITE_REPO))) {
  die(`Website repo not found at ${SITE_REPO}. Set SITE_REPO to its path.`);
}
if (!skipPublish) {
  if (!has("gh")) {
    die("`gh` CLI not found. Install it then re-run:\n    brew install gh && gh auth login");
  }
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    die("`gh` is not authenticated. Run: gh auth login");
  }
}

// ── 1. Build (current OS) ──────────────────────────────────────────────────
if (!skipBuild) {
  console.log(`\n▶ Building Entropy Music Firmware ${VERSION}…`);
  run("npm run dist");
}

// ── 2. Collect artifacts ───────────────────────────────────────────────────
const inDist = await readdir(dist).catch(() => die(`No dist/ directory — build first.`));
const ymls = inDist.filter((f) => /^latest.*\.yml$/i.test(f));
const assets = inDist.filter((f) => /\.(exe|dmg|zip|AppImage|deb|blockmap)$/i.test(f));
if (ymls.length === 0) die("No latest*.yml in dist/ — did electron-builder run?");
if (assets.length === 0) die("No installer artifacts in dist/.");

// ── 3. Publish installers to GitHub Releases ───────────────────────────────
if (!skipPublish) {
  let releaseExists = true;
  try {
    execSync(`gh release view ${TAG} --repo ${GH_REPO}`, { stdio: "ignore" });
  } catch {
    releaseExists = false;
  }
  if (!releaseExists) {
    console.log(`\n▶ Creating GitHub release ${TAG} on ${GH_REPO}…`);
    execFileSync(
      "gh",
      ["release", "create", TAG, "--repo", GH_REPO, "--title", TAG, "--notes", `Entropy Music Firmware ${VERSION}`],
      { stdio: "inherit" }
    );
  }
  console.log(`\n▶ Uploading ${assets.length} asset(s)…`);
  execFileSync(
    "gh",
    ["release", "upload", TAG, ...assets.map((a) => join(dist, a)), "--repo", GH_REPO, "--clobber"],
    { stdio: "inherit" }
  );
}

// ── 4. Rewrite feed url/path -> absolute GitHub URLs, copy into website ─────
await mkdir(FEED_DIR, { recursive: true });
const rewrite = (txt) =>
  txt.replace(
    /^(\s*(?:- )?(?:url|path):\s*)(?!https?:\/\/)(\S+)\s*$/gim,
    (_m, prefix, file) => `${prefix}${BASE}/${file}`
  );
for (const y of ymls) {
  const out = rewrite(await readFile(join(dist, y), "utf8"));
  await writeFile(join(FEED_DIR, y), out);
  console.log(`▶ Feed written: public/updates/${y}`);
}

// ── 5. Commit + push the feed (website deploy publishes it) ─────────────────
if (!skipPublish) {
  console.log(`\n▶ Committing feed to website repo…`);
  run("git add public/updates", { cwd: SITE_REPO });
  try {
    run(`git commit -m "feed: Entropy Music Firmware ${VERSION}"`, { cwd: SITE_REPO });
    run("git push", { cwd: SITE_REPO });
  } catch {
    console.log("  (nothing to commit — feed unchanged)");
  }
}

console.log(`\n✓ Release ${TAG} done. Verify: https://entropymusic.cc/updates/${ymls[0]}\n`);
