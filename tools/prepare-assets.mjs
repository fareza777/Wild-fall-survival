import {mkdir,copyFile,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const catalog=JSON.parse(await readFile('art/catalog.json','utf8')),partial=process.argv.includes('--partial'),missing=[];
for(const e of catalog){
 try{await access(e.original);}catch{missing.push(e.key);continue;}
 await mkdir(path.dirname(e.output),{recursive:true});
 let image=sharp(e.original);image=e.kind==='world'?image.resize({width:e.width}):image.resize({width:e.width,height:e.width,fit:'inside'});
 await image.webp({quality:e.kind==='symbol'?92:85,alphaQuality:96,effort:5}).toFile(e.output);
}
const emblem='art/generated/brand/emblem.png';
try{await access(emblem);
 await sharp(emblem).resize(512,512).png().toFile('art/app-icon-512.png');
 for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){await mkdir(`android/res/mipmap-${density}`,{recursive:true});await sharp(emblem).resize(size,size).png().toFile(`android/res/mipmap-${density}/ic_launcher.png`);}
 await sharp(emblem).resize(288,288).png().toFile('android/res/drawable/ember.png');
}catch(error){if(!partial)throw error;}
await writeFile('art/PROMPTS.md','# WILDFALL — Ash & Copper art\n\nGenerated with the built-in imagegen tool. Original PNGs are preserved in generated/. Runtime WebP assets are resized and format-converted only. No semantic image manipulation was applied.\n\nThe full per-asset prompt, destination, size, and transparency specification is in [catalog.json](catalog.json). Art direction: obsidian, slate, ivory, and ember copper, tactile painterly realism. All humans have a hood, mask, or helmet concealing the face. Camp architecture and fire are separate layers driven by the simulation.\n\nThe title illustration depicts the intended survival atmosphere; it is separate from the state-driven camp view.\n');
console.log(`Prepared ${catalog.length-missing.length}/${catalog.length} generated assets. ${missing.length?'Missing: '+missing.join(', '):'All art present.'}`);
if(missing.length&&!partial)process.exitCode=1;
