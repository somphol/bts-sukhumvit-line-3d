# Reproduction book

This is the rebuild recipe for **BTS Sukhumvit Line 3D v1.4.7**. It assumes the reader can write HTML/CSS/JavaScript and run a browser; it does not assume access to the original session.

## 1. What is being reproduced

A static, one-page 3D simulation of Bangkok's BTS Sukhumvit Line:

- **47 operational stations**, Khu Khot (N24) → Kheha (E23), with real codes, English/Thai names, four zones and interchange metadata. N6 Sena Ruam is intentionally omitted (unopened infill).
- **Two starting termini** (N24 and E23), auto pilot on by default, one-click manual takeover.
- **Four cameras**: driver cab, passenger window, free orbit (default), platform arrival.
- **Rail kinematics**: throttle 0–100 km/h, service brake, emergency brake, coasting, door interlock, automatic station stops, terminus reversal.
- **Procedural Bangkok**: four zone-weighted districts, instanced buildings, trees, billboards, parks, 46 road vehicles, 47 platform pairs, landmarks, 900 rain streaks, 28 pooled exchange passengers.
- **Bilingual EN/TH HUD**: telemetry, next station, ETA, zone, interchange, landmark, 47-row station list, minimap, announcement banner.
- **Audio**: synthesized traction, track joints, brake squeal, chimes, horn, ambience, music, rain/thunder; Thai PA from 145 bundled clips; English PA from system speech.
- **Day / golden hour / night**, storm, mobile layout, built-in 36-check self-test.
- **Three source files** (`index.html`, `style.css`, `script.js`) plus local audio. No framework, no build, no npm.

Release version **1.4.7**. Live at <https://somphol.github.io/bts-sukhumvit-line-3d/>. The repository is MIT.

It is **not** an official BTS product, a real-time feed, a geographic map, or a certified signalling/train simulator. The alignment is compressed; displayed distances are scaled by `WORLD_PER_M = 0.25`.

## 2. Requirements matrix

| Requirement | Implementation | Where |
| --- | --- | --- |
| Three-file vanilla app, Three.js via CDN | Two CDN script tags + local `style.css` / `script.js`; no bundler | `index.html` |
| Three.js r128 + OrbitControls | Exact `three@0.128.0` URLs, global `THREE.OrbitControls` | `index.html`, `initThree` |
| 47 real stations, correct order and codes | `STATIONS` (47 rows: code, EN, TH, zone, interchanges, landmark, Thai landmark) | `script.js` |
| N24/E23 termini; N6 omitted | Array starts `N24`, ends `E23`; comment documents the omission | `STATIONS` |
| Start at either terminus | `#startKhuKhot` → `startSimulation(0)`, `#startKheha` → `startSimulation(46)` | `bindEvents` |
| Four city zones with distinct character | `ZONES` counts 34/62/48/40, heights, spread, palettes, glass ratio, trees | `ZONES`, `buildCity` |
| Zone-weighted station spacing | `baseGap` weights + cumulative chainage formula | `buildRoute` |
| Elevated viaduct, running rails, third rail | Ribbons, instanced piers/parapets/sleepers, two rail tubes, named `ThirdRail` | `buildGroundAndViaduct` |
| 47 side-platform stations | Platforms, tactile strips, slatted canopies, signs, columns, benches, lamps, signals | `buildStations` |
| Four-car BTS train | White/blue/red livery, window band, gold emblem, doors, bogies, headlights, LED signs | `buildTrain` |
| Sliding doors + interlock | `doorAnim`, `DOOR_INTERLOCK`, `isAtPlatform` | `updateDoors`, `manualDrive`, `openDoors` |
| Passenger exchange | 28 pooled pedestrians walking door ↔ platform | `initDynamicPassengers`, `spawnPassengerExchange` |
| Auto pilot with stop/dwell/door/depart/reverse | `autoDrive` state machine, 16 s dwell, creep and snap | `autoDrive`, `updateKinematics` |
| Manual controls + keyboard | Throttle slider, brake/emergency/auto/door/horn buttons; `onKeyDown` | `index.html`, `bindEvents` |
| Four cameras | `setView(1..4)` + `updateCameras`; orbit controls only in view 3 | `script.js` |
| Bilingual HUD and announcements | `I18N.en/th`, `t()`, `fill()`, `data-i18n`; Thai detail line always visible | `index.html`, `setLanguage`, `updateHUD` |
| Live telemetry | Speed ring, mode/door/signal, distance, ETA, zone, interchange chips, landmark, progress, minimap | `updateHUD`, `updateMinimap` |
| 47-row station list + jump | `renderStationList`, click → `setStation`, card action | `renderStationList`, `bindEvents` |
| Station info card + Google Maps | Next-station data, search URL, `JUMP TRAIN HERE` | `openStationInfo` |
| Thai/English PA pattern | Two-pass `speakAnnouncement`; station/arrival/interchange/terminal scripts | `stationAnnouncement`, `speakAnnouncement` |
| 145 local Thai PA clips | `arr-*`, `next-*`, `next-*-brief`, 2 welcome, `doors-close`, `test` | `audio/th/` |
| PA-first doors | `speechBusy` + `pendingDoorAction` queue | `openDoors`, `closeDoors` |
| Synthesized soundscape | Engine/PA/music/rain buses into compressor; oscillator + noise recipes | `createAudioEngine` |
| Day/dusk/night | `setTimeOfDay` presets for sky, fog, lights, emissive, exposure | `setTimeOfDay` |
| Rain + thunderstorm | 900 line streaks, screen overlay, wet glass, lightning, thunder | `initRain`, `updateRain`, `flashLightning` |
| Mobile layout | ≤ 900 px minimises telemetry; ≤ 680/430 px reflow dock | `style.css`, `finishBoot` |
| URL parameters | `autostart`, `view`, `station`, `tod`, `rain`, `auto`, `selftest` | `finishBoot`, `PARAMS` |
| Audio preferences persist | `localStorage["bts_audio_v1"]` | `loadAudioSettings`, `saveAudioSettings` |
| Built-in self-test | 36 `check(...)` assertions, DOM overlay + `window.__BTS_TEST__` | `runSelfTests` |
| Version/cache visibility | `VERSION = '1.4.7'`, `?v=1.4.7`, badge + help label | `script.js`, `index.html` |

