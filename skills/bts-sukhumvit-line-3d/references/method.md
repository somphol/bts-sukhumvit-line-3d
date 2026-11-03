# Method

The build method behind the reference implementation. Read [../SKILL.md](../SKILL.md) first for scope and the short workflow; this file is the deeper recipe book.

## 1. Order of construction

The scene must exist in dependency order. Building the train before the route works, but it cannot be placed, and the camera cannot frame it.

```text
data → renderer → curve → ground/viaduct → city → stations → landmarks
     → train → rain/passengers → HUD → audio → input → self-test
```

In the reference, `boot()` awaits one animation frame between heavy steps so the loading bar paints and the browser does not block for the whole build. Keep that pattern: `setLoading(pct, copy); await nextFrame(); build...`.

## 2. Coordinate and route invariants

- `WORLD_PER_M = 0.25` is the only bridge between displayed metres and world units.
- `TRACK_Y = 5.2` is the rail deck. Trains sit at `TRACK_Y + 0.02`; platforms sit at `TRACK_Y + 0.17`; the tactile strip at `+0.275`.
- The route is a 39-point `CatmullRomCurve3` in XZ with tension `0.36`. It is open, not closed.
- Station chainages are **derived** from zone weights, not stored per station:

```text
baseGap = { A: 1.22, B: 0.96, C: 0.82, D: 1.22 }
weight[i]    = baseGap[zone] * (0.88 + ((i * 7) % 5) * 0.055)
cumulative[0] = 0
cumulative[i] = cumulative[i - 1] + weight[i]
usable       = displayTotal - 160
chainage[i]  = 80 + (cumulative[i] / cumulative[46]) * usable
u[i]         = clamp(chainage[i] * 0.25 / routeLengthWorld, 0, 1)
```

- `stationNormal(i) = (tangent.z, 0, -tangent.x)` is the left/right axis used by platforms, landmarks, billboards, traffic and the platform camera.
- `stationPoint(i, offset, along)` composes the tangent and normal; use it instead of hand-computing offsets.

**Why this matters:** if you sample stations with `i / 46`, the northern and southern suburbs become as tight as the Sukhumvit corridor. The line still looks plausible but loses its rhythm, and the platform camera/distances start disagreeing.

## 3. Curve-relative scenery

### Ribbons

`makeRibbon(width, y, color, opacity, offset)` walks 700 segments, computes point + tangent + normal, and emits two vertices per segment. Use it for roads, footways, the deck, the track bed, wall stripes and the under-viaduct shade. Overlapping ribbons must have **distinct heights**; the reference stack is:

```text
ground -0.4 · water -0.2 · coast -0.1 · road underlay 0.12
sidewalk 0.16 · road 0.28 · shade 0.34 · deck 5.2
platform 5.37 · tactile 5.475
```

Polygon offsets reinforce the heights but are not a substitute for separation.

### Building clearance

`buildCity` rejects a candidate when:

```text
routeDistanceSq(x, z) < (13 + max(w, d) * 0.7)^2
```

`routeDistanceSq` samples every second point of 900 route samples, so clearance is cheap. The 13 m base keeps buildings out of the road/viaduct corridor; the size term stops a wide tower corner from clipping the deck. Do not reduce it to increase density — add a second, farther band instead.

### Instancing

Buildings, roofs, antennas, glass, curbs, walls, piers, sleepers and third-rail covers are `InstancedMesh` buckets. Keep the per-instance matrix and colour work in the generation pass; the frame loop should only touch the train, traffic, rain, pedestrians, cameras, HUD and minimap.

## 4. Train and motion

- Four cars, `CAR_LEN = 5.2`, `CAR_GAP = 0.55`, `CAR_PITCH = 5.75`.
- `updateTrainTransform` samples the curve at `base = distance * 0.25`, then car `c` at `base - direction * c * 5.75`, clamped to `[0.01, routeLengthWorld - 0.01]`.
- Each car is oriented with `quaternion.setFromUnitVectors(FORWARD_Z, tangent)`. The tangent is multiplied by `state.direction` so the train faces the travel direction.
- The destination texture swaps with direction (`E23 KHEHA` / `N24 KHU KHOT`).
- Doors are not skinned meshes: each leaf is a separate mesh in `doorPanels`, translated by `doorAnim`. The opening amount is also the interlock signal.

### Manual

