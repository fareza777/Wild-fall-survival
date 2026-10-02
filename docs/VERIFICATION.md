# Verification — 3 October 2026

Deliverable: WILDFALL: Last Ember 1.1.0, version code 2. APK: `dist/WILDFALL-Last-Ember-1.1.0.apk`, 5,428,621 bytes (5.18 MiB).

SHA-256: `5cec03ea0bb4279d679bae1ac76b6c6c9234999aee5452b9316eff800da9a801`.

| Check | Result |
| --- | --- |
| Simulation/save regression tests | 43 passed, zero failed |
| Seeded invariants | 72 scenario/difficulty/seed combinations; public actions preserve stats, items, equipment, saves and valid responses |
| Content | 36 items, 26 recipes, 8 locations, 15 quests; references, costs, links and zero-cost event responses validated |
| Art | 77 generated originals, matching runtime assets, complete item/enemy/environment/scenario coverage |
| Audio | 16 OGG physical foley clips decoded; nature layers, independent toggles/volumes and background suspension checked; no oscillators, music or instrument files |
| Browser layout | 320, 412, 760 and 1440px; responsive title; compact five-tab panels and larger text |
| Browser gameplay | English onboarding, new run, one-tap gather, eat/drink, craft/build, travel, exact save restoration, battle/guard/defeat, all item pages and reduced motion |
| Browser runtime | Zero uncaught JavaScript errors and zero missing local assets |
| Android | Installed over the previous APK and ran on Android 16 / API 36, WebView 133, with Wi-Fi disabled during UI checks |
| Android UI | New game, gather to 08:45, five tabs, settings, force-stop/relaunch persistence, native Back, share chooser and local rating |
| Rescue route — Explorer | Riverborn, seed 7103; 335 public actions; rescue on day 8; all five main quests, 12 total quests |
| Rescue route — Survivor | Riverborn, seed 7103; 640 public actions; rescue on day 12; all five main quests, 12 total quests |
| APK | v2/v3 signatures verified, zipalign passed, ZIP CRC valid; all 216 runtime assets match source byte for byte |
| Repository assets | Staged runtime blobs also match source exactly; .gitattributes preserves runtime bytes across clones |

[Browser evidence](evidence/browser.json) and [Android evidence](evidence/android.json) record the actual checks. UI fixtures supply controlled battle, art and ambience states. Campaign playthroughs obtain all resources using normal public actions without replenishing stats or injecting materials.

Coverage includes atomic refusals, weather/injury stamina, action cost preview purity, camp temperature, exposed fire burn rates, full cooking fuel budgets, refueling order, travel exposure, timed traps, durability, arrows, capped combat damage and healing, supply use during an enemy turn, quest rewards after death, daylight transmission, progression, corrupted saves, permadeath, dawn checkpoints and deterministic RNG.

The first Android attempt was obstructed by a System UI emulator error dialog. Its accessibility tree identified System UI; Activity Manager reported no game ANR. After dismissing that emulator dialog, the complete offline check passed. No game crash was found in the native log check.

Physical phone/speaker performance is not yet verified. Audio clips were decoded and controls/layers exercised in Chromium; the emulator was launched with host audio disabled. Difficulty balance across all seeds still needs human playtesting. This standalone APK is development-signed; ratings remain local until an actual Play Store listing exists.

Commands: `npm test`, `npm run check`, `npm run qa`, `npm run qa:android`, `node tools/playthrough.mjs story riverborn 7103`, `node tools/playthrough.mjs survivor riverborn 7103`, `npm run android`, `python tools/verify-package.py`.
