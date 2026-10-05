# Verification — 5 October 2026

Deliverable: **WILDFALL: Last Ember 1.4.0**, version code 6. APK: `dist/WILDFALL-Last-Ember-1.4.0.apk`, **10,139,776 bytes (9.67 MiB)**.

SHA-256: `66dcd4030fb07b56e6087b9e23cedc6fea454f3743c0568bcd5d5b53d226dc6c`.

| Check | Result |
| --- | --- |
| Simulation, saves and UI policy | 106 tests passed; zero failed, skipped or cancelled |
| Native commerce policy | Four JUnit tests passed: purchased/pending/cancelled product eligibility, package/token checks, ad eligibility, cooldown and expiry |
| Seeded invariants | 72 scenario/difficulty/seed combinations preserve bounded statistics, inventory, equipment and valid saves |
| Content validation | 43 items, 35 recipes, eight locations, 15 progressive quests, five story scenes; tool requirements, repair materials, costs, links and event fallbacks checked |
| Generated art | 90 originals and matching runtime assets; seven new tools, all items/enemies, concealed survivors, landscapes, story scenes and camp structures |
| Foley and nature | 16 decoded physical OGG clips; independent controls, weather/location layers and background suspension; no music or instrument files |
| Offline narration | Seven real bundled ElevenLabs MP3 clips; matching subtitles/scenario variants, mute/replay, scene replacement, background pause/resume and Skip |
| Browser UI | Nine QA groups passed at 320, 412, 760 and 1440px; 43 item cards, five tabs, larger text, actual action/battle motion, audio and exact save restoration |
| Tools and store UI | Seven groups passed: missing-tool refusal, real pot/spit crafting and cooking, carried equipment, material-specific repair, legacy-kit migration, seven decoded illustrations and compact store tabs |
| Tool simulation | Cooking wears reusable utensils; canteens and drills wear only on their actual use; mining uses a carried pickaxe and equipped torch; repairs consume the displayed materials; broken gear blocks actions atomically |
| Guided first camp | Nine fresh public runs cover every scenario/difficulty; 18–20 actions, no combat or random events, 100 health and at least 40 stamina at handoff |
| Tutorial recovery | Six public UI fixtures finish: depleted supplies, tea/berries, boiling, river refill, tired travel and a historical wolf ambush; each retains at least 40 stamina |
| Tutorial simulation | 54 scenario/difficulty/seed combinations finish safely; supplies and recovery come from normal actions, without injected materials or statistic resets |
| Journal progression | Only completed/current main chapters and discovered side objectives appear; the next chapter opens after actual quest completion |
| Explorer rescue | Riverborn, seed 7103; 533 public actions, rescue on day 11, five main quests and 12 total quests, 100 health and 41.25 stamina; new tools crafted/repaired through normal actions |
| Final Android install | Final signed v1.4.0 APK installed successfully on a dedicated Android 16 / API 36 emulator |
| Final Android offline UI | All 13 checks passed: setup, narration, guide, gather, unread result and save recovery after force-stop, five tabs, settings, native Back, share chooser and local rating |
| Actual native test ads | All five commerce QA groups passed against genuine Google demo SDK ads: separate adaptive banner, story/guide suppression, actual earned rewarded callback and eligible menu interstitial |
| Reward integrity | Actual SDK completion credited one ration and one clean water, held for Continue; a second claim that game day was disabled. Simulation tests cover cancellation, capacity, replayed receipts and save/reload idempotence |
| Remove Ads availability | US$4.99 and Restore are shown; an unavailable Play product leaves purchase disabled and never unlocks simulated ownership |
| APK integrity | v2/v3 signatures verified, zipalign passed, ZIP CRC valid; all 248 runtime assets match source and staged Git blobs byte for byte |

Evidence: [gameplay tests](evidence/tests.json), [native policy tests](evidence/native-policy.json), [browser](evidence/browser.json), [tools/store](evidence/tools-commerce.json), [chapters/tutorials](evidence/chapters.json), [Explorer campaign](evidence/playthrough-explorer.json), [final offline Android run](evidence/android.json), [actual native ads](evidence/android-commerce.json) and [package integrity](evidence/package.json).

Public tutorials and the campaign obtain supplies through the normal simulation. Recovery fixtures start from depleted or historical save states and then follow real highlighted controls. Controlled browser fixtures exercise combat, weather, pack capacity and audio. Separate [Explorer](evidence/refinements-explorer.json) and [Survivor](evidence/refinements-survivor.json) refinement reports are retained from v1.3.0; they are historical evidence, not asserted as rerun for this release. Current simulation tests cover rain extinguishing, fire-canopy protection, cooking refunds and wear, weather boundaries, randomized loot, carcass meat/skin processing and spoilage, exhausted-victor recovery, progressive quests and corrupted saves.

The tutorial pauses random wildlife/events and reduces food, water and exposure to 0.6 while active. Travel still spends real time and stamina; the guide reserves energy for the next action and recovers at least 40 stamina through rest before handoff. Finish or Skip restores the selected normal difficulty. Historical tutorial ambush recovery preserves the clock, inventory, statistics and battle counters without a false victory or bonus loot.

Android QA uses fresh compressed accessibility snapshots and real stationary touch gestures. It waits for stable control bounds before touching and checks each expected result. The final offline run needed one snapshot retry and detected no native game crash. The helper in `tools/android/` runs outside the app and is not bundled in the APK. Actual ad QA completed before the final save-validation rebuild; native Java/SDK behavior and commerce UI were unchanged. The final rebuilt package then passed the offline Android checks and source-byte verification.

Ad audio starts muted with app volume zero before requests; fullscreen ads suspend game sounds. A creative may expose its own unmute control. The game contains only physical foley, nature ambience and spoken narration. The emulator runs without host audio: playback states and controls are verified, while physical phone/speaker sound remains unverified.

**Live payment, pending-payment completion, refunds and cross-device Restore are not verified.** Activate `wildfall_remove_ads` with US base price US$4.99 in Play Console and configure an eligible billing test account. The application displays Google's actual localized price once ProductDetails is available. Purchase verification is client-side through Play Billing; no verification server is included. See [monetization setup](MONETIZATION.md). This standalone APK is development-signed and uses official demo ad IDs; local ratings await a real store listing. A complete Survivor rescue and balance across every seed are not asserted.

Screenshots: [new cooking result](media/cooking-tools.webp), [compact Remove Ads](media/remove-ads.webp), [actual native banner](media/native-banner.webp), [earned SDK reward](media/native-reward.webp), [voiced story](media/story.webp) and [stable setup](media/choices.webp).

Commands: `npm test`, `npm run check`, `npm run qa`, `npm run qa:tools`, `npm run qa:chapters`, `npm run qa:android`, `npm run qa:commerce`, `node tools/playthrough.mjs story riverborn 7103`, `android/gradlew.bat -p android testReleaseUnitTest`, `npm run android`, `python tools/verify-package.py`.
