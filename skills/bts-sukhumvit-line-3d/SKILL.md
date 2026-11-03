---
name: BTS Sukhumvit Line 3D
description: Build a static Three.js Bangkok Skytrain simulator with 47 stations, procedural city zones, rail kinematics, four cameras, bilingual HUD and synthesized audio.
version: 1.0.0
---

# BTS Sukhumvit Line 3D

Build a single-page, static 3D simulator of Bangkok's BTS Sukhumvit Line: 47 stations from Khu Khot (N24) to Kheha (E23), four procedural city zones, a four-car train on an elevated third-rail viaduct, four camera views, auto pilot, PA-first doors, bilingual EN/TH telemetry, day/dusk/night, rain and a Web Audio soundscape.

The reference implementation is **v1.4.7**. Use it when the deliverable is a self-contained visual simulation with no backend, no build step and no asset pipeline.

## When to use

- A user asks for a BTS/Skytrain, metro, elevated-rail or city-transit 3D simulator.
- The result must be three files (`index.html`, `style.css`, `script.js`) and run on GitHub Pages.
- You need real station codes/names, a bilingual HUD, multiple cameras, auto pilot and procedural scenery.
- You need a proof-driven release: a built-in self-test plus a static checker.

**Not for:**

- Geographic accuracy, route planning, live arrivals or official BTS data. The alignment is compressed and distances are display metres.
- A physics-grade train model (wheel/rail contact, gradients, signalling blocks). Signals are cosmetic.
- A 3D city builder or GIS importer. This is a hand-authored curve plus zone-weighted procedural placement.
- Accounts, persistence of a journey, multiplayer or a backend.
- A no-network guarantee. Three.js, OrbitControls and fonts are CDN-loaded.

## What it produces

```text
~/Projects/<name>/
├── index.html          HUD, intro, overlays, modals
├── style.css           BTS transit design system
├── script.js           scene, route, city, train, physics, audio, HUD
├── audio/th/*.m4a      optional 145 Thai PA clips
├── .nojekyll
├── README.md, AGENTS.md
├── docs/               ARCHITECTURE, REPRODUCTION, TESTING, DEPLOYMENT
├── scripts/check.mjs   dependency-free release checks
└── skills/<name>/      this skill
```

`assets/template/` contains only the three real source files, byte-identical to the release. It does **not** include audio or screenshots. Without `audio/th/`, Thai PA falls back to the system Thai voice; English already uses `speechSynthesis`.

## Quick start

From this skill directory:

```bash
mkdir -p ~/Projects/bts-sukhumvit-line-3d/audio/th
cp assets/template/index.html assets/template/style.css assets/template/script.js \
   ~/Projects/bts-sukhumvit-line-3d/
cd ~/Projects/bts-sukhumvit-line-3d
python3 -m http.server 8080
# open http://localhost:8080/?autostart=1&view=3
```

No install, no build. Verify syntax before serving:

```bash
node --check script.js
```

The page needs a network connection for Three.js r128, OrbitControls and Google Fonts. It works from an HTTP origin; `file://` was not verified.

## Workflow

1. **Pin the stack.** Keep `three@0.128.0/build/three.min.js` and `three@0.128.0/examples/js/controls/OrbitControls.js`. The code uses the global `THREE` and the non-module `THREE.OrbitControls`.
2. **Write data before scenery.** Put the 47 station rows into `STATIONS` (code, EN, TH, zone, interchanges, landmark EN/TH), the four `ZONES`, `INTERCHANGES`, `INTERCHANGES_TH`, then `I18N.en` / `I18N.th`.
3. **Lay the route.** Author a `CatmullRomCurve3`, set `WORLD_PER_M = 0.25`, derive `displayTotal`, then compute station chainages with the zone-weight formula. Everything else samples this curve.
4. **Build in dependency order.** `buildGroundAndViaduct` → `buildCity` → `buildStations` → `buildLandmarks` → `buildTrain` → `buildHUD` → `initAudio` → `bindEvents` → `finishBoot`.
5. **Add motion after the scene is stable.** `manualDrive`, `autoDrive`, `updateKinematics`, `updateDoors`, `updateTrainTransform`, `updateCameras`.
6. **Add overlays last.** CSS drives the cab frame, wipers, rain, lightning and platform frame; JS only toggles `body.view-N`, `is-raining` and text.
7. **Prove it.** Add `runSelfTests()` with 30+ assertions and a static checker. Test desktop 1600×1000 and mobile 390×844 with no horizontal overflow.
8. **Package.** README, AGENTS, docs, skill template, `.nojekyll`, MIT licence, third-party notices. Push `main`; Pages serves the root.