## 3. Non-negotiable constraints

1. **No build step.** The release is the three files. No `package.json`, bundler, transpiler, CSS preprocessor or generated asset manifest. `scripts/check.mjs` is a checker, not a build.
2. **Pin Three.js r128 and its matching OrbitControls.** `three@0.128.0/build/three.min.js` and `three@0.128.0/examples/js/controls/OrbitControls.js`. The app uses globals (`THREE.Scene`, `THREE.OrbitControls`, `THREE.sRGBEncoding`, `outputEncoding`, `ACESFilmicToneMapping`). A newer Three.js examples build is ESM and will break these calls.
3. **One coordinate system.** `WORLD_PER_M = 0.25`, `TRACK_Y = 5.2`, `routeCurve`, `stationPositions`, `stationTangents`, `chainage`, `updateTrainTransform` and all camera rigs are coupled. Do not change one in isolation.
4. **47 rows, unique codes, N24 first, E23 last.** The city, station list, PA keys and self-test all iterate `STATIONS`. N6 must stay omitted unless the product requirement changes; then update `state.json`, README and the count assertions too.
5. **Chainage is derived, not authored per station.** Use the zone-weight formula in §5. Sampling by `i/46` loses the realistic suburban/commercial rhythm.
6. **The city is non-deterministic.** `Math.random()` is used for buildings, trees, traffic, stars and rain; there is no seed. Do not add a seed casually: screenshots and the "look" of each reload change.
7. **The Thai PA is local audio, not browser TTS.** Keep `audio/th/<key>.m4a` names; `playThaiClip` builds `'audio/th/' + key + '.m4a'`. English stays on `speechSynthesis`. A Thai TTS fallback exists but is not the release path.
8. **PA gates doors.** Manual presses during an announcement queue; the auto pilot waits for speech before opening or closing. Do not shortcut this.
9. **Depth stack is deliberate.** `logarithmicDepthBuffer`, no shadows, pixel ratio ≤ 1.5, and the surface heights in §5. Flattening the stack reintroduces the road/canopy z-fighting patch.
10. **No runtime network except the pinned CDNs and fonts.** No analytics, no API, no fetch. Google Maps opens only when the user clicks the link. The app has no service worker.
11. **Local-first assets.** If audio clips are missing, Thai PA falls back to system TTS, but the release ships all 145. Do not replace them with remote audio.
12. **No app behaviour changes for documentation.** The release skill template must stay byte-identical to the three source files.

## 4. Build order from an empty directory

```bash
mkdir -p ~/Projects/bts-sukhumvit-line-3d/audio/th
cd ~/Projects/bts-sukhumvit-line-3d
git init
```

