import sharp from 'sharp';
import {readFile,access,mkdir} from 'node:fs/promises';
const all=JSON.parse(await readFile('art/catalog.json','utf8'));
await mkdir('test-results',{recursive:true});
for(const category of ['item','enemy','survivor','structure','world','symbol']){
 const entries=[];for(const e of all.filter(e=>e.kind===category)){try{await access(e.output);entries.push(e);}catch{}}
 if(!entries.length)continue;const cols=category==='world'?3:6,w=category==='world'?300:155,h=category==='world'?222:180,rows=Math.ceil(entries.length/cols),layers=[];
 for(let i=0;i<entries.length;i++){const e=entries[i],left=i%cols*w,top=Math.floor(i/cols)*h;const picture=await sharp(e.output).resize(w-16,h-40,{fit:'contain',background:'#1b171f'}).png().toBuffer();layers.push({input:picture,left:left+8,top:top+5});const label=Buffer.from(`<svg width="${w}" height="25"><text x="${w/2}" y="18" fill="#d6b791" font-size="12" font-family="Arial" text-anchor="middle">${e.key.split('/').at(-1)}</text></svg>`);layers.push({input:label,left,top:top+h-30});}
 await sharp({create:{width:w*cols,height:h*rows,channels:4,background:'#1b171f'}}).composite(layers).png().toFile(`test-results/art-${category}.png`);
}
console.log('Art contact sheets prepared.');