## Module map of the reference

| Area | Key identifiers | Notes |
| --- | --- | --- |
| Constants | `WORLD_PER_M`, `TRACK_Y`, `MAX_SPEED`, `ACCEL`, `BRAKE_DECEL`, `AUTO_DECEL`, `DWELL_SECONDS` | Top of `script.js`; physics and geometry share them |
| Data | `STATIONS`, `ZONES`, `INTERCHANGES`, `INTERCHANGES_TH`, `I18N` | 47 rows; N6 omitted; CEN has special PA copy |
| Boot | `boot`, `initThree`, `buildRoute`, `buildGroundAndViaduct`, `buildCity`, `buildStations`, `buildLandmarks`, `buildTrain`, `buildHUD`, `initAudio`, `bindEvents`, `finishBoot` | Each heavy step yields a frame so the loading bar paints |
| Route | `routeCurve`, `stationPositions`, `stationTangents`, `stationU`, `stationNormal`, `stationPoint` | 39 control points, Catmull-Rom tension 0.36 |
| Scenery | `buildCity`, `makeFacadePair`, `buildTrees`, `buildBillboards`, `buildParks`, `buildTraffic` | Instanced buildings, canvas window textures |
| Stations | `buildStations`, `makeStationSign`, `buildPedestrians` | Platforms at ±3.72, tactile ±2.56, slatted canopy |
| Train | `buildTrain`, `updateTrainTransform`, `updateDoors` | Four cars, pitch 5.75, doors 2.3 units/s |
| Physics | `manualDrive`, `autoDrive`, `updateKinematics`, `arriveAtStation` | `autoState`: idle/run/dwell/closing/closingAnnounce |
| Doors | `openDoors`, `closeDoors`, `performOpenDoors`, `performCloseDoors`, `isAtPlatform` | `speechBusy` + `pendingDoorAction` queue |
| Cameras | `setView`, `updateCameras`, `setCameraFov` | 1 cab, 2 window, 3 orbit, 4 platform |
| HUD | `updateHUD`, `updateMinimap`, `renderStationList`, `setLanguage` | HUD 10 Hz, minimap ~4.5 Hz |
| Audio | `createAudioEngine`, `speakAnnouncement`, `playThaiClip`, `stationAnnouncement` | Engine/PA/music/rain buses; Thai clip then English TTS |
| Tests | `runSelfTests`, `window.__BTS_TEST__` | `?selftest=1&autostart=1&view=3` |

## Core recipes

### 1. Add a station (or re-space the line)

1. Append the row to `STATIONS` in the correct geographic order. Do **not** renumber existing rows; chainage derives from array order.
2. The chainage formula is automatic:

   ```text
   weight[i]   = baseGap[zone] * (0.88 + ((i * 7) % 5) * 0.055)
   chainage[i] = 80 + (cumulative[i] / cumulative[last]) * (displayTotal - 160)
   ```

3. Update the hard-coded counts: `runSelfTests` asserts 47 station rows, 47 unique codes, 47 positions, 47 signal heads and 47 list rows; the README/help/loading copy says 47; the `state.json` description says 47.
4. Add Thai PA clips (`arr`/`next`/`brief`) or accept TTS fallback. `stationAnnouncement` builds the text from `interchange`, `landmark`, `landmarkTh`.
5. Re-check platform spacing, building clearance and the platform camera at the new station.

### 2. Add a camera view

1. Add a button in `.view-buttons` with `data-view="5"` and a `data-i18n` label.
2. Add the ID to `cacheDom()` if you add a new overlay.
3. Extend `setView(view)` (`clamp` 1–5, `body.view-5`, active button, `controls.enabled = view === 3`).
4. Add a branch in `updateCameras(dt)` that sets `camera.position`, `camera.lookAt` and `setCameraFov`; use `1 - Math.exp(-k * dt)` lerps.
5. Add a `body.view-5` CSS overlay if the view needs a frame.
6. Bump the "Four camera views" assertion and the 1–4 copy in the help modal/README. Keyboard `onKeyDown` currently accepts `1`–`4`.