1. **Repository furniture.** Add `LICENSE` (MIT), `THIRD_PARTY_NOTICES.md`, `.nojekyll`, `.gitignore`, `favicon.svg`, `robots.txt`, `sitemap.xml`.
2. **`index.html` shell.** Build the loading screen, intro (two terminus buttons), top bar, telemetry panel, 47-station panel, cab/passenger/platform overlays, control dock, auto hint, toasts, station modal, help modal, self-test output. Keep the exact IDs used by `cacheDom()`; the simplest way is to write `cacheDom` first and let it define the contract.
3. **`style.css`.** Establish the BTS palette (`--green #00a651`, `--green-dark #005a36`, `--gold #f2c94c`), glass panels, HUD typography, view-specific overlays, responsive breakpoints at 1280/1080/900/680/430 px, `prefers-reduced-motion`, and rain/lightning/cab effects. All visuals are CSS or canvas; no image assets.
4. **`script.js` constants and data.** Write `VERSION`, the physics constants, `ZONES`, `INTERCHANGES`, `INTERCHANGES_TH`, `STATIONS`, `I18N.en`, `I18N.th`, helpers, `state`, `dom`, module-level caches.
5. **Boot and renderer.** `cacheDom`, `boot`, `setLoading`, `showBootError`, `initThree`, `onResize`, `finishBoot`. At this point the page should show the sky and an empty scene.
6. **Route survey and viaduct.** `buildRoute`, `routePointAtDisplay`, `routeTangentAtDisplay`, `stationNormal`, `stationPoint`, `routeDistanceSq`, `makeRibbon`, `offsetRouteCurve`, `makeTube`, `buildGroundAndViaduct`. Confirm station positions and the third rail.
7. **City.** `makeFacadePair`, `buildCity`, `buildTrees`, `buildStreetlights`, `makeSignTexture`, `createBillboard`, `placeBillboard`, `placeTrackBillboard`, `buildBillboards`, `addPark`, `buildParks`, `buildTraffic`.
8. **Stations.** `makeStationSign`, `buildStations`, `buildPedestrians`; append each signal to `stationSignals`.
9. **Landmarks.** `landmarkGroup`, `addBox`, `addCylinder`, `addGlassBox`, `addSignBoard`, `buildLandmarks` and the `create*` functions.
10. **Train.** `makeDestTexture`, `makeBtsLogoTexture`, `makeFrontMaskTexture`, `buildTrain` (ends with `initRain()` and `initDynamicPassengers()`), `updateTrainTransform`, `updateDoors`, `spawnPedestrian`, `spawnPassengerExchange`, `updateDynamicPassengers`.
11. **Rain and storm.** `initRain`, `updateRain`, `flashLightning`, `applyStormLighting`, `setRain`.
12. **Audio.** `createAudioEngine`, `initAudio`, `ensureAudio`, `playDoorChime`, `playPAChime`, `loadAudioSettings`, `saveAudioSettings`, `pickSpeechVoice`, `playThaiClip`, `makeSpeech`, `speakAnnouncement`, `stationAnnouncement`, `updateAudioMixerUI`.
13. **Traffic logic and movement.** `findNextIndex`, `findCurrentIndex`, `nearestStation`, `isAtPlatform`, `terminusAhead`, `setStation`, `setAuto`, `setThrottle`, `toggleBrake`, `applyEmergency`, `openDoors`/`closeDoors`/`toggleDoors`, `reverseDirection`, `manualDrive`, `autoDrive`, `arriveAtStation`, `updateKinematics`, `updateAudio`, `updateTraffic`, `updateSignalLights`, `updateBillboards`.
14. **Cameras, HUD and input.** `setView`, `updateCameras`, `setCameraFov`, `buildHUD`, `renderStationList`, `updateStationListClasses`, `updateHUD`, `updateMinimap`, `announceStation`, `announceArrival`, `toast`, `setLanguage`, `toggleLanguage`, `setTimeOfDay`, `cycleTimeOfDay`, `updateControlsUI`, `toggleMute`, `openStationInfo`, `openHelp`, `closeHelp`, `toggleFullscreen`, `bindEvents`, `onKeyDown`.
15. **Self-test and loop.** `runSelfTests`, `animate`, `window.__BTS__`, `window.__BTS_ERRORS`, `boot()` trigger.
16. **Thai PA clips.** On macOS, generate 145 AAC files with the Kanya voice. The pattern used for the release:

   ```bash
   # one text file per line, then:
   say -v Kanya -r 165 -f text.txt -o clip.aiff
   afconvert -f m4af -d aac -b 32000 clip.aiff audio/th/<key>.m4a
   ```

   Keys: `arr-<code>`, `next-<code>`, `next-<code>-brief` (one per station), `next-N23-welcome`, `next-E22-welcome`, `doors-close`, `test`. All 145 are referenced.
