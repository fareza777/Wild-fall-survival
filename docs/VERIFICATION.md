# Verification — 5 October 2026

Deliverable: **WILDFALL: Last Ember 1.4.1**, version code 7. APK: `dist/WILDFALL-Last-Ember-1.4.1.apk`, **10,143,872 bytes (9.67 MiB)**.

SHA-256: `d7433653c8954336174c41d8fb1b4bc9ecaf4c83afb6a2b78fad490234187d23`.

| Check | Result |
| --- | --- |
| Simulation, saves and UI policy | 116 tests passed; zero failed, skipped or cancelled |
| Native commerce policy | Four JUnit tests passed: purchased/pending/cancelled product eligibility, package/token checks, ad eligibility, cooldown and expiry |
| Seeded invariants | 72 scenario/difficulty/seed combinations preserve bounded statistics, inventory, equipment and valid saves |
| Content validation | 43 items, 35 recipes, eight locations, 15 progressive quests, five story scenes; tool requirements, repair materials, costs, links, event fallbacks and catalog-wide broken-encoding checks passed |
| Generated art | 90 originals and matching runtime assets; seven new tools, all items/enemies, concealed survivors, landscapes, story scenes and camp structures |
| Foley and nature | 16 decoded physical OGG clips; independent controls, weather/location layers and background suspension; no music or instrument files |
| Offline narration | Seven real bundled ElevenLabs MP3 clips; matching subtitles/scenario variants, mute/replay, scene replacement, background pause/resume and Skip |
| Browser UI | Nine QA groups passed at 320, 412, 760 and 1440px; 43 item cards, five tabs, larger text, actual action/battle motion, audio and exact save restoration |
| Tools and store UI | Nine groups passed: missing-tool refusal, real pot/spit crafting and cooking, carried equipment, material-specific repair, old saves without autogrants, unused gift withdrawal with preserved used/crafted tools, historical unread-result text, seven decoded illustrations and compact store tabs |
| Earned camp kit | Every scenario starts with only the salvaged knife; camp Gather supplies a finite five scrap, full packs leave salvage available, and depleted wrecks guide toward cabin scrap; replacements retain origin and usage metadata |
| Old starter gifts | Only full-durability gifts with complete known history withdraw once; crafted duplicates, used/repaired gear and ambiguous histories remain, preserving materials, statistics, time and identifiers |
| Workbench text | Clean water ×2, Linen bandages ×2 and Flint arrows ×5 display correctly; historical logs and unread batch results normalize broken text without changing loot or costs |
| Tool simulation | Cooking wears reusable utensils; canteens and drills wear only on their actual use; mining uses a carried pickaxe and equipped torch; repairs consume the displayed materials; broken gear blocks actions atomically |
| Guided first camp | Nine fresh public runs cover every scenario/difficulty; 25–31 actions, utensils crafted before travel, no combat or random events, 100 health and at least 40 stamina at handoff |
| Tutorial recovery | Six public UI fixtures finish: depleted supplies, tea/berries, boiling, river refill, tired travel and a historical wolf ambush; each retains at least 40 stamina |
| Tutorial simulation | 54 scenario/difficulty/seed combinations finish safely; supplies and recovery come from normal actions, without injected materials or statistic resets |
| Journal progression | Only completed/current main chapters and discovered side objectives appear; the next chapter opens after actual quest completion |
| Explorer rescue | Riverborn, seed 7103; 808 public actions, rescue on day 16, five main quests and 12 total quests, 77.38 health and 95 stamina; required tools crafted/repaired through normal actions |
| Final Android install | Final signed v1.4.1 APK installed successfully on a dedicated Android 16 / API 36 emulator |
| Final Android offline UI | All 13 checks passed: setup, narration, guide, gather, unread result and save recovery after force-stop, five tabs, settings, native Back, share chooser and local rating |
| Actual native test ads | All five commerce QA groups passed against genuine Google demo SDK ads: separate adaptive banner, story/guide suppression, actual earned rewarded callback and eligible menu interstitial |
| Native banner geometry | Actual banner above the WebView; content ends at navigation top 1516px with three buttons and 1558px with gestures on a 720 × 1600 display; status and display-cutout insets reserved by the host |
| Reward integrity | Actual SDK completion credited one ration and one clean water, held for Continue; a second claim that game day was disabled. Simulation tests cover cancellation, capacity, replayed receipts and save/reload idempotence |
| Remove Ads availability | US$4.99 and Restore are shown; an unavailable Play product leaves purchase disabled and never unlocks simulated ownership |
| APK integrity | v2/v3 signatures verified, zipalign passed, ZIP CRC valid; all 248 runtime assets match source and staged Git blobs byte for byte |

