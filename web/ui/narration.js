// One reusable media element: offline speech, never overlapping scenes.
let currentNarrator;
export function createNarrator({createAudio=()=>new Audio(),onPlaying=()=>{}}={}){
 const audio=createAudio();audio.preload='auto';audio.volume=.86;
 let src=null,enabled=true,suspended=false,resumeAfterPause=false,blocked=false,started=false,token=0,lastPlaying=null;
 const playing=()=>!!src&&started&&enabled&&!suspended&&!blocked&&!audio.paused&&!audio.ended;
 const sync=()=>{const active=playing();if(active!==lastPlaying){lastPlaying=active;onPlaying(active);}};
 audio.addEventListener('playing',()=>{started=true;sync();});
 for(const event of ['pause','ended'])audio.addEventListener(event,()=>{if(audio.paused||audio.ended)started=false;sync();});
 audio.addEventListener('error',()=>{if(src){blocked=true;sync();}});
 function play(){
  if(!src||!enabled||suspended)return;
  const request=++token;blocked=false;
  try{Promise.resolve(audio.play()).then(()=>{if(request===token){started=true;sync();}},()=>{if(request===token){blocked=true;audio.pause();sync();}});}catch{blocked=true;sync();}
 }
 const controller={
  update(scene,scenario,narrationEnabled=true){
   const next=scene?.voiceVariants?.[scenario]||scene?.voice||null;
   if(next===src&&enabled===narrationEnabled)return;
   ++token;resumeAfterPause=false;audio.pause();started=false;blocked=false;enabled=narrationEnabled;
   if(next!==src){src=next;audio.src=next||'';audio.load();}
   sync();if(src&&enabled)play();
  },
  replay(){if(src&&enabled&&!suspended){audio.currentTime=0;play();}},
  stop(){++token;resumeAfterPause=false;audio.pause();src=null;started=false;blocked=false;audio.removeAttribute?.('src');if(!audio.removeAttribute)audio.src='';audio.load();sync();},
  suspend(){if(suspended)return;resumeAfterPause=playing();suspended=true;++token;audio.pause();sync();},
  resume(){if(!suspended)return;suspended=false;const shouldPlay=resumeAfterPause;resumeAfterPause=false;if(shouldPlay&&src&&enabled&&!audio.ended)play();else sync();},
  status(){return {src,playing:playing(),blocked,enabled,suspended,time:audio.currentTime,duration:Number.isFinite(audio.duration)?audio.duration:null};}
 };
 currentNarrator=controller;return controller;
}
export const narrationDiagnostics=()=>currentNarrator?.status()||{src:null,playing:false};
