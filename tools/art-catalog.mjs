import { mkdir, writeFile } from 'node:fs/promises';

const objects = {
  wood:'three split pieces of weathered firewood, pale exposed grain and charcoal bark, loosely tied with twine',
  stone:'three angular flint river stones, slate gray, fine mineral edges',
  fiber:'a neat coil of pale hand-twisted plant fiber cord with loose dried stalks',
  herbs:'a small tied bundle of dried medicinal sage and tiny ivory blossoms, silver gray leaves, no green',
  scrap:'a small pile of salvaged iron brackets, bent rivets and rusted metal strips, copper patina',
  ore:'a rough charcoal rock with bright natural copper mineral veins',
  hide:'a folded tawny animal hide with textured fur and leather underside',
  berries:'a small handful of deep burgundy wild berries with a twig, no green leaves',
  mushroom:'three beige woodland mushrooms, one sliced cap, elegant tactile detail',
  ration:'a sealed weathered kraft-paper emergency food packet tied with twine, entirely unlabelled',
  raw_meat:'a clean raw red venison steak on a small dark slate, tasteful food illustration, no blood splashes',
  cooked_meat:'a beautifully grilled venison steak with charred edges on a small slate, subtle warm steam',
  fish:'one fresh silvery trout, full body diagonal, metallic scales, no blood',
  cooked_fish:'one roasted golden trout on a small slate, charred skin, subtle warm steam',
  stew:'a rustic dark iron bowl of mushroom stew with soft warm steam',
  water:'a clear glass field-water bottle with cork, pristine transparent water and ivory reflections',
  dirty_water:'a battered translucent field-water bottle containing cloudy brown river water, cork closure',
  tea:'a small enamel camp mug containing warm amber herbal tea with gentle steam',
  bandage:'a rolled clean ivory linen bandage with a loose folded strip',
  medicine:'a tiny amber apothecary bottle with cork and two pale tablets beside it, no label',
  knife:'a rugged survival knife with dark wrapped leather handle, scratched steel blade, diagonal full view',
  axe:'one primitive stone axe with chipped flint head lashed to wood with pale cord, diagonal full view',
  iron_axe:'one forged iron camp axe, dark steel head with copper scratches, seasoned wood handle, diagonal full view',
  spear:'one full-length handmade survival spear with dark wooden shaft, flint tip and twine bindings, diagonal full view',
  bow:'one complete curved ash-wood hunting recurve bow, dark leather grip and taut ivory bowstring, diagonal',
  arrows:'three complete handmade arrows with flint tips and ivory feather fletching, diagonal bundle',
  jacket:'a dark weathered leather survival jacket with deep black hood and scarf, EMPTY garment, no mannequin head or person',
  insulated:'a thick graphite alpine coat with large fur-lined BLACK hood, folded dark mask scarf, EMPTY garment, no head or person',
  fishing_rod:'one handmade fishing rod with wood handle, simple line spool and fine coiled line, full diagonal view',
  torch:'a wrapped wooden survival torch with a small controlled copper flame, full diagonal view',
  backpack:'a premium rugged charcoal canvas field backpack with buckled copper hardware and leather straps',
  trap:'a handmade loop snare of pale fiber cord tied to a short wooden trigger, clearly legible loop',
  journal:'a closed weathered leather ranger field notebook with copper compass clasp, no writing',
  radio_part:'a salvaged radio circuit module with copper coils, dark circuit board and ivory ceramic parts, no green',
  battery:'a handmade compact battery with two copper terminals and dark iron casing, leather-wrapped',
  radio:'a vintage rugged emergency radio with dark charcoal casing, copper dial and long antenna, no lettering'
};
const structures={
  firepit:'a low stone fire ring with stacked wood and a small copper ember fire',
  shelter:'a primitive A-frame tarp shelter, ash-gray canvas, dark poles, bedroll visible inside',
  shelter2:'a small sturdy wilderness cabin built from dark logs with a pitched roof and amber-lit doorway',
  shelter3:'an insulated alpine survival lodge of weathered dark timber and stone, snow on roof, warm window light',
  rain_collector:'a handmade rain collector, stretched ivory canvas funnel on dark poles draining into a metal barrel',
  garden:'a small raised woodland garden bed of dark timber with silvery medicinal herbs and dried berry shrubs'
};
const worlds={
  camp:'an EMPTY alpine camp clearing on a broad slate ledge in the right foreground, NO shelter, NO cabin, NO campfire, NO tent, NO people; dramatic pale ivory peaks across a misty charcoal pine valley, moonlit ash-gray landscape, warm copper horizon, clear flat foreground to place modular camp objects',
  forest:'dense charcoal pine forest, fog flowing between tall trunks, narrow wilderness trail, scattered pale stones, tiny warm copper trail ribbon',
  river:'quiet silvery alpine river winding between slate river stones and charcoal pines, pale mountains in mist, warm dawn horizon',
  cabin:'an abandoned weathered dark timber ranger cabin on a rocky forest clearing, broken amber-glass window, quiet ash-colored mist',
  mountain:'dramatic cold alpine ridge trail above a cloud sea, monumental ivory snow mountains, charcoal crags and a tiny copper trail marker',
  cave:'interior of an immense rugged slate cavern, copper ore veins in rocks, one small amber torch near entrance, mist and light shafts, beautiful dark stone texture',
  ruins:'abandoned northern radio station ruins, dark stone walls, bent steel communication mast, copper rust, alpine fog, beautiful dramatic negative space',
  summit:'vast ivory alpine summit above clouds, modest old radio mast on slate rocks, tiny copper pennant, luminous dawn horizon and distant cold mountain peaks'
};
const enemies={wolf:'a powerful gray wilderness wolf, full body three-quarter view, thick silver ash fur, alert predatory stance, amber eyes, subtle breath mist',boar:'a formidable wild boar, full body three-quarter view, dark charcoal bristles, ivory tusks, powerful shoulders, natural proportions',bear:'a huge formidable grizzly bear, full body three-quarter view, dark ash-brown fur, powerful shoulders and paws, slight breath mist, natural proportions'};
const symbols={
  compass:'an engraved copper wilderness compass rose, four clear cardinal points and ivory inner needle',
  heart:'one sculptural ivory heart shape with a fine copper seam, unmistakable health pictogram',
  lightning:'one bold ivory lightning bolt with thin copper beveled edges, unmistakable energy pictogram',
  thermometer:'one simple ivory glass thermometer with copper bulb, clean temperature pictogram',
  moon:'one luminous ivory crescent moon, subtle copper edge, clean sleep pictogram',
  sun:'one ivory sun disk surrounded by eight short copper rays, clean weather pictogram',
  cloud:'one softly sculpted ivory cloud with copper edge, clean cloudy weather pictogram',
  'cloud-fog':'one ivory cloud above three simple horizontal gray fog lines, clear pictogram',
  'cloud-rain':'one ivory cloud above three copper rain drops, clear pictogram',
  'cloud-lightning':'one ivory storm cloud with a copper lightning bolt below, clear pictogram',
  snowflake:'one bold symmetrical ivory six-point snowflake with subtle copper bevel, clean pictogram',
  hammer:'one dark steel crafting hammer with copper handle, diagonal clear silhouette',
  shield:'one simple dark iron shield with ivory edge and a copper center ridge, clean armor pictogram',
  clock:'one ivory clock face with two bold copper hands, no numbers, simple clean time pictogram',
  flag:'one copper trail pennant on a simple ivory pole, clean quest pictogram',
  mountains:'two angular ivory snow mountain peaks with dark slate bases, clean location pictogram',
  'paw-print':'one bold ivory animal paw print with four toes and a copper edge, clean wildlife pictogram',
  flame:'one elegant copper-amber campfire flame above two crossed dark charcoal sticks, clean ember pictogram'
};
const asset=(key,subject,kind)=>{
  const base=kind==='world'?'Original premium atmospheric 2D survival game environment illustration, cinematic wide landscape 3:2 composition. ':kind==='symbol'?'Original premium 2D survival game UI pictogram, square composition, bold simple unmistakable shape, legible at 24 pixels. ':'Original premium 2D survival game collectible inventory illustration, square composition, one centered complete object occupying 78% of frame with generous empty margin. ';
  const prompt=base+subject+'. Sophisticated painterly realism, beautiful tactile material textures, restrained cinematic soft rim lighting. Obsidian, slate gray, bone ivory and ember copper palette. NO GREEN, no teal, no purple, no neon. '+(kind==='world'?'Quiet atmosphere, layered fog, nuanced detail, room for UI overlay. No humans. No text, lettering, UI, frame or watermark.':'Isolated on fully transparent background, subtle contact shadow only, no ground plane or scenery. No text, lettering, UI, frame, badge or watermark. Crisp silhouette, not cropped. No people, skin, eyes or faces.');
  return {key,kind,prompt,transparent:kind!=='world',original:`art/generated/${key}.png`,output:`web/assets/art/${key}.webp`,width:kind==='world'?1440:kind==='symbol'?128:384};
};
const catalog=[...Object.entries(objects).map(([id,s])=>asset(`items/${id}`,s,'item')),...Object.entries(structures).map(([id,s])=>asset(`structures/${id}`,s,'structure')),...Object.entries(worlds).map(([id,s])=>asset(`locations/${id}`,s,'world')),...Object.entries(enemies).map(([id,s])=>asset(`enemies/${id}`,s,'enemy')),...Object.entries(symbols).map(([id,s])=>asset(`symbols/${id}`,s,'symbol'))];
catalog.push(asset('structures/firepit_cold','a low stone fire ring with black charred sticks and cold white ash inside, absolutely NO flame, NO embers, NO glow, extinguished campfire','structure'));
catalog.push({key:'brand/title',kind:'world',prompt:'Premium atmospheric alpine survival title illustration: charcoal pines, ivory snow peaks, tiny ash-gray shelter and copper campfire on a ledge. A small black-hooded survivor with face fully concealed. Obsidian, ivory, copper palette, no green. Cinematic painterly realism. No text or UI.',transparent:false,original:'art/generated/brand/title.png',output:'web/assets/camp.webp',width:1600});
for(const [id,desc] of Object.entries({last_ember:'a rugged solitary pilot survivor wearing a deep black hood, matte black scarf and charcoal canvas coat with copper buckles',riverborn:'a resilient river wanderer wearing a dark hooded oilskin cloak and a black cloth mask, worn ivory straps and copper buckles',cold_trail:'an alpine survivor wearing a graphite fur-lined hood, dark helmet goggles and a FULL black face covering'}))catalog.push({key:`survivors/${id}`,kind:'survivor',prompt:`Original premium atmospheric 2D survival game character portrait, vertical square bust of ${desc}. FACE COMPLETELY HIDDEN, no facial features, no exposed eyes, no skin, no visible full face. Head inside deep pitch black shadow. Beautiful textured painterly realism, cinematic copper rim light, obsidian charcoal and ivory palette, NO GREEN, no neon. Isolated on transparent background. No text, logo, border or UI. Centered full hood and shoulders with margin.`,transparent:true,original:`art/generated/survivors/${id}.png`,output:`web/assets/art/survivors/${id}.webp`,width:512});
catalog.push({key:'brand/emblem',kind:'brand',prompt:'Create original premium Android survival game app icon for WILDFALL Last Ember. Square full-bleed obsidian charcoal textured stone background, centered bold elegant copper amber flame shaped like a mountain peak above two crossed ivory-charcoal branches, simple striking emblem readable at 48px. Embossed tactile copper-metal effect with controlled warm glow and subtle ivory highlights. Beautiful luxury game mark, restrained geometry, sophisticated handcrafted look. No green, teal, purple or neon. No lettering, words, UI, border or watermark. Edge to edge square, no rounded corners.',transparent:false,original:'art/generated/brand/emblem.png',output:'web/assets/icon.webp',width:256});
await mkdir('art',{recursive:true});
await writeFile('art/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(catalog));
