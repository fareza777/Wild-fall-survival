import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
class FakeAudio extends EventTarget{
 paused=true;ended=false;src='';currentTime=0;plays=[];defer=null;
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 load(){this.currentTime=0;this.ended=false;}
 play(){this.plays.push(this.src);this.paused=false;this.dispatchEvent(new Event('playing'));return this.defer?this.defer():Promise.resolve();}
 finish(){this.ended=true;this.paused=true;this.dispatchEvent(new Event('ended'));}
}
const scene={id:'awakening',voice:'assets/audio/narration/awakening.mp3',voiceVariants:{cold_trail:'assets/audio/narration/awakening_cold_trail.mp3'}};
async function setup(){const {createNarrator}=await import('../web/ui/narration.js'),audio=new FakeAudio(),duck=[];return {audio,duck,voice:createNarrator({createAudio:()=>audio,onPlaying:active=>duck.push(active)})};}

test('a scene uses its matching offline voice, survives rerender, and replaces the previous scene',async()=>{
 const {audio,voice,duck}=await setup();voice.update(scene,'cold_trail',true);await Promise.resolve();
 assert.equal(audio.src,scene.voiceVariants.cold_trail);assert.equal(voice.status().playing,true);assert.equal(duck.at(-1),true);
 audio.currentTime=3;voice.update(scene,'cold_trail',true);assert.equal(audio.currentTime,3);assert.equal(audio.plays.length,1);
 voice.update({id:'signal',voice:'assets/audio/narration/signal.mp3'},'cold_trail',true);await Promise.resolve();assert.equal(audio.currentTime,0);assert.equal(audio.plays.length,2);
 voice.stop();assert.equal(audio.paused,true);assert.equal(voice.status().src,null);assert.equal(duck.at(-1),false);
});
test('narration setting, replay, natural end and lifecycle restore independent speech safely',async()=>{
 const {audio,voice,duck}=await setup();voice.update(scene,'last_ember',true);await Promise.resolve();
 audio.currentTime=4;voice.suspend();assert.equal(audio.paused,true);assert.equal(duck.at(-1),false);
 voice.resume();await Promise.resolve();assert.equal(audio.currentTime,4);assert.equal(audio.paused,false);
 audio.finish();assert.equal(voice.status().playing,false);voice.resume();assert.equal(audio.paused,true,'Completed speech must not restart when the app resumes');
 voice.replay();await Promise.resolve();assert.equal(audio.currentTime,0);assert.equal(audio.paused,false);
 voice.update(scene,'last_ember',false);assert.equal(audio.paused,true);voice.resume();assert.equal(audio.paused,true);
 voice.update(scene,'last_ember',true);await Promise.resolve();assert.equal(audio.paused,false);
 voice.stop();voice.resume();assert.equal(audio.paused,true);
});
test('a late autoplay rejection from an old scene cannot block a newer playing voice',async()=>{
 const {audio,voice}=await setup();let rejectOld;audio.defer=()=>new Promise((resolve,reject)=>rejectOld=reject);
 voice.update(scene,'last_ember',true);audio.defer=null;voice.update({id:'signal',voice:'assets/audio/narration/signal.mp3'},'last_ember',true);await Promise.resolve();
 rejectOld(new Error('old playback interrupted'));await Promise.resolve();await Promise.resolve();assert.equal(voice.status().playing,true);assert.equal(voice.status().blocked,false);
});
test('autoplay denial leaves subtitles usable and permits an explicit replay',async()=>{
 const {audio,voice,duck}=await setup();audio.defer=()=>Promise.reject(new Error('NotAllowedError'));voice.update(scene,'last_ember',true);await Promise.resolve();await Promise.resolve();
 assert.equal(voice.status().blocked,true);assert.equal(voice.status().playing,false);assert.equal(duck.at(-1),false);
 audio.defer=null;voice.replay();await Promise.resolve();assert.equal(voice.status().blocked,false);assert.equal(voice.status().playing,true);
});
test('all seven ElevenLabs speech files match the authored English subtitles and recorded hashes',async()=>{
 const story=JSON.parse(await readFile('web/data/story.json','utf8')),manifest=JSON.parse(await readFile('web/assets/audio/narration/manifest.json','utf8'));let count=0;
 assert.equal(manifest.provider,'ElevenLabs');assert.equal(manifest.music,false);
 for(const scene of story)for(const [variant,text] of Object.entries({default:scene.text,...scene.variants})){
  const path=variant==='default'?scene.voice:scene.voiceVariants[variant],id=scene.id+(variant==='default'?'':'_'+variant),clip=manifest.clips[id],audio=await readFile('web/'+path);
  assert.equal(clip.script,scene.title+' '+text);assert.equal(createHash('sha256').update(audio).digest('hex'),clip.sha256);assert.ok(audio.length>10000);count++;
 }
 assert.equal(count,7);
});
