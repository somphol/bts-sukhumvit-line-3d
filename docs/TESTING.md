# Testing

This page separates **what was actually executed** from **what was reasoned from source** and **what remains unverified**. Nothing below is a claim about a browser or device that was not used.

## What was run

All runs were on 2026-11-02, macOS, Node 26.13.0, Chrome 156 headless (`--headless=new`, `--enable-unsafe-swiftshader`, `--use-angle=swiftshader`), serving the repository with `python3 -m http.server`.

| Check | Command / method | Result |
| --- | --- | --- |
| JS syntax | `node --check script.js` | exit 0, no output |
| Release checks | `node scripts/check.mjs` | `OK 62 checks`, exit 0 |
| Desktop self-test | `?selftest=1&autostart=1&view=3` at 1600×1000 | **36/36 PASS**, 0 entries in `window.__BTS_ERRORS`, badge `v1.4.7` |
| Mobile self-test | CDP `Emulation.setDeviceMetricsOverride` 390×844, DPR 2, mobile | **36/36 PASS**, `scrollWidth === innerWidth === 390`, `body.telemetry-min`, 0 errors |
| URL parameters | navigate `?autostart=1&station=E17&tod=night&rain=1&view=1` | state `E17`, `night`, `rain: true`, `view: 1`; body `is-raining view-1` |
| Audio persistence | set `#engineVol` to 42, dispatch `input`, read `localStorage` | `bts_audio_v1` = `{"engine":0.42,"pa":1,"voice":true,"tourist":true,"music":0.18,"musicEnabled":true,"paLang":"both"}` |
| Persistence after reload | `Page.reload`, wait for boot, read `state.engineVolume` | `0.42` |
| Live deployment | `curl` against `https://somphol.github.io/bts-sukhumvit-line-3d/` | HTML `200`, `script.js` `200` (215,871 bytes); `server: GitHub.com`, `cache-control: max-age=600` |
| Live audio asset | `curl` `audio/th/arr-CEN.m4a` (checked during the build session) | `200`, `audio/mp4a-latm` |

### Desktop self-test method

The harness is part of the app, not a separate file. Serve the repo and open:

```text
http://localhost:8080/?selftest=1&autostart=1&view=3
```

`runSelfTests()` runs after `finishBoot()` (900 ms delay), writes the overlay `#selftestOut`, and sets:

```js
document.body.dataset.selftest        // "pass"
document.body.dataset.selftestSummary // "36/36"
window.__BTS_TEST__                   // { passed, total, results }
```

A CDP check can read it without screenshots. Node 22+ has a global `WebSocket`:

```js
// node check-live.mjs — with Chrome on --remote-debugging-port=9250
const pages = await (await fetch('http://127.0.0.1:9250/json/list')).json()
const page = pages.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
const send = (method, params = {}) => new Promise((resolve) => {
  const n = ++id
  pending.set(n, resolve)
  ws.send(JSON.stringify({ id: n, method, params }))
})
await new Promise((r) => setTimeout(r, 12000))
const out = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    test: window.__BTS_TEST__ && { p: window.__BTS_TEST__.passed, t: window.__BTS_TEST__.total },
    summary: document.body.dataset.selftestSummary,
    errors: (window.__BTS_ERRORS || []).length
  })`,
  returnByValue: true
})
console.log(out.result.result.value)
ws.close()
```

Expected: `{"test":{"p":36,"t":36},"summary":"36/36","errors":0}`.

### Mobile method

Reuse the same page and apply metrics before reload:

```js
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true
})
await send('Page.enable')
await send('Page.reload', { ignoreCache: true })
// wait, then evaluate:
// innerWidth, documentElement.scrollWidth, body.classList.contains('telemetry-min'),
// document.body.dataset.selftestSummary
```

Expected on the selftest URL: width 390, scrollWidth 390, telemetry-min true, 36/36.

## What was reasoned from source, not executed

- **PA-first door ordering** is implemented through `state.speechBusy` and `state.pendingDoorAction`; the self-test opens/closes doors at a platform but does not assert the queue under a real announcement.
- **Terminus reversal** is implemented in `autoDrive` / `reverseDirection`; only the button/state path is covered indirectly. A full N24→E23→N24 run was not completed.
- **All 47 stations** are asserted by count and positions; each platform's visual quality was not individually reviewed in this session.
- **All 145 Thai clips** exist with the expected names and one clip was fetched over HTTP; every clip's audio content and duration were not audited.
- **CDN failure** displays `showBootError`, but the failure path was not exercised by blocking jsDelivr.
- **`file://`** was not tested. The recommended path is an HTTP server.
- **Performance** on integrated GPUs, low-end phones and 4K displays was not measured. The design caps DPR at 1.5 and uses instancing, but no FPS benchmark is shipped.

## Manual test matrix

Use this for a human pass. "Automated" means covered by the table above; "manual" means a person must look/listen.

