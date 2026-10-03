# WILDFALL: Last Ember

An original, fully offline 2D wilderness survival game for Android. Read the land, build a refuge, and repair a radio to find your way home.

**v1.3.0 — Voices in the Wilderness.** Offline English cinematic narration, stable character and difficulty selection, a supply-aware tutorial and gradually revealed Journal chapters. Five illustrated story scenes, weather-aware fire, varied gathering and field dressing after battle. English interface, charcoal and copper art, compact mobile panels, physical foley and nature ambience. **No music, melodies, instrument samples, or tonal UI beeps.**

<img src="docs/media/story.webp" width="260" alt="Original illustrated prologue"> <img src="docs/media/guide.webp" width="260" alt="Tutorial highlighting the actual gather control"> <img src="docs/media/harvest.webp" width="260" alt="Wolf carcass with harvesting and recovery choices">

## Install

[Download the APK](https://github.com/fareza777/survival-wild-ember/releases/download/v1.3.0/WILDFALL-Last-Ember-1.3.0.apk), or use `dist/WILDFALL-Last-Ember-1.3.0.apk` (7.00 MiB). The checksum is in `dist/SHA256.txt`. Install over the previous build to retain compatible saves and settings.

Requires Android 8.0+ (API 26) and Android System WebView 108+. Universal ARM/x86 APK; no network permission, account, ads, or runtime downloads. Open the APK on your phone and allow installation from your file manager if Android prompts you. This standalone build uses the project's development certificate; it is not a Play Store release.

## Play

- Eight connected locations, 36 items, 27 recipes, five main quests and ten side objectives.
- Three starting scenarios, three difficulty levels, optional permadeath, dawn recovery and longest survival records.
- Health, stamina, calories, hydration, temperature, fatigue, injury and sickness.
- Day/night, six weather types, increasing exposure and encounter risk, location progression and random choices with consequences.
- Gathering, foraging, hunting, fishing, timed snares, cooking, durable equipment, repair and pack capacity.
- Three shelter levels, a separate fire canopy, fire and fuel, a rain collector, a garden, radio rescue and endless survival.
- Turn-based battle: attack, power strike, guard, retreat and supply use. Equipment, arrows, preparation and stamina matter.
- Five generated prologue scenes with English voice-over and scenario-specific lines, nine guided first steps, replayable story and tutorial, settings, guide, about, native Android sharing and local rating.

The camp keeps primary actions within reach. Gather, eat, drink and eligible crafting take one tap. Inventory and recipes use short pages and category menus. Journal shows completed chapters and the current main objective; future chapters remain undisclosed. Side objectives appear through discoveries and survival milestones. Detailed item and action information opens on demand. Reduced motion, larger text, haptics, effects volume, ambience volume and narration are configurable.

Character and difficulty controls update in place, preserving the panel, artwork, focus and scroll position. The tutorial remembers safe food and drink already used during construction, highlights substitutes such as herbal tea, and guides depleted supplies through foraging, collecting river water and boiling it. Compatible old tutorials stuck at the supply lesson recover from their actual saved consumption history. The guide uses the same costs and survival rules as normal play; it grants no free supplies or immunity from harsh conditions.

Gathering takes about 2.2 seconds with motion enabled. The result lists the actual supplies packed, anything left behind and the action cost; it stays open until **Continue**. Unread results survive closing the app. Sparse, steady and rich finds use the saved RNG, with weather, darkness, fatigue and tools affecting yield. Reloading cannot reroll a result.

**Rain extinguishes an uncovered campfire**, including while you are away. A sleeping shelter protects your bed and body; the outdoor fire needs its own open-sided canopy. Weather can change during a long action. Interrupted cooking returns uncooked ingredients, still spends time and energy, and grants no cooked food. Rain collectors and gardens produce only when present at dawn, using the weather at that time.

Defeated wolves, boars and bears leave a carcass with randomized, species-specific meat and hide. Choose to skin, take meat, process both or leave it. A working knife or axe, time, energy and pack space matter. Harvesting wears the blade and each part is available once. Carcasses spoil after three game hours; an exhausted victor can use supplies or rest nearby while that timer continues.

Gather firewood, flint stone and fiber. Build a shelter, fire ring and fire canopy, then light the fire. Eat and drink from Pack. **Equip crafted gear**: crafting alone does not equip it. Explore the forest to unlock the river and boil its water at camp. Cook raw food before eating.

The rescue route leads through the river and cabin to the ruins and cave. Recover the journal and radio module, equip a torch and carry a working axe to mine copper. Make a battery and radio at camp. Transmit at Hope Summit in clear/cloudy daylight; the 30-minute transmission must finish before 19:00 and remain in suitable weather. Start with Explorer / Riverborn for a gentler first journey.

## Architecture

Vanilla ES modules and JSON catalogs keep the simulation separate from presentation. `web/game/` contains the action engine, seeded RNG, metabolism, inventory, combat, quests and storage. `web/ui/` contains views, paging, motion and audio. The small Java host in `android/src/` provides local asset loading, native backup, haptics, sharing and Back handling.

Add content in `web/data/`: items, recipes, locations, events, enemies, weather, scenarios, quests and story scenes. Each entry references local art. `random.js` and `harvesting.js` handle saved outcomes; `story-view.js`, `guide.js` and `results-view.js` present the introduction, highlights and held results. Cost preview and execution share the same exposure/metabolism code. Every accepted action saves before its animation starts. Android restores the newest valid browser/native copy after force-stop. Compatible version-1 saves and dawn checkpoints are retained; existing survivors do not have to repeat the new introduction.

## Preview and verification

Node.js 20+:

```powershell
npm ci
npm start
# Open http://127.0.0.1:4173 in another window.
npm test
npm run check
npm run qa
npm run qa:refinements
npm run qa:chapters
```

Browser QA uses Playwright. If Chromium is not installed, run `npx playwright install chromium`; alternatively set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. On Windows the test also locates an existing Playwright browser cache. Android QA uses `ADB` and `ANDROID_SERIAL` (defaults: `C:/Android/Sdk/platform-tools/adb.exe` and `emulator-5580`) with an installed, running APK:

```powershell
npm run qa:android
node tools/playthrough.mjs story riverborn 7103
node tools/refinements-qa.mjs survivor
python tools/verify-package.py
```

The Explorer rescue demonstration obtains supplies through public gameplay actions, without injecting resources or resetting statistics: seed 7103 reaches rescue on day 13 after 653 actions. All three scenarios complete their guided tutorials in Explorer and Survivor through the public highlighted controls. Separate fixtures verify old stuck saves, substitute drinks, boiling and a river refill. Controlled browser fixtures also test particular combat, rain, pack-capacity, art and audio states. See [verification evidence](docs/VERIFICATION.md) for scope and results. Balance across all seeds still benefits from human playtesting; automated rules coverage is not a universal winning strategy.

## Build Android

JDK 17+, Android SDK platform 35, build-tools 35.0.0 and PowerShell. No Gradle or Android Studio is required.

```powershell
npm run android
# Optional explicit tool paths:
powershell -ExecutionPolicy Bypass -File tools/build-android.ps1 -SdkPath C:\Android\Sdk -JavaPath "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
```

The pipeline compiles resources and Java, converts to DEX, bundles all local web assets with standard ZIP paths, aligns, signs and verifies the APK, then writes SHA-256. It preserves your local development keystore for subsequent updates. Private keys and build caches are excluded from Git; a fresh clone creates its own development certificate. Use a separate production keystore for store publication.

## Art and audio

83 original generated assets cover every item, enemy, environment, survivor, camp structure, gameplay symbol, story scene, title illustration and app emblem. All human faces are completely concealed. Originals and individual prompts are retained in `art/generated/` and [art/catalog.json](art/catalog.json). Runtime WebP assets are resized and format-converted only. `npm run assets` repeats conversion using Sharp; camp structures, the canopy and fire are separate layers driven by game state.

16 selected physical foley clips come from Kenney RPG Audio and Impact Sounds (CC0). Wind, rain, flowing water and fire use original filtered broadband noise. Seven English narration clips were generated with ElevenLabs, using George and `eleven_multilingual_v2`. Recordings and a script manifest are bundled for offline playback. Narration follows the scene and chosen scenario, ducks nature ambience, stops on Skip, and pauses in the background. Mute and replay controls are available in the prologue; settings retain the voice preference. Full credits are in [audio/SOURCES.md](web/assets/audio/SOURCES.md). `tools/prepare-audio.mjs` documents the foley mapping. `tools/generate-narration.py` requests a key through a hidden terminal prompt; no API credential is bundled in the repository or APK.

Utility interface icons: Phosphor (MIT). Fonts: Outfit, Cormorant Garamond and the legacy Barlow Condensed fallback (SIL OFL). Their licenses are bundled. Original project source is MIT; third-party licenses remain applicable. No reference-game assets or UI were copied.

Ratings are saved locally until there is an actual store listing. Device verification used an Android emulator; physical phone and speaker validation remain unverified.
