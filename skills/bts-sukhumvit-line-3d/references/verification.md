# Verification

The reference release was verified on 2026-11-02 with Node 26.13.0 and Chrome 156 headless (`--headless=new`, SwiftShader). This page gives the exact checks, the expected output, and the parts that remain manual.

## 1. Static checks

From the project root:

```bash
node --check script.js
```

Expected: no output, exit 0.

```bash
node scripts/check.mjs
```

Expected:

```text
OK 62 checks
```

and exit 0. On failure it prints one `FAIL ...` line per problem and exits 1. The release checker covers:

- required files: three sources, README, AGENTS, LICENSE, notices, `.nojekyll`, the four `docs/` guides, `scripts/check.mjs`, skill manifest/attribution/references and the three template files;
- each local `src`/`href` in `index.html` resolves (queries stripped; `http(s)`, `data:`, `#`, `mailto:` ignored);
- relative Markdown links/images in README, AGENTS, `docs/` and the skill resolve;
- `node --check` runs for every `.js` file;
- every `.json` file parses;
- the three skill template files are byte-identical to the release sources.

`scripts/check.mjs` lives in the release repository, not in `assets/template/`. A new project should copy it and adapt the required-file list, or keep the same doc/skill layout.

## 2. Browser self-test

Serve over HTTP:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/?selftest=1&autostart=1&view=3
```

Expected DOM:

```js
document.body.dataset.selftest        // "pass"
document.body.dataset.selftestSummary // "36/36"
document.querySelector('#selftestOut').textContent
// starts with:
// BTS SUKHUMVIT LINE 3D — SELF TEST
// 36/36 PASS
// ...
window.__BTS_TEST__.passed === 36
window.__BTS_TEST__.total === 36
window.__BTS_ERRORS.length === 0
```

The 36 checks, grouped:

| Group | Count | Examples |
| --- | ---: | --- |
| Runtime | 3 | Three.js r128, WebGL renderer, populated scene |
| Route and stations | 6 | 47 rows, unique codes, N24/E23 termini, four zones, curve length, 47 positions |
| Scene | 10 | Four cars, ≥ 24 door panels, 47 signals, > 1,000 buildings, glass instancing, third rail, four landmarks |
| HUD and systems | 6 | 47-row list, minimap context, Web Audio methods, four views, rain buffer, 28-passenger pool |
| Interaction | 10 | TH/EN switch, Siam jump, speed reset, auto on/off, doors open/close, platform camera |
| Error guard | 1 | `window.__BTS_ERRORS` empty |

A failure is printed in the overlay and leaves `body.dataset.selftest === "fail"`. Do not ship with a failure; the most common causes are a changed station count, a missing named object (`ThirdRail`, `VictoryMonument`, `SiamSkywalk`, `Terminal21`, `ErawanMuseum`) or a CDN that did not load Three.js.

## 3. Headless CDP check

Start Chrome with a throwaway profile and a debug port:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --no-first-run --no-default-browser-check \
  --enable-unsafe-swiftshader --use-angle=swiftshader \
  --user-data-dir="$(mktemp -d)" --window-size=1600,1000 \
  --remote-debugging-port=9250 \
  "http://127.0.0.1:8080/?selftest=1&autostart=1&view=3" &
```

Then, in Node 22+ (global `WebSocket`):

