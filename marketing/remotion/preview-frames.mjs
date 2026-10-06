import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const browserExecutable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Users/FAJAR/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
const composition=await selectComposition({serveUrl,id:'Wildfall-Trailer',browserExecutable});
await mkdir('../exports/frames',{recursive:true});
for(const frame of [40,170,350,480,620,790,920,1010]){
 await renderStill({serveUrl,composition,frame,output:`../exports/frames/${frame}.png`,browserExecutable});console.log(`Preview frame ${frame}`);
}
