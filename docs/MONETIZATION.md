# Optional ads and Remove Ads

v1.4.1 uses the native Google Mobile Ads SDK 25.5.0 and Google Play Billing 8.3.0. Survival, saves, art, foley, nature ambience and narration remain offline. Ads and purchases need a connection.

## Test ads

`android/res/values/commerce.xml` contains official Google Android demo IDs:

| Format | Test ID |
| --- | --- |
| App | `ca-app-pub-3940256099942544~3347511713` |
| Adaptive banner | `ca-app-pub-3940256099942544/9214589741` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` |

These are genuine SDK ads. Browser previews cannot synthesize an ad or purchase. See Google's [test ads](https://developers.google.com/admob/android/test-ads) and [SDK initialization](https://developers.google.com/admob/android/quick-start) documentation.

Banners reserve a separate native area above the WebView. Android system-bar and display-cutout insets pad the entire host; the game ends above the native navigation area in both button and gesture modes. This follows Android's [edge-to-edge inset guidance](https://developer.android.com/develop/ui/views/layout/edge-to-edge?hl=en). Banners collapse on failure and hide during the story, guide, busy actions, combat, pending choices, unread results, carcasses and dialogs. Interstitials require a return to the menu after at least eight actions, a ready ad and a native three-minute cooldown. Cached fullscreen ads expire after one hour. Closing the menu does not spend game time.

At camp, **Supplies** offers one ration and one clean water per game day. The reward is saved only after `OnUserEarnedRewardListener`; a cancelled or failed ad grants nothing. The earned UUID, run and day are persisted natively, then credited to the normal pack and saved before acknowledgement. Repeated callbacks/reloads cannot duplicate supplies. Pack capacity, active lessons, battles, events, death and unread results block new claims. A held result shows the actual items. Remove Ads owners can still choose rewarded ads. Google's [rewarded integration](https://developers.google.com/admob/android/rewarded) describes the earn and dismissal callbacks.

Ad audio starts muted with app volume zero **after SDK initialization and before requests**. The game contains no music or instrument sounds. Fullscreen ads suspend game ambience and narration. SDK creatives may offer their own mute control; the application does not claim to filter the advertiser's media content. See [AdMob audio settings](https://developers.google.com/admob/android/global-settings).

## Activate US$4.99 Remove Ads

The one-time, non-consumable product is **`wildfall_remove_ads`**, for package **`com.ashenvalley.wildfall`**. Set its US base price to **US$4.99** in Google Play Console and activate it. Upload a signed release bundle to an internal testing track, add eligible testers, and install through that Play listing. License testers can also test a compatible sideloaded build after the Play application/product setup. This APK shows purchase unavailability when the product or Play service is unavailable; it never simulates a payment. See [Billing test accounts and distribution](https://developer.android.com/google/play/billing/test).

The UI initially displays US$4.99, then uses `ProductDetails`' actual formatted Play price, including local currency. A US price is configured in Play Console, not forced by application code. See [Google Play one-time product setup](https://support.google.com/googleplay/android-developer/answer/1153481) and [Billing integration](https://developer.android.com/google/play/billing/integrate).

Purchase calls the native Play billing sheet. Only a matching purchased product/token/package is eligible; unacknowledged purchases are acknowledged before ownership is unlocked. Pending and cancelled purchases stay locked. Restore and resume query the signed-in Play account. Confirmed ownership removes banner and interstitial ads and survives offline restarts; a successful purchase query with no entitlement clears the cache. No WebView method grants ownership, and no purchase token is written to logs or game saves.

This release verifies native policy rules and unavailable-product behavior. **Live payment, pending-payment completion, refund and cross-device restore remain unverified until the product is active on Google Play.** Verification is currently client-side through Play Billing; there is no purchase-verification server. For publication, replace demo IDs with your AdMob units and complete the production signing, consent and store-data setup for those services.

## Verification

Run `npm test` and `android/gradlew.bat -p android testReleaseUnitTest`. After installing the APK on a dedicated emulator, set `ANDROID_SERIAL` and run `npm run qa:commerce`. It uses actual SDK ads and accessibility controls, and records screenshots plus callback logs. `node tools/android-layout-qa.mjs` switches that dedicated emulator between button and gesture navigation and compares real banner/WebView bounds with the system navigation frame. Run native UI checks sequentially. `npm run qa:tools` verifies cooking, carried gear, repair, migration and compact store tabs in the browser. The QA-only accessibility helper in `tools/android/` is not packaged with the game.
