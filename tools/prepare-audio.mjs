import { mkdir,copyFile,writeFile } from 'node:fs/promises';
await mkdir('web/assets/audio',{recursive:true});
const files={
tap:['rpg','cloth1'],pack:['rpg','handleSmallLeather'],equip:['rpg','beltHandle1'],swing:['rpg','knifeSlice'],draw:['rpg','drawKnife1'],chop:['rpg','chop'],leaf:['rpg','cloth4'],step1:['impact','footstep_grass_000'],step2:['impact','footstep_grass_002'],snowstep:['impact','footstep_snow_001'],hit:['impact','impactPunch_medium_001'],heavy:['impact','impactPunch_heavy_002'],guard:['impact','impactSoft_medium_001'],mine:['impact','impactMining_001'],craft:['impact','impactWood_light_001'],book:['rpg','bookFlip1']
};
for(const [id,[pack,name]] of Object.entries(files))await copyFile(`.build/audio/${pack}/Audio/${name}.ogg`,`web/assets/audio/${id}.ogg`);
await copyFile('.build/audio/rpg/License.txt','web/assets/audio/LICENSE-RPG.txt');
await copyFile('.build/audio/impact/License.txt','web/assets/audio/LICENSE-Impact.txt');
await writeFile('web/assets/audio/SOURCES.md','# Foley sources\n\nKenney RPG Audio: https://kenney.nl/assets/rpg-audio\n\nKenney Impact Sounds: https://kenney.nl/assets/impact-sounds\n\nCC0. Only physical foley samples listed in tools/prepare-audio.mjs are included. No bell, instrument, music, melodic UI, or tonal notification files are bundled.\n\nWind, rain, river, fire, pouring, and eating effects use original filtered broadband noise in web/ui/audio.js. No oscillators or pitched notes.\n');
console.log('16 physical foley effects packaged with CC0 license files.');
