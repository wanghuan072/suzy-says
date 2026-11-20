import fs from 'node:fs';
import {parse} from 'parse5';
import sharp from 'sharp';
const dir='research/real-media-20261119';fs.mkdirSync(dir,{recursive:true});
const games=[['suzy-says','https://moonbit.itch.io/suzy-says'],['assessment-examination','https://wenderlygames.itch.io/assessment-examination'],['please-answer-carefully','https://litrouke.itch.io/please-answer-carefully'],['last-seen-online','https://qwook.itch.io/last-seen-online'],['the-open-house','https://corpsepile.itch.io/the-open-house'],['bad-ben','https://corpsepile.itch.io/bad-ben'],['uncle-nintendo','https://ztul.itch.io/the-uncle-who-works-for-nintendo'],['exhibit-of-sorrows','https://adayofjoy.itch.io/exhibit-of-sorrows'],['burger-frights','https://donitz.itch.io/burger-frights']];
const index=[];
for(const [id,url] of games){
 try{
  const res=await fetch(url,{signal:AbortSignal.timeout(20000)});const html=await res.text();fs.writeFileSync(`${dir}/${id}.html`,html);
  if(!res.ok)throw Error('HTTP '+res.status);
  const found={id,sourcePage:url,status:res.status,accessedAt:new Date().toISOString(),cover:null,screens:[],otherImages:[]};
  function walk(n){const a=Object.fromEntries((n.attrs??[]).map(a=>[a.name,a.value]));
   if(n.tagName==='meta'&&(a.property==='og:image'||a.name==='twitter:image'))found.cover??=a.content;
   if(n.tagName==='a'&&a['data-image_lightbox']==='true'&&a.href)found.screens.push(a.href);
   if(n.tagName==='img'&&a.src?.startsWith('https://img.itch.zone/'))found.otherImages.push({src:a.src,alt:a.alt});
   for(const c of n.childNodes??[])walk(c);
  }walk(parse(html));
  found.screens=[...new Set(found.screens)];found.assets=[];
  for(const [kind,assetUrl] of [['cover',found.cover],...found.screens.map((s,i)=>['screen-'+(i+1),s])]){
   if(!assetUrl)continue;try{const img=await fetch(assetUrl,{signal:AbortSignal.timeout(20000)});if(!img.ok)throw Error('HTTP '+img.status);const b=Buffer.from(await img.arrayBuffer());const m=await sharp(b).metadata();const file=`${dir}/${id}-${kind}.webp`;await sharp(b).resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toFile(file);const out=await sharp(file).metadata();found.assets.push({kind,url:assetUrl,file,width:out.width,height:out.height,originalWidth:m.width,originalHeight:m.height,pages:m.pages??1,conversion:'Original first frame, aspect preserved, no crop or visual additions'});}catch(e){found.assets.push({kind,url:assetUrl,error:e.message});}
  }
  index.push(found);console.log(id,found.assets.map(x=>[x.kind,x.width,x.height,x.error]));
 }catch(e){index.push({id,sourcePage:url,error:e.message});console.log(id,e.message);}
 fs.writeFileSync(`${dir}/index.json`,JSON.stringify(index,null,2)+'\n');
}
