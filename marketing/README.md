# WILDFALL: Last Ember — English launch kit

Created for game v1.4.1. Art direction: charcoal, slate, bone, and burnished copper. Human faces stay concealed. The app icon is an original mountain / compass / ember emblem, with no person or face.

## Ready-to-upload images

- `play-store/app-icon-512.png` — 512 × 512, RGBA PNG, no pre-applied corner mask.
- `play-store/feature-graphic-1024x500.png` — 1024 × 500, RGB PNG.
- `play-store/screenshots/01-survive.png` through `08-journal.png` — eight 1080 × 1920 RGB PNGs in the intended narrative order.
- `exports/screenshots-contact-sheet.png` — review sheet, not a store upload.
- `play-store/captions.json` — English headlines and descriptions for each screenshot.

Image dimensions and formats were checked against the [Google Play preview-asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) and [icon specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications) on October 6, 2026. The feature graphic is a standard mobile listing graphic, not an Android TV launcher banner.

## Trailer

`exports/WILDFALL-Last-Ember-Trailer-1080p.mp4` — 36 seconds, 1920 × 1080, 30 fps, H.264 video with AAC stereo audio. `exports/trailer-thumbnail-1920x1080.png` is the companion thumbnail.

The first frame leads with **NIGHT IS COMING**. The story then moves through shelter, gathering, safe water, turn-based combat, exploration, and the rescue journal. Actual gameplay occupies 28.5 of the 36 seconds; key art appears in the opening and end card. Gameplay is presented as a portrait game, not as a fictitious open-world action game.

**Audio contains no music, instruments, notes, or melodic effects.** It uses an original noise-based wind/rain/fire bed and the game's licensed physical foley. There is no voiceover in this trailer. All English hooks are readable with the video muted.

Google Play's preview-video field uses a YouTube URL. Upload the MP4 to your own YouTube channel, follow the current [preview video requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), then supply that URL in Play Console. This kit does not publish to YouTube or Play Console.

## Authenticity and provenance

Screens and animation clips were captured from the actual v1.4.1 web game at a 412 × 760 mobile viewport, using controlled save fixtures to demonstrate features. The fixtures are not presented as one uninterrupted player run. No gameplay UI was reconstructed. Gather and water screenshot crops remove unused modal surround while preserving the complete real dialog. Captures and their manifest are retained in `captures/`.

The two new raster masters were generated with the built-in OpenAI image generation tool. Their complete prompts and constraints are in `prompts.json`; originals are in `source/`. Other illustrations are the game's existing generated art, tracked in `../art/catalog.json`. Local Outfit and Cormorant Garamond fonts retain their OFL licenses. Physical foley is Kenney CC0; licenses are bundled under `remotion/public/audio/`.

This is a marketing kit. It does not change game mechanics, saved games, Android version, or the installed launcher icon.

## Edit or rebuild

From the repository root, install the root dependencies and run the game preview with `npm start` before making new captures.

```powershell
node marketing/capture.mjs
cd marketing/remotion
npm ci
cd ../..
node marketing/prepare.mjs
node marketing/build-store.mjs
cd marketing/remotion
npm run dev -- --no-open
```

The Remotion project contains a complete parent trailer and eight individually editable scene compositions. Timing, text, artwork, clips, and foley are editable in source. No online services or API credentials are required to preview or render it.

```powershell
npx remotion render Wildfall-Trailer ../exports/WILDFALL-Last-Ember-Trailer-1080p.mp4 --codec=h264 --crf=17 --audio-bitrate=192k
```

`prepare.mjs` currently uses the Windows FFmpeg binary installed with Remotion. Browser capture uses the repository's browser-runtime helper. Preview-frame generation accepts `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when a browser path override is needed.
