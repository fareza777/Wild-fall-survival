# Verification — 3 October 2026

Deliverable: WILDFALL: Last Ember 1.3.0, version code 4. APK: `dist/WILDFALL-Last-Ember-1.3.0.apk`, 7,339,124 bytes (7.00 MiB).

SHA-256: `824e114269ecf4c40bc36ca21d25beaf09f14d8f3dd5e995822ba36655234a53`.

| Check | Result |
| --- | --- |
| Simulation/save/narration regression tests | 77 passed, zero failed |
| Seeded invariants | 72 scenario/difficulty/seed combinations; public actions preserve stats, items, equipment, saves and valid responses |
| Content | 36 items, 27 recipes, 8 locations, 15 quests, 5 story scenes; references, costs, links, reveal conditions and zero-cost event responses validated |
| Art | 83 generated originals and matching runtime assets; complete item/enemy/environment/scenario coverage, five narrative backgrounds and fire canopy |
| Foley and nature | 16 OGG physical clips decoded; weather/location layers, independent toggles/volumes and background suspension checked; no oscillators, music or instrument files |
| Narration | Seven real bundled ElevenLabs MP3 clips decoded: 6.64–8.64 seconds, non-silent, zero clipped samples; title/subtitle and scenario variants match the script manifest |
| Narration controls | Mute, replay, scene replacement without overlap, background pause/resume and Skip; nature ambience ducks during speech; no external runtime requests |
| Setup stability | Character and difficulty selections retain the same panel and portrait elements, focus, scroll and running animation |
| Browser layout | 320, 412, 760 and 1440px; responsive title, compact five-tab panels and larger text |
| Browser gameplay | Nine premium QA groups: English menu, gather, eat/drink, craft/build, travel, exact save restoration, battle/guard/defeat, item pages, audio and reduced motion |
| Refinement QA | Seven groups in each of Explorer and Survivor; prologue, frozen story clock, manual result acknowledgement/reload, rain/canopy, separate wolf skin/meat, pack capacity and exhausted victor recovery |
| Guided first camp | All three scenarios in Explorer and Survivor finish through public highlighted controls; Last Ember 17/17 actions, Riverborn 15/15, Cold Trail 21/23 |
| Empty-bottle recovery | Four public UI fixtures finish: old stuck save (2 actions), tea/berries (4), boiling carried water (4), river refill (11) |
| Tutorial simulation | 48 fresh guided scenario/difficulty/seed combinations complete; six harsh Cold Trail/Relentless runs complete or reach an actual survival death without a softlock |
| Journal progression | Only completed/current main chapters enter the DOM or pager; side objectives require discoveries; the next chapter opens after an actual quest completion; hidden objectives grant no premature rewards |
| Gather pacing and results | About 2.2 seconds with motion; results remain after 3.5 seconds and backdrop clicks; reload retains the exact loot, RNG and clock |
| Small-screen results | Gather, capacity-limited harvest and exhausted wolf recovery sheets fit default text at 320×640 and 412×915 without vertical scrolling |
| Browser runtime | Zero uncaught JavaScript errors, zero missing local assets and zero external requests in chapter QA |
| Android | Final signed APK installed over the previous build; Android 16 / API 36, WebView 133; Wi-Fi disabled for UI verification |
| Android UI | 13 checks passed: offline menu, stable setup controls, prologue, actual offline narration/mute/replay, highlighted guide, gather, unread result after force-stop, five tabs, settings, second save restoration, native Back, share chooser and local rating; 15 bounded accessibility-helper retries across the run |
| Rescue route — Explorer | Riverborn, seed 7103; 653 public actions; rescue on day 13, all five main quests and 12 total quests; health 66.02 |
| APK | v2/v3 signatures verified, zipalign passed, ZIP CRC valid; all 238 runtime files match source and staged Git blobs byte for byte |

[Browser evidence](evidence/browser.json), [Android evidence](evidence/android.json), [chapter and tutorial evidence](evidence/chapters.json), refinement evidence for [Explorer](evidence/refinements-explorer.json) and [Survivor](evidence/refinements-survivor.json), and the [Explorer campaign](evidence/playthrough-explorer.json) record the checks. Tutorial runs and the campaign obtain supplies through normal public actions without replenishing statistics or injecting materials. Separate recovery fixtures set up depleted or historical save states before following real controls. Rain, battle, full-pack and low-stamina fixtures exercise specific conditions. A complete Survivor rescue is not asserted for this version.

Coverage includes atomic refusals, weather/injury stamina, pure cost previews, temperature and travel exposure, immediate rain extinguishing, independent canopy protection, weather boundaries within actions, cooking refunds, interrupted radio transmission, dawn-weather production, random gather abundance, carcass persistence and spoilage, separate parts and cutting-tool wear, exhausted-victor recovery, actual capacity results, timed traps, arrows, capped combat damage/healing, supply use during an enemy turn, no quest rewards after death, gradual quest visibility, corrupted saves, permadeath and compatible dawn checkpoints. The newest valid Android/browser copy wins; a corrupted newer backup cannot replace a valid save.

The tutorial uses the real survival simulation. No supplies are created to bypass an empty bottle, and Relentless/Cold Trail can still end in death. Replay starts a new learning record rather than interpreting old meals as new lessons; only compatible historical tutorials migrate earlier consumption once.

The Android test uses only accessibility controls and real device input. The cold emulator initially showed a System UI ANR dialog, with System UI/Google services identified separately from the game. An overloaded injected tap also selected the tutorial Skip text instead of activating it. Button text selection is now disabled for touch controls, and the harness uses a short stationary gesture and verifies that Skip actually closes the guide. Accessibility helpers retry exit 137 or an inability to obtain an idle tree at most four times per dump; only a successful fresh dump is read. The final warm, offline run passed all 13 checks with no detected native game crash.

Screenshots: [stable character selection](media/choices.webp), [voiced prologue](media/story.webp) and [unwritten side quests](media/journal.webp).

Physical phone/speaker performance is not yet verified. All recordings were decoded and their playback lifecycle exercised in Chromium. The emulator runs with host audio disabled; its actual narration playback state, mute and replay are verified with Wi-Fi off. Difficulty balance across every seed still needs human playtesting. This standalone APK is development-signed; ratings remain local until an actual Play Store listing exists.

Commands: `npm test`, `npm run check`, `npm run qa`, `npm run qa:refinements`, `node tools/refinements-qa.mjs survivor`, `npm run qa:chapters`, `npm run qa:android`, `node tools/playthrough.mjs story riverborn 7103`, `npm run android`, `python tools/verify-package.py`.