```text
emergency: speed -= 11.5 * dt
brake:     speed -= 5.2 * dt
doors open / doorAnim > 0.04: speed -= 5.2 * dt
speed < throttle: speed += 4.2 * dt (capped at throttle)
speed > throttle: speed -= 0.85 * dt
clamp 0..100
```

### Auto

```text
if doors open:
  speed = 0
  dwell -= dt; when <= 0 → closeDoors(true)
if closing and doorAnim < 0.03:
  leave station; reverse at terminus
if at station and speed < 0.4 and not speaking:
  openDoors(true); dwell = 16
target:
  dist < 15  → max(2.2, dist * 0.8)
  else       → min(80, sqrt(2 * 1.2 * max(0, dist - 12)) * 3.6), floor 3
arrive when dist < 5 and speed < 2.8
```

The 12 m buffer is the braking margin; the 5 m window catches the stop. Two safety snaps in `updateKinematics` handle the case where the train creeps a few centimetres past the chainage before the next-index update:

```text
auto && !atStation && speed < 3.2 && distanceTo(next) < 6  → arrive
speed < 0.45 && distanceTo(next) < 1.5                    → arrive
```

Without them, the index flips, the auto pilot sees a new target and accelerates away from the platform. This was a real bug; see [lessons.md](lessons.md).

## 5. Doors and PA ordering

The door state machine and the speech queue are one system:

```text
state.speechBusy          true while Thai/English PA is playing
state.pendingDoorAction   'open' | 'close' | null
state.doorsClosingPending true after the stand-clear announcement starts
autoState                 idle | run | dwell | closing | closingAnnounce
```

Rules:

1. `openDoors` refuses if speed > 0.5 or not within 26 m / 1.2 km/h.
2. If `speechBusy`, the requested open/close is stored in `pendingDoorAction` and a toast explains the wait.
3. `closeDoors` plays `doors-close` (Thai clip + English), then performs the close.
4. The auto pilot does not start dwell until speech is idle, and does not depart until door leaves are nearly shut.

**Do not** "fix" a slow door by cancelling speech. The PA is the product; the door is downstream.

## 6. Cameras

`setView(1..4)` sets `body.view-N`; CSS decides which overlay is visible. `controls.enabled` is true only for view 3.

| View | Position | Look | FOV |
| --- | --- | --- | --- |
| Cab | lead + forward 2.12 + up 1.92; bob `sin(time*7.2)*0.014*speedFactor` and lateral `sin(time*3.4)*0.012*speedFactor` | 100 forward, −0.18 down | `62 + speed * 0.16` |
| Window | car 2 + right 1.17 + up 1.62 + forward 0.9 | right 30, forward 72, up 9 | 58 |
| Orbit | lead + up 1.4 target; camera follows target delta; distance 8–220 | controls target | 58 |
| Platform | next station + normal 4.6 + tangent ±12; up 3.2 above deck | lead + up 1.25 | `clamp(66 - dist*0.018, 40, 66)` |

All positional lerps use `1 - exp(-k * dt)`. Copy that; a fixed `lerp(a, b, 0.1)` behaves differently at 30 and 120 fps.

Drag look is applied after `camera.lookAt` with `camera.rotateY(state.cabYaw)` and `camera.rotateX(state.cabPitch)`; pointer deltas accumulate in `state.cabYaw/cabPitch`. Reset them in `setView(1|2)`.

## 7. HUD and language

- Static text uses `data-i18n`; `setLanguage` walks `[data-i18n]` and writes `textContent`.
- Dynamic text uses `t(key)` and `fill(template, vars)`.
- Station/zone/landmark data is bilingual in the data table; do not concatenate Thai into English strings.
- The announcement banner keeps a separate Thai line (`#announceDetailTh`) regardless of UI language, mirroring the real two-language PA.
- HUD refresh is deliberately 10 Hz; the speed ring and chips do not need 60 Hz DOM writes. The minimap is ~4.5 Hz.
- The station list scrolls only when the focus station changes (`state.lastStationList`), otherwise it fights the user.
- There is **no automatic EN/TH parity check** in the reference. If you add a key, add it to both dictionaries and verify the rendered string. Three missing keys are a known defect (`clear`, `approach`, `atPlatform`).

## 8. Audio graph

```text
engineBus (engineVolume) ─┐
paGain    (paVolume)      ├→ master (0.75) → compressor → destination
musicGain (musicVolume)   │
rainGain  (0 or 0.034)    ┘
```

