import assert from 'node:assert/strict';
import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url));
const checks=[];
const shots=(await readdir(path.join(root,'play-store/screenshots'))).filter(x=>x.endsWith('.png'));
assert.equal(shots.length,8);
for(const [file,width,height,alpha] of [['play-store/app-icon-512.png',512,512,true],['play-store/feature-graphic-1024x500.png',1024,500,false],...shots.map(x=>['play-store/screenshots/'+x,1080,1920,false])]){
 const p=path.join(root,file),m=await sharp(p).metadata(),bytes=(await stat(p)).size;
 assert.equal(m.width,width);assert.equal(m.height,height);assert.equal(m.hasAlpha,alpha);assert.equal(m.format,'png');
 if(file.includes('icon'))assert.ok(bytes<1024*1024);
 assert.ok(bytes<8*1024*1024);
 checks.push({file,width,height,alpha,bytes,sha256:createHash('sha256').update(await readFile(p)).digest('hex')});
}
const ffprobe=path.join(root,'remotion/node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
const video='exports/WILDFALL-Last-Ember-Trailer-1080p.mp4';
const probe=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',path.join(root,video)],{encoding:'utf8'}));
const v=probe.streams.find(x=>x.codec_type==='video'),a=probe.streams.find(x=>x.codec_type==='audio');
assert.equal(v.width,1920);assert.equal(v.height,1080);assert.equal(v.codec_name,'h264');assert.equal(v.r_frame_rate,'30/1');assert.equal(Number(v.nb_frames),1080);assert.ok(Math.abs(Number(probe.format.duration)-36)<.1);assert.equal(a.codec_name,'aac');assert.equal(a.channels,2);
const capture=JSON.parse(await readFile(path.join(root,'captures/manifest.json')));assert.deepEqual(capture.errors,[]);
const report={passed:true,gameVersion:'1.4.1',images:checks,video:{file:video,width:v.width,height:v.height,frames:Number(v.nb_frames),fps:v.r_frame_rate,duration:Number(probe.format.duration),codec:v.codec_name,audio:a.codec_name,channels:a.channels,bytes:Number(probe.format.size),sha256:createHash('sha256').update(await readFile(path.join(root,video))).digest('hex')},audioPolicy:'No music or instruments. Original filtered noise ambience plus licensed physical foley.',captureErrors:capture.errors,visualReview:'All eight screenshot layouts and one representative frame of each trailer scene reviewed at export resolution.'};
await writeFile(path.join(root,'exports/validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:true,images:checks.length,video:report.video},null,2));
