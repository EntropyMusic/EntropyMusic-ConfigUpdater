# Releasing the firmware app

Installers AND the auto-update **feed** (`latest*.yml`) are published as **GitHub
Release assets**. Apps check for updates at `entropymusic.cc/updates/*.yml` —
that path is a Cloudflare redirect to this repo's `releases/latest/download/*.yml`
(see the website repo's `public/_redirects`). So publishing a release is all it
takes; there is **no website commit, no token, no deploy** per release.

The feed's `url`/`path` are rewritten to absolute GitHub URLs so the installers
download from the release. The app-facing URL (`entropymusic.cc/updates/`) is
compiled into every build and never changes — only the redirect target would, if
we ever leave GitHub.

There are two ways to cut a release.

## Option A — CI (recommended, builds all 3 platforms)

`.github/workflows/release.yml` builds macOS + Windows + Linux on a tag push and
uploads the installers + rewritten feeds to the release.

One-time setup: make sure this repo is the code origin (the download URLs use
`${{ github.repository }}`, and that's where releases are created):

```bash
git remote set-url origin https://github.com/EntropyMusic/EntropyMusic-ConfigUpdater.git
git push -u origin HEAD   # pushes code + .github/ so the workflow exists
```

Cut a release:

```bash
npm version patch      # or minor / major — bumps package.json + git tag
git push --follow-tags # triggers the workflow
```

That's it — the redirect serves the new feeds automatically.

## Option B — local, single platform

`npm run release` builds for **your current OS only** and publishes it (installer
+ rewritten feed) to the GitHub Release. Useful for a quick mac- or win-only push.

```bash
npm run release                    # build current OS -> GitHub release (+feed)
npm run release -- --skip-build    # reuse whatever is already in dist/
npm run release -- --skip-publish  # rewrite feeds in dist/ only, no GitHub
```

Requirements: `gh` CLI authenticated (`brew install gh && gh auth login`).
Release repo defaults to `EntropyMusic/EntropyMusic-ConfigUpdater` (override with
`GH_REPO`).

To cover all platforms with Option B, run it once per OS against the **same
version** — uploads are additive and each OS uploads its own feed file.

## Code signing

- **macOS**: silent auto-update requires an Apple Developer ID ($99/yr) +
  notarization. Until then, mac builds are unsigned — they install and the feed
  is valid, but Squirrel.Mac won't *apply* an unsigned update (the launcher shows
  "update ready" then the install step fails). Add `CSC_LINK` / `CSC_KEY_PASSWORD`
  (and notarization creds) as CI secrets when ready.
- **Windows / Linux**: auto-update works unsigned (Windows shows a SmartScreen
  prompt on first run until you add an EV/OV cert).

## Feed files

- `latest.yml` → Windows · `latest-mac.yml` → macOS · `latest-linux.yml` → Linux
- Served via redirect from `entropymusic.cc/updates/` — never committed to the
  website repo (a static file there would shadow the redirect).
- `artifactName` in `package.json` keeps installer names space-free so the URLs
  in the feed match the GitHub asset names exactly.
- The URL-rewrite rule lives in `scripts/rewrite-feed.mjs` (shared by the local
  script and CI) — the one source of truth.
