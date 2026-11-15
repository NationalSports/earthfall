const fs=require('fs'),path=require('path');
const sharp=require(process.env.SHARP_MODULE || 'sharp');
(async()=>{for(const f of fs.readdirSync(__dirname).filter(f=>f.endsWith('.svg'))){
await sharp(path.join(__dirname,f),{density:288}).resize(512,512).png().toFile(path.join(__dirname,f.replace('.svg','.png')));
}})().catch(e=>{console.error(e);process.exit(1)});
