# Build State

| Field | Value |
| --- | --- |
| Project | BTS Sukhumvit Line 3D — Authentic Bangkok City & Driver Simulator (`bts-sukhumvit-line-3d`) |
| Session started | 2026-11-01 23:07:53 UTC |
| Build started | 2026-11-01 23:14:10 UTC |
| Packaged | 2026-11-02 00:14:16 UTC |
| Build duration | **1h 0m 6s** (3,606 seconds) |
| Full session duration | **1h 6m 23s** (3,983 seconds) |
| Harness | OpenCode 2.2.5 |
| Model | DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) |
| Session | `ses_e66a17139ffeXGq2zj84mZEePL` |
| Repository | <https://github.com/somphol/bts-sukhumvit-line-3d> |
| Live demo | <https://somphol.github.io/bts-sukhumvit-line-3d/> |

## Token usage

| Metric | Tokens |
| --- | ---: |
| Input | 113,899 |
| Output | 125,635 |
| Reasoning | 138,511 |
| **Total (input + output + reasoning)** | **378,045** |
| Cache read | 45,803,648 |
| Cache write | 1,467 |
| Total including cache | 46,183,160 |

> Snapshot from the OpenCode session record at 2026-11-02 00:14:16 UTC. Total cost reported by the session: **$0.00**. The final state-file commit, GitHub push, Pages deployment and closing response happen after this snapshot, so the live session totals will be marginally higher. Cache reads/writes are context-usage figures and are reported separately from the input/output/reasoning total.

## What was built

A complete, self-contained 3D Bangkok Skytrain simulator in three modular source files plus documentation, screenshots and community files.

### Core requirements

- **47 operational stations** — Khu Khot (N24) to Kheha (E23), with real station codes, English and Thai names, zone assignments and interchanges. N6 Sena Ruam is intentionally omitted because it is an unopened infill station.
- **Four city zones** — northern suburbs, central commercial core, Sukhumvit lifestyle corridor and the southern industrial/coastal delta, with zone-aware building density, height, palette, glass ratio, trees and landmarks.
- **Elevated third-rail railway** — continuous viaduct, deck, parapets, concrete piers, ballastless track bed, running rails, glowing third rail, track-side signals and 47 side-platform stations with canopies, name boards, benches, lamps, lifts and waiting passengers.
- **Four-car BTS train** — white bodywork, green waistline, gold pinstripe, BTS roundels, dark window band, sliding doors with interior openings and door lights, interior seats and poles, bogies, wheels, current-collector shoes, headlights, tail lights and destination displays.
- **Driver controls** — throttle 0–80 km/h, service brake, emergency brake, auto pilot, doors, horn, Next Stop and terminus reversal.
- **Auto pilot** — accelerates, brakes into every platform, opens and closes the doors, dwells six seconds, departs and reverses at either terminus.
- **Four cameras** — first-person driver cab with cockpit overlay and drag-to-look, passenger scenic window, 360° orbit camera and fixed platform arrival cam.
- **Bilingual EN/TH HUD** — station names, zone descriptions, controls, toasts and announcements; live speed, distance, ETA, zone, interchange chips, nearby landmark, route progress, minimap and a clickable 47-station list.
- **Web Audio synthesis** — variable-pitch motor hum, inverter whine, track-joint thuds, door chime, PA chime, two-tone horn, brake squeal and city ambience.
- **Day / golden hour / night** — lit windows, neon signs, stars, headlights and a darker HUD at night.
- **Mobile layout** — minimised telemetry, reflowed control dock and touch orbit at 390 × 844 with no horizontal overflow.
- **Built-in self-test** — `?selftest=1`, 33/33 PASS.

### Landmarks

Chatuchak Park & Market, Victory Monument, Siam Skywalk, Terminal 21 and the ASOK MRT entrance, Benchasiri Park, the Erawan Museum three-headed elephant, Khu Khot Depot, Kheha Terminus, Wat Phra Sri Mahathat, Phaya Thai ARL, Samrong Yellow Line, Kasetsart University, Thong Lo neon, Pak Nam delta and the Gulf coast.

## Verification

- **33/33** self-tests pass in headless Chrome (`?selftest=1`).
- Checks include the Three.js renderer, 47 stations and unique codes, four zones, route survey, station positions, four-car train, 24+ door panels, 47 signal heads, 1,000+ procedural buildings, glass towers, third rail, four landmarks, 47-row station list, minimap, Web Audio engine, four cameras, Thai/English switching, station jump, auto pilot, doors, platform camera and zero uncaught errors.
- Screenshots captured at **1600 × 1000** desktop and **390 × 844** mobile from the running build with headless Chrome and SwiftShader WebGL.
- Live URLs are expected to return HTTP 200 for HTML, CSS, JS, screenshots and favicon after the GitHub Pages deployment.

## Files

| File | Size |
| --- | ---: |
| `index.html` | 16,939 bytes · 326 lines |
| `style.css` | 50,685 bytes · 1,839 lines |
| `script.js` | 164,979 bytes · 3,913 lines |
| `README.md` | 16,084 bytes · 343 lines |
| `screenshot.png` | 1.19 MB |
| `screenshot-night.png` | 1.19 MB |
| `screenshot-cab.png` | 1.06 MB |
| `screenshot-platform.png` | 1.33 MB |
| `screenshot-zone-a.png` | 1.11 MB |
| `screenshot-erawan.png` | 1.14 MB |
| `screenshot-dusk.png` | 1.16 MB |
| `screenshot-intro.png` | 819 KB |
| `screenshot-mobile.png` | 1.01 MB |

## How to run

```bash
cd bts-sukhumvit-line-3d
python3 -m http.server 8080
# open http://localhost:8080
```

Or use the live demo: <https://somphol.github.io/bts-sukhumvit-line-3d/>

## Credits

Built with **OpenCode 2.2.5** and **DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`) in a single agent session. The game code, procedural city, 47 stations, train mesh, kinematics, bilingual HUD, minimap, audio synthesis, documentation and verification harness were generated for this project.

Runtime libraries: [Three.js](https://threejs.org/) r128 (MIT) and [OrbitControls](https://threejs.org/) (MIT). Typefaces: **Orbitron**, **Rajdhani** and **Noto Sans Thai** from Google Fonts (SIL OFL 1.1). No image, texture, audio or 3D-model assets were used. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