17. **Docs and checks.** Add `AGENTS.md`, `docs/*`, `scripts/check.mjs`, `skills/bts-sukhumvit-line-3d/*`; run the suite in §7.
18. **Release.** Commit, push `main`, verify Pages, capture screenshots at 1600×1000 and 390×844, run the live self-test.

## 5. Where the non-obvious numbers came from

These are authored design constants, not measurements of the real railway. The consequences in the right-hand column are calculated from the code.

### Physics and service

| Constant | Value | Consequence / reason |
| --- | --- | --- |
| `MAX_SPEED` | 100 km/h | UI limit; train accelerates 0→100 in ~23.8 s at 4.2 km/h/s |
| `ACCEL` | 4.2 km/h/s | 0→80 in ~19 s, metro-like but forgiving |
| `BRAKE_DECEL` | 5.2 km/h/s | 100→0 in ~19.2 s |
| `EMERGENCY_DECEL` | 11.5 km/h/s | 100→0 in ~8.7 s |
| `COAST_DECEL` | 0.85 km/h/s | Slow roll-off when throttle is reduced |
| `AUTO_CRUISE` | 80 km/h | Auto pilot never exceeds 80, leaving headroom below the UI limit |
| `AUTO_DECEL` | 1.2 m/s² | Shared by braking target and stopped ETA |
| `DWELL_SECONDS` | 16 s | Long enough for PA + passenger exchange |
| `DOOR_INTERLOCK` | 0.04 | Traction blocked until leaves are essentially shut |
| `STATION_STOP_TOLERANCE` | 20 m | Declared but currently unused; arrival thresholds are in `autoDrive` / `updateKinematics` and `isAtPlatform()` (26 m) |
| `CAR_LEN` / `CAR_GAP` | 5.2 / 0.55 world units | 20.8 display m per car; pitch 5.75 |
| `WORLD_PER_M` | 0.25 | 7,221.8 world-unit curve → 28,887 display m |

Station spacing weights: `{A:1.22, B:0.96, C:0.82, D:1.22}` multiplied by `0.88 + ((i*7)%5)*0.055`. Zone A and D are wide suburban runs; C is the tight Sukhumvit corridor. The average gap is `(28887 - 160) / 46 ≈ 625 m`.

### Route, camera and rendering

| Value | Reason |
| --- | --- |
| 39 control points, Catmull-Rom tension 0.36 | Gentle mainline curves; no radius below what a 5.75-unit car can articulate |
| 80 display m end margins | Keeps the first/last station and terminal camera inside the curve |
| `TRACK_Y = 5.2` | Viaduct deck height; platforms sit at +0.17, tactile +0.275 |
| Cab: forward 2.12, up 1.92, FOV 62 + speed·0.16 | Windshield framing with mild speed widening |
| Window: right 1.17, up 1.62, forward 0.9, FOV 58 | Second-car side view |
| Platform: normal 4.6, along ±12, up 3.2, FOV 66−dist·0.018 clamped 40–66 | Looks down the track; zooms in as the train approaches |
| Orbit: 8–220, polar ≤ 0.495π, damping 0.06 | Cannot go under the ground or inside the train |
| Renderer: pixel ratio ≤ 1.5, no shadows, ACES exposure 0.76 | Stable frame rate on integrated GPUs |
| `logarithmicDepthBuffer: true` | Depth precision across 24,000 units |
| Fog: day 380–2700, dusk 150–1350, night 110–1100 | Hides the world edge; sky horizon colour matches fog |
| 900 rain streaks, 700 stars, 46 cars, 28 passengers | Enough motion without instancing complexity |

### Palette

- Brand: `#00a651` BTS light green, `#005a36` dark green, `#f2c94c` gold.
- Zones: A `#8bc34a`, B `#00a651`, C `#f2c94c`, D `#2d9cdb`.
- Interchanges: MRT `#2d9cdb`, PINK `#f178b6`, YELLOW `#f2c94c`, ARL `#e5484d`, BRT `#f2994a`, SILOM `#005a36`.
- Train: body `#f3f5f1`, lower `#1c4f9c`, red `#c8102e`, gold `#f2c94c`.
- Road/ground: asphalt `#2a302d` family, sidewalk `#b0b1a5`, ground `#3f5238`, fog day `#a9c3bf`.

### Timings and counts

- PA delay 900 ms; speech token invalidates stale callbacks; door-close announcement followed by three beeps.
- Music step 620 ms; two 16-note pentatonic patterns alternating every 16 steps.
- Track-joint thud every 13 display m above 5 km/h.
- HUD 10 Hz, minimap ~4.5 Hz, HUD throttle driven by `state.time`.
- Lightning interval random 8–18 s while raining (first 4–10 s).
- Door leaf travel 2.3 units/s; door chime on open; three beeps on close.

