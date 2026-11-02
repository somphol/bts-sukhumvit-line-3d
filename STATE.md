# Build State

| Field | Value |
| --- | --- |
| Project | BTS Sukhumvit Line 3D — Authentic Bangkok City & Driver Simulator (`bts-sukhumvit-line-3d`) |
| Session started | 2026-11-01 23:07:53 UTC |
| Build started | 2026-11-01 23:14:10 UTC |
| Packaged | 2026-11-02 05:29:34 UTC |
| Build duration | **6h 15m 24s** (22,524 seconds) |
| Full session duration | **6h 21m 41s** (22,901 seconds) |
| Harness | OpenCode 2.2.5 |
| Model | DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) |
| Session | `ses_e66a17139ffeXGq2zj84mZEePL` |
| Repository | <https://github.com/somphol/bts-sukhumvit-line-3d> |
| Live demo | <https://somphol.github.io/bts-sukhumvit-line-3d/> |

## Token usage

| Metric | Tokens |
| --- | ---: |
| Input | 3,618,844 |
| Output | 270,054 |
| Reasoning | 325,486 |
| **Total (input + output + reasoning)** | **4,214,384** |
| Cache read | 260,777,344 |
| Cache write | 1,467 |
| Total including cache | 264,993,195 |

> Snapshot from the OpenCode session record at 2026-11-02 05:29:34 UTC. Total cost reported by the session: **$0.00**. The final state-file commit, GitHub push, Pages deployment and closing response happen after this snapshot, so the live session totals will be marginally higher. Cache reads/writes are context-usage figures and are reported separately from the input/output/reasoning total.

## What was built

A complete, self-contained 3D Bangkok Skytrain simulator in three modular source files plus documentation, screenshots and community files.

### Core requirements

- **47 operational stations** — Khu Khot (N24) to Kheha (E23), with real station codes, English and Thai names, zone assignments and interchanges.
- **Starts at either terminus** — Khu Khot N24 or Kheha E23, with auto pilot on by default and a visible TAKE MANUAL takeover. N6 Sena Ruam is intentionally omitted because it is an unopened infill station.
- **Four city zones** — northern suburbs, central commercial core, Sukhumvit lifestyle corridor and the southern industrial/coastal delta, with zone-aware building density, height, palette, glass ratio, trees and landmarks.
- **Elevated third-rail railway** — continuous viaduct, deck, parapets, concrete piers, ballastless track bed, running rails, glowing third rail, track-side signals and 47 side-platform stations with canopies, name boards, benches, lamps, lifts and waiting passengers.
- **Four-car BTS train** — blue lower body, white upper body, black window band, red-framed black cab mask, gold royal emblem, BTS roundel, sliding doors with interior openings and door lights, interior seats and poles, bogies, wheels, current-collector shoes, headlights, tail lights and orange LED destination displays.
- **Driver controls** — throttle 0–80 km/h, service brake, emergency brake, auto pilot, doors, horn, Next Stop and terminus reversal.
- **Auto pilot** — accelerates, brakes into every platform, creeps to the stop mark, opens and closes the doors, waits for the passenger exchange, departs and reverses at either terminus.
- **Four cameras** — first-person driver cab with cockpit overlay and drag-to-look, passenger scenic window, 360° orbit camera and fixed platform arrival cam.
- **Bilingual EN/TH HUD** — station names, zone descriptions, controls, toasts and announcements; live speed, distance, ETA, zone, interchange chips, nearby landmark, route progress, minimap and a clickable 47-station list.
- **Web Audio synthesis and PA** — quiet high-frequency traction whine with no low drone, track-joint thuds, door/PA chimes, two-tone horn, brake squeal, city ambience, original transit music, rain bed and thunder; bilingual Thai/English station, interchange, landmark, arrival, door-side and doors-closing announcements.
- **Day / golden hour / night** — lit windows, neon signs, stars, headlights and a darker HUD at night.
- **Rain / thunderstorm** — 3D rain, screen rain, wet glass, faster wipers, lightning, thunder and rain audio.
- **Passenger exchange** — alighting and boarding passengers walk between train doors and platform.
- **Audio mixer** — independent engine, announcement and music levels; PA voice and tourist commentary toggles; PA language selector.
- **PA-first doors** — doors wait for the current announcement to finish; manual presses queue.
- **Bundled Thai PA** — 145 Kanya-voice clips for next station, arrival, welcome and doors closing; English uses system TTS.
- **Station information card** — zone, interchange, nearby landmark, Google Maps link and Jump Train Here.
- **Camera 3 default** — the free orbit camera starts active; press 1 for the driver cab.
- **Mobile layout** — minimised telemetry, reflowed control dock and touch orbit at 390 × 844 with no horizontal overflow.
- **Built-in self-test** — `?selftest=1`, 36/36 PASS.

### Landmarks

Chatuchak Park & Market, Victory Monument, Siam Skywalk, Terminal 21 and the ASOK MRT entrance, Benchasiri Park, the Erawan Museum three-headed elephant, Khu Khot Depot, Kheha Terminus, Wat Phra Sri Mahathat, Phaya Thai ARL, Samrong Yellow Line, Kasetsart University, Thong Lo neon, Pak Nam delta and the Gulf coast.

## Verification

- **36/36** self-tests pass in headless Chrome (`?selftest=1`).
- Checks include the Three.js renderer, 47 stations and unique codes, four zones, route survey, station positions, four-car train, 24+ door panels, 47 signal heads, 1,000+ procedural buildings, glass towers, third rail, four landmarks, 47-row station list, minimap, Web Audio engine, four cameras, Thai/English switching, station jump, auto pilot, doors, platform camera, rain system, passenger exchange pool, audio mixer methods and zero uncaught errors.
- Screenshots captured at **1600 × 1000** desktop and **390 × 844** mobile from the running build with headless Chrome and SwiftShader WebGL.
- Live URLs are expected to return HTTP 200 for HTML, CSS, JS, screenshots and favicon after the GitHub Pages deployment.

## Files

| File | Size |
| --- | ---: |
| `index.html` | 22,325 bytes · 420 lines |
| `style.css` | 59,121 bytes · 2,196 lines |
| `script.js` | 215,196 bytes · 4,972 lines |
| `README.md` | 18,910 bytes · 373 lines |
| `audio/th/` | 145 files · 5.0 MB |
| `screenshot.png` | 1.34 MB |
| `screenshot-night.png` | 1.34 MB |
| `screenshot-cab.png` | 1.28 MB |
| `screenshot-platform.png` | 1.43 MB |
| `screenshot-zone-a.png` | 1.27 MB |
| `screenshot-erawan.png` | 1.29 MB |
| `screenshot-dusk.png` | 1.36 MB |
| `screenshot-intro.png` | 936 KB |
| `screenshot-mobile.png` | 1.04 MB |

## How to run

```bash
cd bts-sukhumvit-line-3d
python3 -m http.server 8080
# open http://localhost:8080
```

Or use the live demo: <https://somphol.github.io/bts-sukhumvit-line-3d/>

## Credits

Built with **OpenCode 2.2.5** and **DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`) in a single agent session. The game code, procedural city, 47 stations, train mesh, kinematics, bilingual HUD, minimap, audio synthesis, documentation and verification harness were generated for this project.

Runtime libraries: [Three.js](https://threejs.org/) r128 (MIT) and [OrbitControls](https://threejs.org/) (MIT). Typefaces: **Orbitron**, **Rajdhani** and **Noto Sans Thai** from Google Fonts (SIL OFL 1.1). Thai PA clips were generated locally with macOS **Kanya**; English PA uses the system voice. No third-party image, texture, 3D-model or music assets were used. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
