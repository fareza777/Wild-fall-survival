import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
const base=path.dirname(fileURLToPath(import.meta.url)),repo=path.dirname(base),pub=path.join(base,'remotion/public');
for(const dir of ['art','screens','clips','fonts','audio'])await mkdir(path.join(pub,dir),{recursive:true});
await mkdir(path.join(base,'play-store'),{recursive:true});
await sharp(path.join(base,'source/app-icon-master.png')).resize(512,512).ensureAlpha().png({compressionLevel:9}).toFile(path.join(base,'play-store/app-icon-512.png'));
await sharp(path.join(base,'source/app-icon-master.png')).resize(1024,1024).png().toFile(path.join(pub,'art/icon.png'));
await sharp(path.join(base,'source/key-art-master.png')).resize(1920,1080,{fit:'cover'}).jpeg({quality:94}).toFile(path.join(pub,'art/hero.jpg'));
for(const name of ['camp','forest','river','ruins','summit'])await copyFile(path.join(repo,`web/assets/art/locations/${name}.webp`),path.join(pub,`art/${name}.webp`));
for(const name of ['wood','fiber','axe','cooking_pot','water','radio'])await copyFile(path.join(repo,`web/assets/art/items/${name}.webp`),path.join(pub,`art/${name}.webp`));
for(const name of ['wolf','bear'])await copyFile(path.join(repo,`web/assets/art/enemies/${name}.webp`),path.join(pub,`art/${name}.webp`));
await copyFile(path.join(repo,'web/assets/art/story/wreck.webp'),path.join(pub,'art/wreck.webp'));
for(const name of ['outfit.ttf','cormorant-garamond.ttf','OFL-Outfit.txt','OFL-Cormorant.txt']){
 const source=path.join(repo,'web/assets/fonts',name),dest=path.join(pub,'fonts',name);
 if(name.endsWith('.txt'))await writeFile(dest,(await readFile(source,'utf8')).split(/\r?\n/).map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');
 else await copyFile(source,dest);
}
for(const name of ['chop','leaf','craft','swing','hit','guard','step','book']){
 try{await copyFile(path.join(repo,`web/assets/audio/${name}.ogg`),path.join(pub,`audio/${name}.ogg`));}catch{}
}
for(const name of ['LICENSE-Impact.txt','LICENSE-RPG.txt','SOURCES.md'])await writeFile(path.join(pub,'audio',name),(await readFile(path.join(repo,'web/assets/audio',name),'utf8')).split(/\r?\n/).map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');
const manifest=JSON.parse(await readFile(path.join(base,'captures/manifest.json')));
for(const name of manifest.shots)await copyFile(path.join(base,`captures/${name}.png`),path.join(pub,`screens/${name}.png`));
// Focus crops preserve the complete actual modal; only unused black surround is removed.
await sharp(path.join(base,'captures/03-gather.png')).extract({left:26,top:570,width:772,height:924}).png().toFile(path.join(pub,'screens/gather-detail.png'));
await sharp(path.join(base,'captures/06-water.png')).extract({left:26,top:346,width:772,height:1148}).png().toFile(path.join(pub,'screens/water-detail.png'));
const ffmpeg=path.join(base,'remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
for(const clip of manifest.clips){execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error','-ss',String(clip.offset),'-i',path.join(base,'recordings',clip.file),'-t',String(clip.duration),'-vf','crop=412:760:0:0,scale=824:1520:flags=lanczos','-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',path.join(pub,`clips/${clip.mode}.mp4`)],{stdio:'inherit'});}
// Original unpitched weather bed. Noise-only synthesis: no oscillator, notes or instruments.
const rate=48000,seconds=36,n=rate*seconds,pcm=Buffer.alloc(n*4);let seed=7103,low=0,lowR=0,fire=0;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
for(let i=0;i<n;i++){
 const t=i/rate,a=rand(),b=rand();low=.996*low+.004*a;lowR=.996*lowR+.004*b;
 const rain=t<8.5?.055:t<24?.012:.02;
 if(rand()>.9998)fire=.25+Math.abs(rand())*.3;fire*=.986;
 const fireGain=t>3.5&&t<18.5?.12:.025;
 const fade=Math.min(1,t/.3,(seconds-t)/1.5);
 const l=(low*1.2+a*rain+fire*a*fireGain)*fade,r=(lowR*1.2+b*rain+fire*b*fireGain)*fade;
 pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,l))*32767),i*4);pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,r))*32767),i*4+2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
await writeFile(path.join(pub,'audio/nature-bed.wav'),Buffer.concat([header,pcm]));
console.log('Store icon, licensed assets, actual gameplay clips and non-musical nature bed prepared.');
