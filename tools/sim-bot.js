const {L,TERR,TIDS,HQ}=require('../src/logic.js');
function run(policy,maxDays=120){const S=L.newGame(policy.spec||'assault');
 while(!S.over&&S.t<maxDays*24){L.step(S);S.ev.length=0;if(S.t%6===0)policy.act(S);}
 return S;}
const passive={act(){}};
const basic={act(S){ // place pool on most threatened, assault when strong
  const own=L.owned(S);
  while(S.pool>0){let best=null,bs=-1;for(const id of own){let th=0;for(const p of S.parties)if(p.to===id)th+=p.n*2;for(const n of TERR[id].adj)if(S.terr[n].owner==='enemy')th+=S.terr[n].n*0.5;if(id===HQ)th+=1;const sc=th-S.terr[id].n;if(th>0&&sc>bs){bs=sc;best=id;}}
   if(!best||bs<-2)break;if(!L.reinforce(S,best).ok)break;}
  if(S.res.metal>120){const id=own.find(i=>!S.terr[i].fort&&TERR[i].adj.some(n=>S.terr[n].owner==='enemy'));if(id)L.build(S,id,'fort');}
  // assault weakest reachable
  let tgt=null,ts=99;for(const id of L.enemyT(S)){const av=L.assaultAvail(S,id);if(!av.supplied)continue;const d=L.enemyDefense(S,id);if(av.n>=d*1.6+2&&d<ts){ts=d;tgt=id;}}
  if(tgt&&S.res.fuel>=15){const av=L.assaultAvail(S,tgt);const r=L.assaultStart(S,tgt,Math.min(av.n,Math.ceil(ts*2+3)));if(r.ok){const b=r.b;while(!b.done){if(b.A<b.D*0.6&&b.A<4){L.assaultEnd(S,b,false);break;}L.assaultRound(S,b);}}}
 }};
for(const [name,pol] of [['passive',passive],['basic',basic]]){const out={};let days=0,own=0;const N=40;
 for(let i=0;i<N;i++){const S=run(pol);const k=S.over?S.over.why:'timeout';out[k]=(out[k]||0)+1;days+=L.day(S);own+=L.owned(S).length;}
 console.log(name,out,'avg days',(days/N).toFixed(1),'avg owned',(own/N).toFixed(1));}