### 3. Add or regenerate a Thai PA clip

The release uses macOS Kanya with AAC at 32 kbps. One clip:

```bash
say -v Kanya -r 165 -f text.txt -o clip.aiff
afconvert -f m4af -d aac -b 32000 clip.aiff audio/th/next-E4.m4a
```

Naming contract, all consumed by `playThaiClip`:

```text
next-<code>.m4a          full next-station announcement
next-<code>-brief.m4a    shorter variant used when tourist info is off
arr-<code>.m4a           arrival announcement
next-N23-welcome.m4a     first northbound welcome
next-E22-welcome.m4a     first southbound welcome
doors-close.m4a          stand-clear announcement
test.m4a                 TEST PA button
```

Thai plays first, then English via `speechSynthesis`; `paLang` can force `th`, `en` or `both`. If a clip is missing, `playThaiClip` falls back to `speechSynthesis` `th-TH`.

### 4. Tune the auto pilot

- Braking target: `min(80, sqrt(2 * 1.2 * max(0, dist - 12)) * 3.6)` km/h.
- Under 15 m: `max(2.2, dist * 0.8)` km/h creep.
- Arrival: `dist < 5 && speed < 2.8`; safety snaps at `< 6 m` under 3.2 km/h and `< 1.5 m` under 0.45 km/h.
- Do not change `AUTO_DECEL` alone: the HUD's stopped ETA uses the same value, and `AUTO_CRUISE` caps the target.

Test over at least three stations and a terminus, including a door-open cycle. A change that stops short or overshoots usually means the creep window or snap thresholds moved.

## Failure boundaries

- **Not a map.** Station coordinates are a hand-authored curve; do not present it as a geographic route or use it for navigation.
- **Not official.** BTS, Sukhumvit Line and station names are descriptive trademarks. Keep the non-affiliation notice.
- **No backend, no live data.** Everything is generated at load; there is no API, timetable, GTFS import or arrival feed.
- **CDN dependency.** A blocked jsDelivr or Google Fonts request degrades or stops the boot. There is no service worker or offline bundle.
- **No audio assets in the template.** The 145 clips are intentionally omitted from `assets/template/`; a new project must generate or supply them for the full Thai PA.
- **Headless Chrome is the only verified browser.** Safari/Firefox/phones need a manual pass.
- **No physics engine.** The train follows a curve at a scalar speed. Do not promise derailment, gradients or traction physics.
- **No save/resume.** Only audio preferences persist; do not claim journey saves.

## Verification

Static, from the project root:

```bash
node --check script.js
node scripts/check.mjs
```

Expected `OK 62 checks` and exit 0. The checker covers required files, local HTML refs, Markdown links, JS syntax, JSON parsing and byte-identical skill template files.

In-browser:

```text
http://localhost:8080/?selftest=1&autostart=1&view=3
```

Expected overlay **36/36 PASS**, `document.body.dataset.selftestSummary === "36/36"`, `window.__BTS_ERRORS.length === 0`, badge `v1.4.7`.

Mobile: emulate 390×844, reload, confirm `scrollWidth === 390`, `body.telemetry-min`, 36/36. URL params: `?autostart=1&station=E17&tod=night&rain=1&view=1` should yield E17/night/rain/view 1. Audio persistence: set the engine slider, read `localStorage["bts_audio_v1"]`, reload, confirm the value returns.

Do not claim audible verification from a headless run. See [references/verification.md](references/verification.md) for the exact CDP method and expected output.

## Reference files

- [references/method.md](references/method.md) — build order, coordinate invariants, route/camera/audio recipes.
- [references/lessons.md](references/lessons.md) — bugs that actually happened and the regression guards.
- [references/verification.md](references/verification.md) — static and headless checks with expected output.
- [ATTRIBUTION.md](ATTRIBUTION.md) — origin, what is new, licence status.
- `assets/template/` — the three release source files, byte-identical.
