# Verification — 3 October 2026

Deliverable: WILDFALL: Last Ember 1.2.0, version code 3. APK: `dist/WILDFALL-Last-Ember-1.2.0.apk`, 6,486,366 bytes (6.19 MiB).

SHA-256: `54f5ae0c5d81535641d02803a1ee2ce3b3098699bd50f9b50026d0d14af97bb1`.

| Check | Result |
| --- | --- |
| Simulation/save regression tests | 63 passed, zero failed |
| Seeded invariants | 72 scenario/difficulty/seed combinations; public actions preserve stats, items, equipment, saves and valid responses |
| Content | 36 items, 27 recipes, 8 locations, 15 quests, 5 story scenes; references, costs, links and zero-cost event responses validated |
| Art | 83 generated originals and matching runtime assets; item/enemy/environment/scenario coverage plus five new narrative backgrounds and fire canopy |
| Audio | 16 OGG physical foley clips decoded; nature layers, independent toggles/volumes and background suspension checked; no oscillators, music or instrument files |
| Browser layout | 320, 412, 760 and 1440px; responsive title; compact five-tab panels and larger text |
| Browser gameplay | Nine premium QA groups: English menu, gather, eat/drink, craft/build, travel, exact save restoration, battle/guard/defeat, all item pages, audio and reduced motion |
| Refinement QA | Seven groups in each of Explorer and Survivor; full generated prologue, frozen story clock, manual result acknowledgement/reload, rain and canopy, separate wolf skin/meat, pack capacity, exhausted victor recovery |
| Guided first camp | Explorer: 22 public actions; Survivor: 24 public actions; live highlights lead through shelter, fire ring, canopy, food/water, forest search and Journal |
| Gather pacing and results | About 2.2 seconds with motion; results stay open after 3.5 seconds and backdrop clicks; reload restores the same loot, RNG and clock |
| Small-screen results | Gather, capacity-limited harvest and exhausted wolf recovery sheets fit default text at 320×640 and 412×915 without vertical scrolling |
| Browser runtime | Zero uncaught JavaScript errors and zero missing local assets |
| Android | Final APK installed over the previous build; Android 16 / API 36, WebView 133; Wi-Fi disabled during UI checks |
| Android UI | 11 checks passed: menu, prologue, highlighted guide, gather, unread result after force-stop, five tabs, settings, second save restoration, native Back, share chooser, local rating; zero helper retries on the final run |
| Rescue route — Explorer | Riverborn, seed 7103; 545 public actions; rescue on day 11; all five main quests, 12 total quests |
| APK | v2/v3 signatures verified, zipalign passed, ZIP CRC valid; all 229 runtime files match source byte for byte |
| Repository assets | Staged runtime blobs also match source exactly; .gitattributes preserves runtime bytes across clones |

[Browser evidence](evidence/browser.json), [Android evidence](evidence/android.json), refinement evidence for [Explorer](evidence/refinements-explorer.json) and [Survivor](evidence/refinements-survivor.json), and the [Explorer campaign](evidence/playthrough-explorer.json) record actual checks. Tutorial runs and the campaign obtain supplies through normal public actions without replenishing stats or injecting materials. Separate UI fixtures deliberately supply rain, battle, full-pack and low-stamina states to exercise specific conditions. A complete Survivor rescue is not asserted for this version.

Coverage includes atomic refusals, weather/injury stamina, pure cost previews, temperature and travel exposure, immediate rain extinguishing, independent canopy protection, weather boundaries inside actions, cooking refunds, interrupted radio transmission, dawn-weather production, no retroactive garden yield, random gather abundance, carcass persistence, spoilage, separate parts, cutting-tool wear, exhausted-victor rest, actual capacity results, timed traps, arrows, capped combat damage/healing, supply use during an enemy turn, no quest rewards after death, progression, corrupted saves, permadeath and compatible dawn checkpoints. Save regression tests also verify that the newest valid Android/browser copy wins and a corrupted newer backup cannot replace a valid save.

The first Android attempt was obstructed by a System UI emulator error dialog. Its accessibility tree explicitly identified System UI; Activity Manager reported no ANR since boot. After dismissal, force-stop testing exposed a stale WebView disk save taking priority over a newer native backup. The loader now compares valid copies by save time. A failing regression reproduced the old behavior before the fix; all 63 tests pass after it. A later accessibility-helper invocation returned exit 137 after writing its dump; the harness now retries that failure at most four times and never reads a failed dump. The final offline Android run passed all 11 checks with zero retries and no detected native game crash.

Physical phone/speaker performance is not yet verified. Audio clips were decoded and controls/layers exercised in Chromium; the emulator was launched with host audio disabled. Difficulty balance across all seeds still needs human playtesting. This standalone APK is development-signed; ratings remain local until an actual Play Store listing exists.

Commands: `npm test`, `npm run check`, `npm run qa`, `npm run qa:refinements`, `node tools/refinements-qa.mjs survivor`, `npm run qa:android`, `node tools/playthrough.mjs story riverborn 7103`, `npm run android`, `python tools/verify-package.py`.
