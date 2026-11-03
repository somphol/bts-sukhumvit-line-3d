# AGENTS.md — BTS Sukhumvit Line 3D

> **Start here for handoff:** [docs/REPRODUCTION.md](docs/REPRODUCTION.md) is the rebuild and verification book. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) maps the code. [docs/TESTING.md](docs/TESTING.md) separates what was run from what was not.

## 1. What this is

A static, single-page 3D simulator of Bangkok's **BTS Sukhumvit Line** — 47 operational stations from Khu Khot (N24) to Kheha (E23), N6 Sena Ruam omitted as unopened. It renders a procedural Bangkok in four zones, a four-car BTS train on an elevated third-rail viaduct, four camera views, a bilingual EN/TH transit HUD, auto pilot, doors with passenger exchange, day/golden-hour/night, rain and thunder, and a Web Audio soundscape with 145 bundled Thai PA clips. The source is `index.html`, `style.css` and `script.js`; there is no build, framework or asset pipeline.

It is **not** an official BTS product, not a route planner, not a real-time data client, and not a physically accurate train simulator. The alignment is compressed and displayed distances are scaled for playability. Current release: **v1.4.7**.

Live copy: <https://somphol.github.io/bts-sukhumvit-line-3d/>
Local master: `~/Projects/bts-sukhumvit-line-3d`

## 2. Commands

```bash
# run — no install, no build
cd ~/Projects/bts-sukhumvit-line-3d
python3 -m http.server 8080
# open http://localhost:8080

# verification (Node only; no npm install)
node --check script.js
node scripts/check.mjs

# in-browser harness: open with autostart, read the overlay
# http://localhost:8080/?selftest=1&autostart=1&view=3  → 36/36 PASS

# deploy = push main; GitHub Pages serves the repository root
git push origin main
```

The app loads Three.js r128 and OrbitControls from jsDelivr and three font families from Google Fonts, so the first load needs a network connection. The 145 Thai PA clips in `audio/th/` are local. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Pages settings and cache behaviour.

## 3. Architecture

Load order is `index.html` → Google Fonts → CDN Three.js/OrbitControls → `script.js`. `script.js` is one IIFE and one `state` object.

1. **Constants and data** — `WORLD_PER_M = 0.25`, `TRACK_Y = 5.2`, `MAX_SPEED = 100`, `ACCEL = 4.2`, `BRAKE_DECEL = 5.2`, `EMERGENCY_DECEL = 11.5`, `AUTO_CRUISE = 80`, `DWELL_SECONDS = 16`. `STATIONS` (47 rows: code, EN, TH, zone, interchanges, landmark EN/TH), `ZONES` (A–D), `INTERCHANGES`, and the `I18N.en` / `I18N.th` dictionaries.
2. **Boot** (`boot`) — `cacheDom` → version labels → require `THREE` → `initThree` (logarithmic-depth renderer, 62° camera, OrbitControls, sky shader, sun, 700 stars, lights) → wait for fonts → `buildRoute` → `buildGroundAndViaduct` → `buildCity` → `buildStations` → `buildLandmarks` → `buildTrain` (also `initRain`, `initDynamicPassengers`) → `buildHUD` → `initAudio` → `bindEvents` → `finishBoot`.
3. **Route and city** — `routeCurve` is a 39-point `CatmullRomCurve3`; `displayTotal = routeLengthWorld / WORLD_PER_M`. Station chainages use zone weights `{A:1.22, B:0.96, C:0.82, D:1.22}` and are sampled back onto the curve, so every platform, landmark and train car shares one coordinate system. `buildCity` places instanced buildings per station with a route-clearance test.
4. **Train and physics** — `updateTrainTransform` clamps four car bodies to the curve at `state.distance * WORLD_PER_M`; `manualDrive` and `autoDrive` own speed; `updateKinematics` handles station snap, index updates and announcements. Doors are a small state machine (`autoState`: `idle | run | dwell | closing | closingAnnounce`) with `DOOR_INTERLOCK = 0.04`.
5. **Cameras and HUD** — `setView(1..4)` sets `body.view-N` and enables OrbitControls only for view 3; `updateCameras` positions cab (forward 2.12, height 1.92), passenger window (car 2, right 1.17), orbit and platform rigs. `updateHUD` refreshes at 10 Hz, `updateMinimap` at ~4.5 Hz.
6. **Audio** — `createAudioEngine` builds separate engine / PA / music / rain buses into a compressor. Thai PA uses `new Audio('audio/th/<key>.m4a')`; English uses `speechSynthesis`. `speakAnnouncement` runs Thai then English and gates manual door actions through `state.pendingDoorAction`.

Key route formula:

```text
displayTotal   = routeLengthWorld / 0.25
usable         = displayTotal - 160
weight[i]      = baseGap[zone] * (0.88 + ((i * 7) % 5) * 0.055)
chainage[i]    = 80 + (cumulative[i] / cumulative[last]) * usable
u              = chainage[i] * 0.25 / routeLengthWorld
```

Auto-pilot braking target and ETA:

```text
target = min(80, sqrt(2 * 1.2 * max(0, distToNext - 12)) * 3.6)   // km/h
creep  = max(2.2, distToNext * 0.8)                                  // under 15 m
eta    = dist / (speed / 3.6)          // moving
eta    = sqrt(2 * dist / 1.2)          // stopped
```

Persistence is **audio settings only** at `localStorage["bts_audio_v1"]`:

```json
{ "engine": 0.15, "pa": 1, "voice": true, "tourist": true,
  "music": 0.18, "musicEnabled": true, "paLang": "both" }
```

