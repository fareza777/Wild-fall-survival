# Foley sources

Kenney RPG Audio: https://kenney.nl/assets/rpg-audio

Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds

CC0. Only physical foley samples listed in tools/prepare-audio.mjs are included. No bell, instrument, music, melodic UI, or tonal notification files are bundled.

Wind, rain, river, fire, pouring, and eating effects use original filtered broadband noise in web/ui/audio.js. No oscillators or pitched notes.

## Prologue narration

Seven English speech clips generated through the ElevenLabs Text-to-Speech API using the stock George voice and `eleven_multilingual_v2`. Each recording reads the matching original scene title and subtitles, including the Riverborn and Cold Trail variants. Voice settings, scripts, hashes and sizes are recorded in `narration/manifest.json`. These generated recordings are not part of the CC0 foley collection.

Speech only, without backing music or instrument sounds. The recordings are packaged offline; the game never calls ElevenLabs. `tools/generate-narration.py` accepts a hidden API key at generation time and never writes it to source, metadata or the APK.

API documentation: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