Evidence: [gameplay tests](evidence/tests.json), [native policy tests](evidence/native-policy.json), [browser](evidence/browser.json), [tools/store](evidence/tools-commerce.json), [chapters/tutorials](evidence/chapters.json), [Explorer campaign](evidence/playthrough-explorer.json), [final offline Android run](evidence/android.json), [actual native ads](evidence/android-commerce.json), [button/gesture bounds](evidence/android-layout.json) and [package integrity](evidence/package.json).

Public tutorials and the campaign obtain supplies through the normal simulation. Recovery fixtures start from depleted or historical save states and then follow real highlighted controls. Controlled browser fixtures exercise combat, weather, pack capacity and audio. Separate [Explorer](evidence/refinements-explorer.json) and [Survivor](evidence/refinements-survivor.json) refinement reports are retained from v1.3.0; they are historical evidence, not asserted as rerun for this release. Current simulation tests cover rain extinguishing, fire-canopy protection, cooking refunds and wear, weather boundaries, randomized loot, carcass meat/skin processing and spoilage, exhausted-victor recovery, progressive quests and corrupted saves.

The tutorial pauses random wildlife/events and reduces food, water and exposure to 0.6 while active. Travel still spends real time and stamina; the guide reserves energy for the next action and recovers at least 40 stamina through rest before handoff. Finish or Skip restores the selected normal difficulty. Historical tutorial ambush recovery preserves the clock, inventory, statistics and battle counters without a false victory or bonus loot.

Regression checks first exposed the unwanted starter grants, missing crafting provenance, inaccessible early scrap and corrupted batch labels before the fixes. Separate failing cases exposed a guide looping on an exhausted wreck and corrupted text in historical unread results; those cases now pass. The original v1.4.0 APK also failed the native above-game banner assertion before the Android layout change.

Android QA uses fresh compressed accessibility snapshots and real stationary touch gestures, with focused keyboard input available for clipped accessibility bounds. It waits for stable bounds before touching and checks each expected result. The final offline run used two snapshot retries, needed no System UI dismissal or keyboard fallback, and detected no native game crash. The helper in `tools/android/` runs outside the app and is not bundled in the APK. A new dedicated emulator replaced the old environment after its System UI stalled. The final signed APK passed all 13 offline checks, all five actual SDK ad groups and both navigation-mode geometry checks after the final text repair. The ad harness acknowledges Android's first-fullscreen help when SDK video opens and checks the actual held-result message on dismissal.

Ad audio starts muted with app volume zero before requests; fullscreen ads suspend game sounds. A creative may expose its own unmute control. The game contains only physical foley, nature ambience and spoken narration. The emulator runs without host audio: playback states and controls are verified, while physical phone/speaker sound remains unverified.

**Live payment, pending-payment completion, refunds and cross-device Restore are not verified.** Activate `wildfall_remove_ads` with US base price US$4.99 in Play Console and configure an eligible billing test account. The application displays Google's actual localized price once ProductDetails is available. Purchase verification is client-side through Play Billing; no verification server is included. See [monetization setup](MONETIZATION.md). This standalone APK is development-signed and uses official demo ad IDs; local ratings await a real store listing. A complete Survivor rescue and balance across every seed are not asserted.

Screenshots: [new cooking result](media/cooking-tools.webp), [historical result after text repair](media/legacy-result.webp), [compact Remove Ads](media/remove-ads.webp), [actual native banner](media/native-banner.webp), [button navigation](media/native-navigation-buttons.webp), [gesture navigation](media/native-navigation-gesture.webp), [earned SDK reward](media/native-reward.webp), [voiced story](media/story.webp) and [stable setup](media/choices.webp).

Commands: `npm test`, `npm run check`, `npm run qa`, `npm run qa:tools`, `npm run qa:chapters`, `npm run qa:android`, `npm run qa:commerce`, `node tools/android-layout-qa.mjs`, `node tools/playthrough.mjs story riverborn 7103`, `android/gradlew.bat -p android testReleaseUnitTest`, `npm run android`, `python tools/verify-package.py`.