## 6. Verification procedure

From the repository root:

```bash
node --check script.js
node scripts/check.mjs
```

Expected: `node --check` prints nothing and exits 0; `scripts/check.mjs` prints `OK 62 checks` and exits 0. The checker verifies the required doc/skill set, local `src`/`href` targets, relative Markdown links, `node --check` for every `.js`, JSON parsing and byte-identical skill template files.

Serve and run the in-browser harness:

```bash
python3 -m http.server 8080
# open http://localhost:8080/?selftest=1&autostart=1&view=3
```

Expected: the `#selftestOut` overlay reads **36/36 PASS** and **ALL SYSTEMS GO · READY FOR SERVICE**; `document.body.dataset.selftestSummary === "36/36"`; `window.__BTS_ERRORS.length === 0`.

On 2026-11-02 this was verified headlessly in Chrome at 1600×1000 and 390×844 (SwiftShader): 36/36, zero errors, `scrollWidth === 390`, telemetry minimised. URL parameters were verified with `?autostart=1&station=E17&tod=night&rain=1&view=1` (state: E17/night/rain/view 1), and `bts_audio_v1` persisted `engine: 0.42` across a reload.

## 7. What was tried and rejected

| Attempt | Why it was rejected | What replaced it |
| --- | --- | --- |
| Low 40/80 Hz triangle/sine motor through a 260 Hz lowpass | User reported a droning, annoying engine that masked the PA | 180/360 Hz into a 620 Hz bandpass, engine default 0.15, separate PA bus |
| Thai PA via Chrome `speechSynthesis` `th-TH` | Headless and user reports: "dot…" artifacts, Thai skipped, English-only output | Pre-rendered Kanya AAC clips, Thai first then English; TTS only as fallback |
| Engine louder than announcements | PA is the educational layer; the engine is ambience | Per-bus gains + compressor; PA default 100%, engine 15% |
| Start at Siam | User wanted either real terminus | Two intro buttons → N24 / E23; Siam is the intro preview |
| Default driver cab | User asked for camera 3 as default | Orbit start after intro and after `startSimulation` |
| Wide sidewalk ribbon under the road | Caused a green/black z-fighting patch under the left canopy post | Two 3.5 m footways, 15.4 m road underlay, polygon offsets, platform/deck offsets, log depth |
| Solid green canopy slab | Read as a flat slab and hid the road | 8 slatted panels with gaps + green fascia |
| Sky horizon meeting fog with a visible seam | Flicker at the horizon in orbit | Sky bottom colour = fog colour; larger dome; depth-separated ground/water/river/coast |
| Station card using the current station | The ⓘ button lives in the NEXT STATION block | `openStationInfo` always uses `state.nextIndex` |
| Auto pilot relying only on index flips | Train overshot by centimetres, index advanced, then accelerated to the next station | 15 m creep rule, positive snap within 6 m at < 3.2 km/h, arrival within 5 m |
| Freshly built code with no cache marker | User saw the old render after a fix | `VERSION`, `?v=` on CSS/JS, visible telemetry badge and help label |
| Headless CDP with `paVolume = 0.001` | Audio element effectively muted; test appeared to do nothing | Test at 0.05 and set a user gesture |

## 8. Honest deviations and unfinished parts

- The alignment is **not geographic**. It preserves station order and relative zone character; distances are display metres, and the whole line is ~28.9 km on screen rather than the real ~50+ km.
- N6 Sena Ruam is omitted. Station count is 47, not the full physical list.
- Buildings, landmarks, passengers and vehicles are low-poly procedural silhouettes. There is no photogrammetry, texture download or GIS data.
- The train is visually guided, not physically simulated. There is no wheel/rail contact model, gradient, traction curve or signalling block system. Signals are cosmetic.
- Auto pilot is a deterministic speed-target controller, not an optimisation or timetable solver.
- Thai PA is synthesized with macOS Kanya, not the real BTS announcer. English uses whatever system voice the browser provides.
- No save/resume of the run; only audio settings persist. No accounts, analytics or backend.
- Not verified: Safari, Firefox, physical iOS/Android, `file://`, screen readers, reduced-motion behaviour beyond the CSS rule, and audible mix quality (the automated checks are silent).
- The in-app credits string and README query table contain two known drifts (see [TESTING.md](TESTING.md) and [AGENTS.md](../AGENTS.md) §5).
