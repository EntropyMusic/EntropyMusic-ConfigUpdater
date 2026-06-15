#!/usr/bin/env node
// One-command LOCAL release for the Entropy Music firmware app (current OS only).
// For all-platform releases, push a `v*` tag and let CI build the matrix
// (.github/workflows/release.yml). See RELEASING.md.
//
// Architecture: installers AND the rewritten auto-update feed (latest*.yml) are
// uploaded to a GitHub Release. The feed url/path are rewritten to absolute
// GitHub URLs. The website serves the feed via a Cloudflare redirect:
//   entropymusic.cc/updates/latest-mac.yml -> releases/latest/download/latest-mac.yml
// so there is NO per-release website commit — publishing the release is enough.
//
//   npm run release                 build (current OS) -> GitHub release (+feed)
//   npm run release -- --skip-build  use whatever is already in dist/
//   npm run release -- --skip-publish  rewrite feeds in dist/ only (no GitHub)
//
// Env overrides:
//   GH_REPO  default EntropyMusic/EntropyMusic-ConfigUpdater (must be public)

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync, execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rewriteFeed } from "./rewrite-feed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = join(root, "dist");

const GH_REPO = process.env.GH_REPO || "EntropyMusic/EntropyMusic-ConfigUpdater";

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
function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── Preflight ──────────────────────────────────────────────────────────────
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
  run("npm run dist -- --publish never");
}

// ── 2. Collect + rewrite feeds in dist/ ────────────────────────────────────
const inDist = await readdir(dist).catch(() => die(`No dist/ directory — build first.`));
const ymls = inDist.filter((f) => /^latest.*\.yml$/i.test(f));
const assets = inDist.filter((f) => /\.(exe|dmg|zip|AppImage|deb|blockmap)$/i.test(f));
if (ymls.length === 0) die("No latest*.yml in dist/ — did electron-builder run?");
if (assets.length === 0) die("No installer artifacts in dist/.");

for (const y of ymls) {
  const out = rewriteFeed(await readFile(join(dist, y), "utf8"), BASE);
  await writeFile(join(dist, y), out);
  console.log(`▶ Feed rewritten: ${y}`);
}

// ── 3. Publish installers + feeds to the GitHub Release ────────────────────
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
  const uploads = [...assets, ...ymls].map((f) => join(dist, f));
  console.log(`\n▶ Uploading ${uploads.length} asset(s) (installers + feeds)…`);
  execFileSync("gh", ["release", "upload", TAG, ...uploads, "--repo", GH_REPO, "--clobber"], { stdio: "inherit" });
}

console.log(
  `\n✓ Release ${TAG} done. Served via redirect at https://entropymusic.cc/updates/${ymls[0]}\n`
);
