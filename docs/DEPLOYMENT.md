# Deployment

## Target

| Item | Value |
| --- | --- |
| Repository | <https://github.com/somphol/bts-sukhumvit-line-3d> |
| Host | GitHub Pages (legacy static build) |
| Source branch | `main` |
| Source folder | `/` (repository root) |
| Build command | none |
| Custom domain | none |
| Live URL | <https://somphol.github.io/bts-sukhumvit-line-3d/> |
| Release | v1.4.7 |

There is no Actions workflow and no build artifact. Pages publishes the tracked files at the root exactly as committed.

## GitHub Pages settings

1. Repository → **Settings** → **Pages**.
2. **Build and deployment** → Source: **Deploy from a branch**.
3. Branch: **`main`**, folder: **`/ (root)`**.
4. Save. The first deployment takes about a minute; later pushes rebuild in roughly 30–90 seconds.
5. Enforce HTTPS (GitHub provides the certificate for `*.github.io`).

CLI equivalent, if the API is available:

```bash
gh api repos/somphol/bts-sukhumvit-line-3d/pages
# if not enabled:
gh api -X POST repos/somphol/bts-sukhumvit-line-3d/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Do not add a `CNAME` unless a custom domain is actually configured; a stray CNAME breaks the `github.io` URL.

## What is published

```text
index.html                  HUD and shell
style.css                   design system (?v=1.4.7)
script.js                   scene, physics, audio, HUD (?v=1.4.7)
audio/th/*.m4a              145 Thai PA clips (~5.0 MB)
favicon.svg
screenshot*.png             10 README images (~12 MB total)
robots.txt, sitemap.xml
.nojekyll                   disables Jekyll processing
LICENSE, README.md, STATE.md, state.json, THIRD_PARTY_NOTICES.md
AGENTS.md, docs/*, scripts/check.mjs, skills/*
```

`audio/th/` is fetched only when a Thai announcement plays. Screenshots are for the README, not runtime. The app itself loads these **remote** resources:

- `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js`
- `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js`
- `https://fonts.googleapis.com/css2?family=Orbitron...&family=Rajdhani...&family=Noto+Sans+Thai...`
- font files from `fonts.gstatic.com`

Everything else — buildings, train, textures, minimap, sound synthesis — is generated in the browser. There is no image or model asset bundle.

## `.nojekyll`

The repository root contains an empty `.nojekyll`. It must stay committed:

- it stops GitHub Pages from running Jekyll, which would ignore paths beginning with `_` and can slow/alter the publish;
- it keeps the deployment a plain file copy;
- it is checked by `scripts/check.mjs`.

## Caching and cache busting

Observed on 2026-11-02 from the live site:

```text
HTTP/2 200
server: GitHub.com
content-type: text/html; charset=utf-8
cache-control: max-age=600
```

- HTML is cached for up to 10 minutes; a hard reload (`Cmd/Ctrl+Shift+R`) bypasses it.
- `index.html` requests `style.css?v=1.4.7` and `script.js?v=1.4.7`. **Bump the version in all three places together** — `VERSION` in `script.js`, the two `?v=` query strings in `index.html` — so the badge, help label and cache key agree.
- Audio clips and screenshots have no query string. Replacing a clip with the same filename can serve the old file until the Pages/CDN cache expires; rename the key or add a version query in code if that matters.
- GitHub Pages does not let you set custom `Cache-Control` headers. Do not add a service worker just to work around this; the app is deliberately cache-simple.

The visible build badge in the telemetry header (`#buildBadge`) and the help modal (`#versionLabel`) both read `v1.4.7`. If a user reports an old render, ask for that badge first.

## Deploy

```bash
cd ~/Projects/bts-sukhumvit-line-3d
node --check script.js
node scripts/check.mjs
git status --short
git add -A
git commit -m "docs: add release documentation, reproduction book and skill"
git push origin main
```

There is no separate deploy command. A push to `main` is the deployment. Do not force-push; if the push is rejected, fetch/rebase or report the failure rather than rewriting history.

After pushing:

```bash
# Pages build status (optional)
gh api repos/somphol/bts-sukhumvit-line-3d/pages/builds/latest --jq '.status'

# live checks
curl -sI https://somphol.github.io/bts-sukhumvit-line-3d/ | head -5
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/bts-sukhumvit-line-3d/script.js
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/bts-sukhumvit-line-3d/audio/th/next-CEN.m4a
```

Expected: `200` for the page, stylesheet, script, favicon, screenshots and a sample audio clip.

## Verification URLs

| URL | Expected |
| --- | --- |
| <https://somphol.github.io/bts-sukhumvit-line-3d/> | Intro screen, live 3D, two terminus buttons |
| <https://somphol.github.io/bts-sukhumvit-line-3d/?selftest=1&autostart=1&view=3> | `36/36 PASS`, orbit camera, no errors |
| <https://somphol.github.io/bts-sukhumvit-line-3d/?autostart=1&view=1> | Driver cab, auto pilot active |
| <https://somphol.github.io/bts-sukhumvit-line-3d/?autostart=1&station=E17&tod=night&rain=1&view=3> | Erawan area at night in rain |
| <https://somphol.github.io/bts-sukhumvit-line-3d/script.js> | JavaScript, `200`, v1.4.7 |
| <https://somphol.github.io/bts-sukhumvit-line-3d/audio/th/arr-CEN.m4a> | `audio/mp4` or `audio/mp4a-latm`, `200` |

A local equivalent:

```bash
python3 -m http.server 8080
# http://localhost:8080/?selftest=1&autostart=1&view=3
```

## Rollback

Preferred, no history rewrite:

```bash
git log --oneline -5
git revert <bad-commit-sha>
git push origin main
```

Pages redeploys the revert. Wait for the build, then hard-reload and confirm the badge. If the bad change is a single asset, `git revert` is still safer than editing the live branch by hand.

Do not use `git push --force` to roll back; it breaks other clones and is unnecessary for a static site.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Loading screen stops at "Starting the WebGL renderer…" with a Three.js error | CDN blocked or WebGL disabled | Check jsDelivr reachability; enable hardware acceleration; the app shows "Three.js could not be loaded. Check the CDN connection and reload." |
| Page loads but fonts look generic | Google Fonts blocked | Functional fallback; not fatal. Corporate proxies may block `fonts.gstatic.com`. |
| No sound | Autoplay policy, muted, or engine volume 0 | Click **Start** or any control (unlocks `AudioContext`), press `M`, open the mixer |
| Thai announcement is silent | `audio/th/*.m4a` 404, PA language set to EN, or PA volume 0 | Check a clip URL, set **PA LANGUAGE** to ไทย + EN, raise **ANNOUNCEMENTS** |
| English announcement uses an odd voice | System has no `en-GB` voice | The code falls back to any `en` voice; install a system voice |
| Old build after a fix | HTML cached for up to 10 minutes | Hard reload; check `#buildBadge`; confirm the commit is on `main` and Pages rebuilt |
| Everything is 404 after a rename | Absolute URLs and Pages path changed | Update OG/canonical in `index.html`, `README.md`, `AGENTS.md`, `sitemap.xml`, `robots.txt`, `state.json`; re-enable Pages for the new name |
| `404 There isn't a GitHub Pages site here` | Pages not enabled, wrong branch/folder, or deployment still running | Recheck Settings → Pages; inspect the latest build |
| Green/black patch under a canopy post | Depth stack flattened | Restore `logarithmicDepthBuffer` and the surface offsets documented in [ARCHITECTURE.md](ARCHITECTURE.md) |
| Audio clips load but the page is silent in a headless test | Headless Chrome has no audible output | Test state and `Audio` events instead; see [TESTING.md](TESTING.md) |

## Security and privacy

- The repository is public and MIT. No secrets, tokens, analytics IDs or API keys belong in it.
- The app makes no analytics or telemetry calls. The only user-initiated outbound link is the Google Maps search on the station card.
- `localStorage` holds only audio preferences (`bts_audio_v1`).
- If the project is renamed, keep the repository public and Pages on `main` / `/`; the MIT licence and third-party notices must travel with it.
