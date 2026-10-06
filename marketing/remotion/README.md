# WILDFALL: Last Ember — Remotion source

A 36-second, 1920 × 1080 English trailer. Eight individually editable scenes sit inside the `Wildfall-Trailer` parent composition. The opening and closing use original generated key art; the six feature scenes use recordings of actual v1.4.1 gameplay.

## Preview

```
npm ci
npm run dev
```

## Export

```
npm run render
```

All assets are local in `public/`. No API key is needed. Audio uses unpitched nature ambience and CC0 physical foley only; there is no music or voiceover. Audio uses Remotion's HTML5 audio component because the media component timed out extracting the WAV weather bed on this Windows host. Video uses `@remotion/media`.

Fonts retain their OFL licenses under `public/fonts/`. Foley licenses are under `public/audio/`. Game art is original generated WILDFALL art; new emblem and key-art prompts are recorded in the parent launch kit's `prompts.json`.

For the store images, source art, capture scripts, and validation report, see the parent `marketing/README.md` in the game repository.