- Motor: sine 180 + triangle 360 → bandpass 620 (Q 0.55); `setSpeed` shifts both oscillators and the filter.
- Whine: 900 Hz sine, low gain, `820 + kmh*6.8`.
- Brake: looped noise → bandpass 1900 → gain only above 4 km/h while braking.
- Joint thud: lowpass 150 noise burst every 13 display metres.
- Chimes: PA C5/E5/G5; door E5/A5.
- Horn: two sawtooths 311/370 through lowpass 1000.
- Music: 16-step pentatonic patterns A/B, 620 ms step, octave and pad.
- Rain: highpass 700 → lowpass 5200; thunder: lowpass 180 noise burst.

The engine is intentionally quiet (0.15 default) and the PA is the priority. If you add a sound, route it through a bus, not directly to the destination, or the mixer will not control it.

## 9. Time of day, storm and rain

`setTimeOfDay(mode)` applies one preset to sky shader uniforms, fog colour/near/far, hemisphere/sun/ambient intensity, tone-mapping exposure, building/glass emissive, billboards, headlights, sun sprite and stars. If rain is active, `applyStormLighting()` runs afterwards and overrides the sky/fog/exposure.

| Preset | Fog near/far | Exposure | Building | Glass | Neon | Headlight |
| --- | --- | --- | --- | --- | --- | --- |
| day | 380 / 2700 | 0.76 | 0.055 | 0.12 | 0.82 | 0.9 |
| dusk | 150 / 1350 | 0.78 | 0.5 | 0.48 | 1.25 | 2.0 |
| night | 110 / 1100 | 0.72 | 0.92 | 0.62 | 1.45 | 3.2 |
| storm | 90 / 980 | 0.76 | 0.16 (day) / 0.65 (night) | 0.22 / 0.4 | 0.85 / 1.3 | 2.4 |

The sky bottom colour must equal the fog colour, or the horizon shows a seam. The sky dome is 14,000 units, well beyond the ground plane.

Rain is 900 line segments in a ±105 box. `updateRain` falls them, respawns above 58–84, follows the lead car and schedules lightning every 8–18 s (first 4–10 s). CSS supplies the screen-space rain, wet glass, wipers and lightning flash; JS only toggles `is-raining` and the overlay class.

## 10. Persistence

Only audio settings are stored:

```text
localStorage["bts_audio_v1"]
{ engine, pa, voice, tourist, music, musicEnabled, paLang }
```

`loadAudioSettings()` runs during `initAudio()`; every mixer input calls `saveAudioSettings()`. Both are wrapped in try/catch. Do not add journey state under this key; if you add a save system, use a new versioned key and a migration path.

## 11. Performance

- Cap DPR at 1.5; do not render at 3× on a phone.
- Use instancing for repeated scenery. The reference has thousands of buildings but a small draw-call count.
- No shadow maps. Lighting is hemisphere + ambient + two directionals; the look comes from emissive maps and tone mapping.
- Keep `logarithmicDepthBuffer` for the 24,000-unit far plane. It costs a little fragment work but removes z-fighting at distance.
- Do not update DOM text every frame. 10 Hz is enough for telemetry.
- The self-test and HUD share `state.time`; do not add an independent second clock.

## 12. Determinism

The city, trees, traffic, stars, rain, passenger phases and some billboard content use `Math.random()` with no seed. This is intentional: each load is a different Bangkok. Consequences:

- Screenshots are not frame-reproducible.
- A visual regression test cannot compare pixels across loads.
- If you need reproducibility, add a seeded PRNG and thread it through every `rand`, `randInt` and `pick` call — a large change; update screenshots and docs.

## 13. Documentation and release

Each release carries:

```text
README.md             human entry point
AGENTS.md             six-section handoff
LICENSE               MIT
THIRD_PARTY_NOTICES.md
STATE.md / state.json build record (historical)
docs/ARCHITECTURE.md
docs/REPRODUCTION.md
docs/TESTING.md
docs/DEPLOYMENT.md
scripts/check.mjs
skills/<name>/        this skill
```

`state.json` records the session, wall-clock duration, token usage and deployment. It is a snapshot, not runtime data.

## 14. Verifying a rebuild

1. `node --check script.js`.
2. `node scripts/check.mjs` → `OK 62 checks`.
3. Serve and open `?selftest=1&autostart=1&view=3` → 36/36.
4. Emulate 390×844 → 36/36, no horizontal overflow, telemetry minimised.
5. Check a URL parameter set, a station jump, a full auto stop (PA → doors → dwell → close → depart), and audio persistence.
6. Only then claim a release. See [verification.md](verification.md).