| Area | Action | Expected | Status |
| --- | --- | --- | --- |
| Intro | Load `/` | Loading bar completes; intro shows 47/4/4/3rd stats; orbit scene idles | manual |
| Start N24 | Click **START AT KHU KHOT** | Train at Khu Khot, auto pilot active, announcement plays, camera 3 | manual |
| Start E23 | Click **START AT KHEHA** | Train at Kheha, direction north, auto pilot active | manual |
| Auto pilot | Leave it running for 3 stops | Stops on the mark, opens doors after PA, dwells ~16 s, closes after PA, departs | manual |
| Manual takeover | Move throttle / press `A` / **TAKE MANUAL** | Auto chip switches to MANUAL; throttle responds; no auto braking | manual |
| Brakes | `S`, then `E` | Service brake slows; emergency stops quickly and holds | manual |
| Doors | `D` at a platform; `D` while moving | Opens/closes at platform; refuses with a warning while moving | manual |
| Interlock | Open doors, raise throttle | Train will not move until doors are shut | manual |
| Camera 1 | Press `1`, drag | Cab view, windshield frame, speed/FOV widen with speed, look-around | manual |
| Camera 2 | Press `2` | Second-car window, Bangkok rolls past | manual |
| Camera 3 | Press `3`, drag/zoom | Orbit follows train; cannot go below ground or inside the train | manual |
| Camera 4 | Press `4` | Platform camera looks down the track; ETA and station name update | manual |
| Language | `L` / TH button | HUD, station list, toasts, modal and PA labels switch EN ⇄ TH; Thai detail line stays visible | manual |
| Station list | Click a station | Train jumps, speed resets, doors close, HUD updates | manual |
| Station card | Click ⓘ in NEXT STATION | Card names the **next** station; Maps query matches; Jump works | manual |
| Time of day | Cycle sun button | Day → golden hour → night; windows, neon and stars change | manual |
| Rain | `K` / cloud button | 900 streaks, screen rain, faster wipers, lightning + thunder, rain audio | manual |
| Mixer | Open 🎚, move sliders, change PA language, toggle voice/tourist/music | Levels apply live; settings survive reload | partially automated (persistence); audio manual |
| PA | Start, listen to next/arrival at an interchange | Thai clip first, then English; station, interchange, landmark, door side | manual |
| Horn | `H` | Two-tone horn | manual |
| Fullscreen | `F` | Enters/exits fullscreen | manual |
| Help | `?` | Modal opens; version label reads v1.4.7 | manual |
| Mobile 390×844 | Load, expand telemetry, drag orbit | No horizontal scroll; dock reflows; touch orbit works | layout automated, touch manual |
| Reduced motion | Enable OS reduce-motion | CSS `prefers-reduced-motion` reduces transitions; 3D motion is not disabled | not verified |
| Reload | Refresh mid-run | Restarts at intro/URL station; audio settings retained | automated for audio only |
| Offline after load | Disconnect network and play | Cached CDN/fonts may work; no service worker guarantee | not verified |
| Safari / Firefox | Full pass | Expected standard WebGL/Canvas/Web Audio; not tested | not verified |
| Screen reader | Navigate HUD | ARIA labels exist on major controls; not audited | not verified |

## Known gaps and defects

- **Audible audio is unverified.** All automated checks are silent. The mix, Thai pronunciation, chime loudness and speech-voice availability need a human with sound.
- **The self-test is not a test runner.** It asserts 36 scene/DOM facts and one error-array check. It does not simulate a full journey, timetable, or every door/PA interleaving.
- **Browser coverage is Chrome-only.** Safari and Firefox may differ in WebGL precision, `speechSynthesis` voice lists, `Audio` autoplay and `localStorage` on `file://`.
- **Three missing i18n keys.** `updateHUD` calls `t('clear')`, `t('approach')` and `t('atPlatform')`; none exist in `I18N.en`/`I18N.th`, so the signal chip and platform ETA can display the raw key. This is a real UI defect, not a test gap.
- **README says "33-check harness".** `runSelfTests` contains 36 `check(...)` calls; the README query-parameter table is stale. Trust the overlay and `window.__BTS_TEST__`.
- **In-app credits say "No image, audio or model assets"** while 145 Thai PA clips ship. README and `THIRD_PARTY_NOTICES.md` are correct; the in-app line is inaccurate.
- **`STATION_STOP_TOLERANCE` is unused.** Arrival logic uses its own distance thresholds.
- **The city is non-deterministic.** Two loads are not pixel-identical, so screenshot comparison is not a valid regression test.
- **`scripts/check.mjs` is static.** It does not launch a browser, fetch CDNs, or validate the 145 audio files. The browser self-test remains the interaction gate.
- **No CI workflow is shipped.** Run the two commands locally or add a workflow before accepting external contributions.
- **Thai copy has not had a professional proofread.** Station names and PA scripts were supplied/reviewed during the build but should be checked before a marketing push.
