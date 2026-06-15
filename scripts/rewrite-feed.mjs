#!/usr/bin/env node
// Rewrites an electron-builder feed (latest*.yml) so its `url`/`path` filenames
// become absolute GitHub Release URLs. The feed is then hosted on our own domain
// while the installers it points to live on GitHub Releases. Shared by the local
// release script (scripts/release.mjs) and the CI workflow so the rewrite rule
// has exactly one source of truth.
//
//   import { rewriteFeed } from "./rewrite-feed.mjs"
//   CLI: node scripts/rewrite-feed.mjs <ymlFile> <baseUrl>   (rewrites in place)

export function rewriteFeed(text, baseUrl) {
  const base = baseUrl.replace(/\/+$/, "");
  return text.replace(
    /^(\s*(?:- )?(?:url|path):\s*)(?!https?:\/\/)(\S+)\s*$/gim,
    (_m, prefix, file) => `${prefix}${base}/${file}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, baseUrl] = process.argv.slice(2);
  if (!file || !baseUrl) {
    console.error("usage: node scripts/rewrite-feed.mjs <ymlFile> <baseUrl>");
    process.exit(1);
  }
  const { readFile, writeFile } = await import("node:fs/promises");
  await writeFile(file, rewriteFeed(await readFile(file, "utf8"), baseUrl));
  console.log(`rewrote ${file} -> ${baseUrl.replace(/\/+$/, "")}/…`);
}
