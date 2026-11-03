# Lessons

Bugs and dead ends from the real build, with the regression guard for each. The common thread: this app fails visually and audibly, not with exceptions, so the guard is usually a state assertion plus a human look/listen.

## 1. Auto pilot missed the platform

**Symptom:** the train braked, crept a few centimetres past the station chainage, the "next station" index advanced, and the train accelerated to the following stop without opening the doors.

**Cause:** arrival depended on the next-index comparison. Floating-point creep crossed the chainage before the stop logic fired.

**Fix:** 15 m creep rule (`max(2.2, dist * 0.8)`), a positive snap in `updateKinematics` when `dist < 6` and speed `< 3.2`, plus a final `dist < 1.5` / speed `< 0.45` snap.

**Guard:** run the auto pilot through at least three stations and a terminus; watch `state.autoState`, `state.atStation`, `state.currentIndex`, `state.nextIndex` on each stop. A new braking constant must be tested at both low and high frame rates.

## 2. Engine drone masked the PA

**Symptom:** a continuous low hum, described as annoying and droning; announcements were hard to hear.

**Cause:** 40/80 Hz triangle/sine through a 260 Hz lowpass, an engine bus at 0.25 and a PA bus at the same master.

**Fix:** 180/360 Hz into a 620 Hz bandpass, engine default 0.15, whine at 900 Hz, separate engine/PA/music buses into a compressor.

**Guard:** the PA bus must stay independent; the engine slider must not move the announcement. Test at 0 and 100 km/h, with the mixer at defaults and at extremes.

## 3. Thai PA became "dot…" or English-only

**Symptom:** every announcement began with a dot, or Thai was skipped and only English played, despite a Kanya `th-TH` voice being listed.

**Cause:** Chrome's `speechSynthesis` often started the Thai utterance but never fired `end`; the fallback then flushed punctuation or jumped to English. Headless and real-browser behaviour differed.

**Fix:** pre-render Thai clips (`say -v Kanya -r 165`, AAC 32 kbps) and play them as `Audio` elements, Thai first, then English TTS. Keep a TTS fallback for missing clips, but do not rely on it.

**Guard:** `playThaiClip` must be exercised with a real clip; check `state.thaiAudio`, `state.speechBusy`, `state.lastSpeech`. Do not test with `paVolume = 0.001` — the audio element is effectively muted and the state never advances.

## 4. Doors moved before the announcement finished

**Symptom:** doors opened or closed over the PA; "please stand clear" was cut off.

**Cause:** door handlers ran immediately; speech was fire-and-forget.

**Fix:** `speechBusy` + `pendingDoorAction`; `closeDoors` plays the stand-clear line and performs the close in the callback; the auto pilot waits for speech before dwell/depart.

**Guard:** manual door press during a PA must queue, not interrupt. The toast should say the action will happen after the announcement. Test open and close separately, and test a second press while queued.

## 5. Green/black patch under the left canopy post

**Symptom:** a block of road turned green as the train departed; later it appeared even when stationary at certain angles. It survived several "fixes" and a cache-bust.

**Cause:** overlapping road, sidewalk and platform ribbons were nearly coplanar, so the green ground or canopy read through the road at grazing angles.

**Fix:** two 3.5 m footways instead of one wide ribbon under the road; a 15.4 m dark underlay below the 15 m asphalt; distinct heights (0.12/0.16/0.28/0.34); polygon offsets; `logarithmicDepthBuffer`; platform/tactile/deck separation; canopy-post bases embedded.

**Guard:** inspect the left canopy post at On Nut (E9) from several orbit angles, stationary and departing. The green ground must never show through the asphalt. Any new ribbon near the viaduct needs an explicit height above the road.

## 6. Station info card described the current station

**Symptom:** clicking ⓘ in the NEXT STATION block showed the station the train was dwelling at, so the name, landmark and Maps query disagreed with the block.

**Cause:** `openStationInfo` used `state.currentIndex`.

**Fix:** always use `state.nextIndex` (fall back to `currentIndex` only if missing). The Maps query is built from the same station object.

**Guard:** at a dwell, open the card and compare code/name/landmark/Maps query with the NEXT STATION block.

## 7. Cached build looked like a failed fix

**Symptom:** after a deploy, the user still saw the old render and doubted the fix.