```js
// check-live.mjs
const pages = await (await fetch('http://127.0.0.1:9250/json/list')).json()
const page = pages.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
}
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
const send = (method, params = {}) => new Promise((resolve) => {
  const n = ++id
  pending.set(n, resolve)
  ws.send(JSON.stringify({ id: n, method, params }))
})
await new Promise((r) => setTimeout(r, 12000))
const result = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    summary: document.body.dataset.selftestSummary,
    badge: document.querySelector('#buildBadge')?.textContent,
    errors: (window.__BTS_ERRORS || []).length,
    test: window.__BTS_TEST__ && { p: window.__BTS_TEST__.passed, t: window.__BTS_TEST__.total }
  })`,
  returnByValue: true
})
console.log(result.result.result.value)
ws.close()
```

Expected:

```json
{"summary":"36/36","badge":"v1.4.7","errors":0,"test":{"p":36,"t":36}}
```

The harness starts 900 ms after `finishBoot`, so wait at least 10–12 s on a cold load. If you poll too early, `window.__BTS_TEST__` may still be `undefined`.

## 4. Mobile check

Use the same CDP connection before reload:

```js
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true
})
await send('Page.enable')
await send('Page.reload', { ignoreCache: true })
// wait ~15 s, then evaluate:
({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  telemetryMin: document.body.classList.contains('telemetry-min'),
  summary: document.body.dataset.selftestSummary,
  errors: (window.__BTS_ERRORS || []).length
})
```

Expected: `innerWidth 390`, `scrollWidth 390`, `telemetryMin true`, `summary "36/36"`, `errors 0`.

## 5. URL parameters

Navigate to each and inspect `window.__BTS__.state`:

```text
?autostart=1&view=3
?autostart=1&view=1
?autostart=1&station=E17&tod=night&rain=1&view=1
?autostart=1&station=N24&tod=dusk&view=4
```

Expected: `view` matches, `tod` is `day|dusk|night`, `rain` is true only with `rain=1`, `currentIndex` maps to the requested station code. Without `autostart`, the intro remains visible and the orbit camera idles with `autoRotate`.

`?selftest=1` implies autostart. `?auto=1` applies only when autostart is active and the self-test is not running; `startSimulation` turns auto pilot on anyway.

## 6. Persistence check

With the app loaded, in the console or CDP:

```js
const el = document.querySelector('#engineVol')
el.value = '42'
el.dispatchEvent(new Event('input', { bubbles: true }))
JSON.parse(localStorage.getItem('bts_audio_v1'))
// { engine: 0.42, pa: 1, voice: true, tourist: true,
//   music: 0.18, musicEnabled: true, paLang: 'both' }
```

Reload and read `window.__BTS__.state.engineVolume`; it should be `0.42`. Repeat for the PA slider, music slider, PA language select and the three toggles.

## 7. Manual checks that automation cannot cover

- **Audible audio:** PA intelligibility, Thai pronunciation, engine/PA balance, chime loudness, thunder.
- **PA-first doors:** listen for the full announcement before the leaves move; press `D` during speech and confirm the queued toast and delayed action.
- **Auto pilot over a full inter-station run:** stop on the mark, doors after PA, 16 s dwell, close after stand-clear, depart, and reverse at a terminus.
- **Camera feel:** cab framing, wipers, drag look, orbit limits, platform framing as the train arrives.
- **Visual depth:** the canopy-post/road patch at On Nut (E9) from multiple angles, stationary and departing.
- **Browsers and devices:** Safari, Firefox, a real iPhone/Android, low-end GPU frame rate.
- **`file://`:** not verified; use HTTP.
- **Reduced motion:** the CSS rule exists; 3D motion is not disabled.

## 8. Known false confidence traps

- A silent headless run does **not** prove audio works. It proves the graph and state machine exist.
- A passing static checker does **not** prove the scene renders. It proves files, syntax and links.
- A single screenshot does **not** prove the city is correct; the city is non-deterministic.
- `?selftest=1` without autostart still runs the harness, but the camera/intro state differs; use both parameters when comparing.
- The README's "33-check" line is stale. The source has 36 `check(...)` calls and the overlay is authoritative.
- The in-app credits line says "No image, audio or model assets"; 145 Thai clips ship. Trust the filesystem, not that string.

## 9. Release gate

```bash
node --check script.js
node scripts/check.mjs
# browser: 36/36 at 1600x1000 and 390x844
# manual: one full auto stop + one manual takeover + PA-first door queue
git status --short
git add -A
git commit -m "docs: add release documentation, reproduction book and skill"
git push origin main
```

Then confirm the live page, `script.js`, a screenshot and a sample audio clip all return 200, and the badge on the live page matches the release.