The train position, camera, language, time of day and rain are not saved. Every reload starts from the intro or the URL parameters.

## 4. Decisions and constraints

- **Three files, no build.** Do not introduce a bundler, npm dependency, framework or generated CSS. `index.html` must keep working as a static file on Pages.
- **The CDN is pinned, not floating.** `three@0.128.0` and the matching `examples/js/controls/OrbitControls.js`. Three.js r128 predates the ES-module-only examples layout; upgrading requires replacing OrbitControls and the `THREE.OrbitControls` global.
- **One route coordinate system.** `TRACK_Y`, `WORLD_PER_M`, `routeCurve`, `stationPositions`, `chainage`, `updateTrainTransform` and all four camera rigs are coupled. Changing any one without the others derails platforms, train spacing or camera framing.
- **Station order is product data.** 47 rows, unique codes, N24 first and E23 last. N6 is deliberately absent. CEN Siam has special-case announcement and door-side copy. The built-in harness asserts the count and termini.
- **The city is intentionally non-deterministic.** `buildCity`, traffic, trees, rain and stars use `Math.random()` with no seed. A reload looks different; screenshots are not reproducible frame-for-frame. Do not add a seed unless you re-baseline the screenshots and accept a static-looking city.
- **Audio is layered, not a music file.** The engine whine, track thuds, brake squeal, chimes, horn, ambience, rain, thunder and the 16-step music loop are synthesized. Thai PA must stay pre-recorded: Chrome's `th-TH` speech path was unreliable in testing. English PA intentionally uses the system voice.
- **PA has priority over doors.** `openDoors` / `closeDoors` queue an action while `state.speechBusy`; the auto pilot waits for the announcement before dwell or departure. Do not bypass this to make doors feel snappier.
- **The third rail is the visual signature.** It is a separate `TubeGeometry` named `ThirdRail` at offset 1.16 and height `TRACK_Y + 0.34`; the harness looks it up by name.
- **Depth stability is deliberate.** The renderer uses `logarithmicDepthBuffer`, no shadows, pixel ratio capped at 1.5, and staggered surface heights (road 0.28, underlay 0.12, sidewalk 0.16, platform 0.17, tactile 0.275, deck `TRACK_Y`). Lowering these gaps brings back the z-fighting patch under canopy posts.
- **Release artifacts are checked.** `scripts/check.mjs` requires the doc set, local HTML references, Markdown links, parseable JS/JSON and byte-identical skill template files. If you edit a source file, re-copy it into the skill template.

## 5. Known issues

- **Audio is not audibly verified by automation.** The harness confirms the Web Audio graph exists and clips load; nobody has machine-checked loudness, Thai pronunciation or mix balance. Thai clips were generated with the macOS Kanya voice, not the real BTS announcer.
- **Browser coverage is narrow.** Verified in headless Chrome (SwiftShader) at 1600×1000 and 390×844. Safari, Firefox, iOS and Android were not tested. `file://` was not tested; use an HTTP server.
- **CDN required.** Three.js, OrbitControls and fonts are remote. Offline use after a first load depends on the browser cache; there is no service worker. A CDN failure produces the boot error message, not a degraded renderer.
- **No save/resume.** Only audio preferences persist. Reloading restarts the run.
- **Thai copy is in-session work.** The Thai PA script, station names and landmark copy were supplied or reviewed during the build; they have not had a professional proofread.
- **Three UI strings fall back to raw keys.** `updateHUD` calls `t('clear')`, `t('approach')` and `t('atPlatform')`, but those keys are absent from both dictionaries, so the signal chip and platform ETA can show `clear`, `approach` or `atPlatform`.
- **Documentation drift in the app/README.** The README query table says "33-check harness" while `runSelfTests` contains 36 checks. The in-app credits string says there are no audio assets, but 145 Thai clips ship. The README and `THIRD_PARTY_NOTICES.md` are correct.
- **`STATION_STOP_TOLERANCE` is declared but unused.** Arrival actually uses distance thresholds in `autoDrive` / `updateKinematics` and `isAtPlatform()` (26 m, under 1.2 km/h).
- **Landmarks are silhouettes.** Victory Monument, Siam Skywalk, Terminal 21, Benchasiri, Erawan and the depots are recognizable procedural groups, not surveyed models. Station geography is compressed, not mapped.

## 6. Continuity

- **Deployed copy:** GitHub Pages, `main`, repository root — <https://somphol.github.io/bts-sukhumvit-line-3d/>.
- **Local master:** `~/Projects/bts-sukhumvit-line-3d`.
- **Documentation map:** [README.md](README.md) is the human entry point; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) the module map; [docs/REPRODUCTION.md](docs/REPRODUCTION.md) the rebuild book; [docs/TESTING.md](docs/TESTING.md) the verified matrix and gaps; [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) Pages operations; [skills/bts-sukhumvit-line-3d/SKILL.md](skills/bts-sukhumvit-line-3d/SKILL.md) the reusable build skill.
- **Build record:** `STATE.md` is the human build log and `state.json` the machine-readable snapshot (session, duration, tokens, deployment). They are historical; do not wire them into runtime logic or refresh them to hide history.
- **Publishing rules:** stay public/MIT, keep Pages on `main` / `/`, keep `.nojekyll`, and update the absolute URLs in `index.html` (OG/canonical), `README.md`, `AGENTS.md`, `sitemap.xml`, `robots.txt` and `state.json` if the repository is renamed. Bump `VERSION` and the `?v=` query strings together so the build badge and cache bust agree.