**Cause:** GitHub Pages cached HTML for up to 10 minutes; the CSS/JS URLs had no version marker.

**Fix:** bump `VERSION`, append `?v=` to CSS/JS, and show the version in the telemetry header and help modal.

**Guard:** always ask for `#buildBadge` before debugging a visual report. Bump the version in `script.js` and both `index.html` query strings together.

## 8. Horizon flicker in orbit view

**Symptom:** a bright seam/flicker where the sky met the ground.

**Cause:** the sky dome's bottom colour did not match the fog, and distant ground/water/coast planes were nearly coplanar.

**Fix:** sky bottom = fog colour per preset; larger dome; several units of vertical separation between ground, water, river and coast; `polygonOffset` on the planes.

**Guard:** orbit at maximum distance in day/dusk/night and in storm; the horizon should be a gradient, not a line.

## 9. Green cast on the road from the train

**Symptom:** the road picked up a green tint near the train.

**Cause:** an emissive underglow/tint attached to the train.

**Fix:** remove the underglow tint; keep the road/asphalt neutral and the green on the station fascia only.

**Guard:** view 3 at night, train stationary and moving; the road under the train stays asphalt-coloured.

## 10. Solid canopy read as a green slab

**Symptom:** the station roof hid the platform and road, and looked like a flat green ceiling.

**Cause:** one wide canopy mesh per side.

**Fix:** 8 slatted panels with gaps (3.6 × 0.14 × 3.0, 4.25 pitch), a ridge, and a green fascia strip.

**Guard:** look up from the platform and down from orbit; the road should remain visible through the gaps.

## 11. Default camera and start station changed twice

**Symptom:** the first release opened in the cab and offered Siam as a start; the user wanted the orbit view and either real terminus.

**Cause:** product choice, not a code bug.

**Fix:** intro/start both select view 3; the intro offers N24 and E23 only; Siam remains the preview scene.

**Guard:** `startKhuKhot` → `startSimulation(0)`, `startKheha` → `startSimulation(46)`, and `setView(3)` after start. Do not reintroduce a Siam start button without updating the intro copy.

## 12. Station count drift in docs

**Symptom:** the README query table says "33-check harness" while the overlay reports 36/36.

**Cause:** the harness grew during the session; one copy of the count was not updated.

**Fix (documentation side):** count `check(` calls and trust the overlay/`window.__BTS_TEST__`; record the drift in [docs/TESTING.md](../../../docs/TESTING.md).

**Guard:** when adding a check, update the badge/README/state copy in the same commit or remove the hard-coded number.

## 13. Missing i18n keys

**Symptom:** the signal chip can read `clear` or `approach`, and the platform ETA can read `atPlatform`, in both languages.

**Cause:** `updateHUD` calls `t('clear')`, `t('approach')`, `t('atPlatform')`; the dictionaries never defined them, and `t()` falls back to the key.

**Fix (if allowed):** add the keys to both dictionaries. The release did not change app behaviour; it is recorded as a known issue.

**Guard:** grep every `t('...')` key against `I18N.en` and `I18N.th`. There is no automated parity check.

## 14. Cache-busting the wrong file

**Symptom:** a CSS fix appeared but a JS fix did not (or vice versa).

**Cause:** only one `?v=` was bumped.

**Fix:** bump both in `index.html` and `VERSION` in `script.js`.

**Guard:** the badge must match the version in the URL and the help modal.

## 15. Headless audio tests that proved nothing

**Symptom:** a speech test reported no activity; the app looked broken.

**Cause:** the test set `paVolume = 0.001`, which mutes the audio element path, and the headless page had no user gesture.

**Fix:** test at a real volume (0.05), set `state.voiceUnlocked`/`muted` deliberately, and assert `state.speechBusy`/`thaiAudio` transitions. Headless still cannot prove audibility.

**Guard:** separate "state machine ran" from "sound was heard". Only a human can verify the latter.

## 16. Dead constants and stale copy

**Symptom:** no runtime failure, but confusing code/docs: `STATION_STOP_TOLERANCE` is unused; the in-app credits say no audio assets while 145 clips ship.

**Cause:** iteration left declarations and copy behind.

**Fix (documentation side):** name them in the known-issues list rather than silently changing behaviour.

**Guard:** before release, grep for declared-but-unused constants and compare user-visible claims against `ls audio/th` and the self-test count.
