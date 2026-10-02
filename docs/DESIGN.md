# WILDFALL: Last Ember — design

The survivor is stranded in Ashen Valley. Rebuild camp, follow ranger clues, recover radio parts and transmit from Hope Summit. Rescue unlocks endless survival. Eight connected locations support three starting scenarios, three difficulty levels and optional permadeath.

Simulation is independent of presentation: dependency-free ES modules, seeded random decisions and JSON catalogs. Every accepted action advances time, metabolism and exposure. Weather, equipment, shelter, fuel, fatigue, injury, sickness and pack capacity change outcomes. Refused actions are atomic. Only actions advance the clock; menus and animations do not. Save before animation and retain a compatible dawn checkpoint for recovery.

The English interface uses charcoal, slate, ivory and copper. Tactile generated item art, cinematic environments and fully concealed survivor faces support a minimal atmospheric direction. Camp buildings and a lit/extinguished fire are driven by state, rather than painted into its background. Cormorant Garamond headings and Outfit body text are bundled locally.

Operational screens are short: one-tap regular actions, adaptive inventory pages, two recipe cards per mobile page, category selectors, a single quest card with chapter controls and a compact location map. Detailed costs and item properties open on demand. The main controls remain visible on small phones; larger text and OS/app reduced motion are supported. Sleep, travel and exceptional fatal actions retain preparation details.

Battle uses turn-by-turn actor motion, recoils, actual HP deltas, guard, retreat and defeat. Gathering, cooking, crafting, consumption, travel and recovery receive restrained action motion. All presentation reflects simulation results and prevents overlapping input.

Audio contains natural textures and physical foley only. No musical instruments, melodies, beeps or pitched oscillators. Separate effects and ambience volumes, scene crossfades and background suspension are functional. Wind, river, rain and fire respond to location, weather and camp fuel.

The small Java WebView host loads bundled files on a local HTTPS origin and rejects external navigation. No network permission is required. Native backup, haptics, Back handling and the share sheet are included. Rating remains device-local until a store listing exists.

Validation covers deterministic survival behavior, invalid saves, seeded invariants, full public-action rescue routes, content/art/audio references, compact browser UI and offline Android integration. APK signing, alignment and byte-for-byte source asset matching are checked. Evidence and remaining limitations are in VERIFICATION.md.
