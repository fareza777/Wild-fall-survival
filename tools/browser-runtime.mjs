import {chromium} from 'playwright';
import {access,readdir} from 'node:fs/promises';
import path from 'node:path';
export async function launchBrowser(options={}){
 let executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
 if(!executablePath){try{await access(chromium.executablePath());}catch{
  const root=process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'ms-playwright');
  if(root)for(const dir of (await readdir(root)).filter(n=>n.startsWith('chromium-')).sort().reverse())for(const child of ['chrome-win64/chrome.exe','chrome-win/chrome.exe']){const file=path.join(root,dir,child);try{await access(file);executablePath=file;break;}catch{}}
 }}
 return chromium.launch({headless:true,...options,...(executablePath?{executablePath}:{})});
}
