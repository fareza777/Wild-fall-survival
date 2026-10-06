import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {launchBrowser} from '../tools/browser-runtime.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const asset=p=>pathToFileURL(path.join(root,'remotion/public',p)).href;
const specs=[
 ['01-survive','Survive the night.','Earn the dawn.','A wilderness survival simulation','camp'],
 ['02-shelter','A little shelter.','A fighting chance.','Build. Keep warm. Weather the storm.','camp'],
 ['03-gather','Every find','buys you time.','Gather supplies. Spend your energy wisely.','forest'],
 ['04-craft','Make the tools.','Make it through.','Craft equipment that keeps you alive.','forest'],
 ['05-battle','Think first.','Strike second.','Prepare for turn-based encounters.','forest'],
 ['06-water','Safe water.','Another tomorrow.','Craft your cookware. Boil before you drink.','river'],
 ['07-explore','Beyond camp,','nothing is certain.','Discover eight connected locations.','summit'],
 ['08-journal','Follow the clues.','Find a way home.','Uncover the path to rescue, chapter by chapter.','ruins']
];
const base=`@font-face{font-family:Outfit;src:url('${asset('fonts/outfit.ttf')}')}@font-face{font-family:Cormorant;src:url('${asset('fonts/cormorant-garamond.ttf')}')}*{box-sizing:border-box}body{margin:0;background:#101115;color:#f2e9d8;font-family:Outfit;overflow:hidden}.canvas{width:1080px;height:1920px;position:relative;overflow:hidden}.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.36;filter:saturate(.5)}.veil{position:absolute;inset:0;background:linear-gradient(180deg,#101115aa 0%,#101115aa 20%,#101115d9 70%,#101115 100%)}.brand{position:absolute;top:48px;left:64px;right:64px;display:flex;align-items:center;justify-content:space-between;font-size:24px;letter-spacing:5px;color:#d7b087}.brand span{font-size:19px;letter-spacing:3px;color:#b0a59a}.copy{position:absolute;top:126px;left:60px;right:60px;text-align:center}h1{font:600 93px/.94 Cormorant;margin:0;letter-spacing:-2px}h1 em{font-style:normal;color:#d9af7f}p{font-size:27px;margin:26px 0 0;color:#c7bcb0;letter-spacing:.1px}.game{position:absolute;left:150px;top:410px;width:780px;height:auto;border:1px solid #8c68475c;border-radius:21px;box-shadow:0 30px 100px #000c}.foot{position:absolute;left:64px;right:64px;bottom:23px;display:flex;align-items:center;justify-content:space-between;color:#8f8172;font-size:17px;letter-spacing:2px}.line{height:1px;background:#9c775550;width:620px}.items{position:absolute;top:414px;left:205px;width:670px;height:330px;display:flex;align-items:center;justify-content:center}.items img{width:245px;filter:drop-shadow(0 20px 35px #000)}.detail{top:790px;left:100px;width:880px;border:0;border-radius:36px}.water{top:474px;left:100px;width:880px;border:0;border-radius:36px}`;
const browser=await launchBrowser(),page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await mkdir(path.join(root,'play-store/screenshots'),{recursive:true});
async function render(html,target,w=1080,h=1920){await page.setViewportSize({width:w,height:h});const file=path.join(root,'.store-layout.html');await writeFile(file,html);await page.goto(pathToFileURL(file).href);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:target});await sharp(target).removeAlpha().png({compressionLevel:9}).toFile(target+'.tmp');await (await import('node:fs/promises')).rename(target+'.tmp',target);}
try{
 for(let i=0;i<specs.length;i++){
  const [id,a,b,sub,bg]=specs[i];const special=i===2?'detail':i===5?'water':'';const img=i===2?'gather-detail':i===5?'water-detail':id;
  const html=`<!doctype html><meta charset="utf-8"><style>${base}</style><div class="canvas"><img class="bg" src="${asset('art/'+bg+'.webp')}"><div class="veil"></div><div class="brand">WILDFALL<span>LAST EMBER</span></div><div class="copy"><h1>${a}<br><em>${b}</em></h1><p>${sub}</p></div>${i===2?`<div class="items"><img src="${asset('art/wood.webp')}"><img src="${asset('art/fiber.webp')}"></div>`:''}<img class="game ${special}" src="${asset('screens/'+img+'.png')}"><div class="foot">ACTUAL GAMEPLAY<div class="line"></div>${String(i+1).padStart(2,'0')} / 08</div></div>`;
  await render(html,path.join(root,`play-store/screenshots/${id}.png`));
 }
 const banner=`<!doctype html><meta charset="utf-8"><style>${base}.banner{width:1024px;height:500px;position:relative;overflow:hidden}.banner>img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(90deg,#080d16c9,#080d1600 75%)}.title{position:absolute;left:72px;top:133px;font:600 83px/.9 Cormorant;letter-spacing:1px}.sub{font:300 21px Outfit;letter-spacing:11px;margin:20px 0 0 7px;color:#d3a370}.tag{font:300 19px Outfit;letter-spacing:1px;margin-top:36px;color:#eee3d1}</style><div class="banner"><img src="${asset('art/hero.jpg')}"><div class="shade"></div><div class="title">WILDFALL<div class="sub">LAST EMBER</div><div class="tag">How far will one ember take you?</div></div></div>`;
 await render(banner,path.join(root,'play-store/feature-graphic-1024x500.png'),1024,500);
 const thumb=banner.replaceAll('1024px','1920px').replaceAll('500px','1080px').replace('left:72px;top:133px','left:145px;top:360px').replace('600 83px','600 165px').replace('300 21px','300 36px').replace('300 19px','300 32px');
 await render(thumb,path.join(root,'exports/trailer-thumbnail-1920x1080.png'),1920,1080);
 const tiles=await Promise.all(specs.map(async([id],i)=>({input:await sharp(path.join(root,`play-store/screenshots/${id}.png`)).resize(270,480).toBuffer(),left:(i%4)*282+12,top:Math.floor(i/4)*492+12})));
 await sharp({create:{width:1140,height:996,channels:3,background:'#191b20'}}).composite(tiles).png().toFile(path.join(root,'exports/screenshots-contact-sheet.png'));
 await writeFile(path.join(root,'play-store/captions.json'),JSON.stringify(specs.map(([file,a,b,description])=>({file:`screenshots/${file}.png`,headline:a+' '+b,description})),null,2));
}finally{await browser.close();}
console.log('8 store screenshots, feature graphic, trailer thumbnail and contact sheet exported.');
