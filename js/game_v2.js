(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),W=960,H=540;
const A=window.ASSET_MANIFEST||{},C=window.ULTIMATE_V2_CONTENT;
const keys={},pointer={x:W/2,y:H/2,down:false},joy={active:false,id:null,baseX:105,baseY:455,x:105,y:455,dx:0,dy:0};
const images={};
function flatten(o,a=[]){for(const v of Object.values(o||{})){if(typeof v==="string")a.push(v);else if(Array.isArray(v))v.forEach(x=>typeof x==="string"&&a.push(x));else if(v&&typeof v==="object")flatten(v,a)}return a}
for(const p of flatten(A)){const im=new Image();im.src=p;images[p]=im}
const img=p=>images[p]&&images[p].complete&&images[p].naturalWidth?images[p]:null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const text=(t,x,y,s=18,c="#fff",align="left")=>{ctx.fillStyle=c;ctx.font=`bold ${s}px Arial`;ctx.textAlign=align;ctx.fillText(t,x,y)};
function panel(x,y,w,h,c="#49c8ff"){ctx.fillStyle="rgba(5,16,28,.94)";ctx.fillRect(x,y,w,h);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h)}
function loadSave(){try{return Object.assign(defaultSave(),JSON.parse(localStorage.getItem("qmUltimateV2"))||{})}catch{return defaultSave()}}
function defaultSave(){return{name:"Aluno",phaseUnlocked:1,powers:["Canhão Atômico"],elements:[],compounds:[],stars:{},secrets:{},answers:[],attempts:[],achievements:[],difficulty:"Normal",newGamePlus:false,abilities:{doubleJump:false,mineralBreak:false,magnet:false,conductor:false,iceResist:false,fireResist:false,acidResist:false,inertField:false},
phaseProgress:{
 "1":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "2":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "3":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "4":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "5":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "6":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "7":{collected:false,condition:false,synth:false,doorOpen:false,reward:false},
 "8":{collected:false,condition:false,synth:false,doorOpen:false,reward:false}
},settings:{speed:1,aimSensitivity:1,autoFire:false,joystickSize:1,joystickAlpha:.65,buttonsLeft:false}}}
let lastQuestionPrompt="";
let save=loadSave(),state="title",menu=0,phase=1,paused=false,question=null,qSelection=0,formulaInput="",timer=0,lastTime=performance.now(),bossRush=false,challenge=null,introTimer=0,pendingPhase=1;
let reactorSelection=0,reactorMessage="";
function persist(){localStorage.setItem("qmUltimateV2",JSON.stringify(save))}

function ensureProgress(){
 if(!save.abilities)save.abilities={};
 const abilities=["doubleJump","mineralBreak","magnet","conductor","iceResist","fireResist","acidResist","inertField"];
 for(const a of abilities)if(save.abilities[a]===undefined)save.abilities[a]=false;
 if(!save.phaseProgress)save.phaseProgress={};
 for(let i=1;i<=8;i++){
   if(!save.phaseProgress[String(i)])save.phaseProgress[String(i)]={collected:false,condition:false,synth:false,doorOpen:false,reward:false};
   const rp=save.phaseProgress[String(i)];if(!rp.reactions)rp.reactions=[];
 }
 if(save.phase1){
   const p=save.phaseProgress["1"];
   p.collected=p.collected||!!save.phase1.naCollected;
   p.condition=p.condition||!!save.phase1.waterFound;
   p.synth=p.synth||!!save.phase1.naohSynth;
   p.doorOpen=p.doorOpen||!!save.phase1.doorOpen;
 }
}
ensureProgress();

const PHASES=C.phases;
const POWERS={
 "Canhão Atômico":{damage:1,cost:0,color:"#ffe55b",speed:12,desc:"Disparo padrão.",weak:"Nenhuma"},
 "Explosão Alcalina":{damage:3,cost:4,color:"#55c8ff",speed:9,desc:"Explosão energética.",weak:"Cálcio"},
 "Barreira Mineral":{damage:1,cost:3,color:"#e7edf4",speed:7,desc:"Proteção mineral.",weak:"Alumínio"},
 "Escudo Metálico":{damage:2,cost:4,color:"#bcc6d2",speed:9,desc:"Projétil metálico.",weak:"Carbono"},
 "Lâmina de Carbono":{damage:4,cost:5,color:"#737b87",speed:14,desc:"Corte rápido.",weak:"Nitrogênio"},
 "Nuvem Nitrogenada":{damage:2,cost:4,color:"#79baff",speed:8,desc:"Reduz velocidade.",weak:"Oxigênio"},
 "Pulso Oxidante":{damage:4,cost:5,color:"#72ff9c",speed:11,desc:"Pulso oxidante.",weak:"Halogênios"},
 "Rajada Halogênica":{damage:4,cost:5,color:"#d870ff",speed:11,desc:"Rajada corrosiva.",weak:"Gases nobres"},
 "Campo Inerte":{damage:3,cost:6,color:"#ffd15b",speed:7,desc:"Campo de baixa reatividade.",weak:"Sódio"},
 "Poder H":{damage:2,cost:2,color:"#63d8ff",speed:13,desc:"Pulso leve de hidrogênio.",weak:"Oxigênio"},
 "Poder He":{damage:1,cost:2,color:"#c88cff",speed:11,desc:"Campo de hélio que empurra.",weak:"Nenhuma"},
 "Poder N":{damage:2,cost:3,color:"#65e884",speed:10,desc:"Rajada nitrogenada desaceleradora.",weak:"Oxigênio"},
 "Poder O":{damage:3,cost:3,color:"#ff625f",speed:12,desc:"Pulso oxidante concentrado.",weak:"Gases nobres"},
 "Poder F":{damage:4,cost:5,color:"#ffe05b",speed:12,desc:"Rajada halogênica intensa.",weak:"Metais"},
 "Poder Ne":{damage:2,cost:3,color:"#4dd8ff",speed:10,desc:"Flash de neônio energizado.",weak:"Nenhuma"},
 "Poder Cl":{damage:3,cost:4,color:"#d7db48",speed:10,desc:"Nuvem de cloro corrosiva.",weak:"Sódio"},
 "Poder Ar":{damage:2,cost:3,color:"#8ee8c0",speed:9,desc:"Onda inerte de argônio.",weak:"Nenhuma"},
 "Poder Na":{damage:4,cost:5,color:"#a78cff",speed:11,desc:"Explosão reativa de sódio.",weak:"Água"},
 "Poder C":{damage:4,cost:4,color:"#9ca5ad",speed:14,desc:"Lâmina de carbono.",weak:"Oxigênio"},
 "Poder Fe":{damage:5,cost:5,color:"#c98b57",speed:8,desc:"Projétil pesado de ferro.",weak:"Ácido"},
 "Poder Cu":{damage:3,cost:4,color:"#e38b45",speed:12,desc:"Descarga condutora de cobre.",weak:"Nenhuma"},
 "Poder Al":{damage:3,cost:4,color:"#dce6ef",speed:11,desc:"Escudo leve de alumínio.",weak:"Base"},
 "Poder Ca":{damage:3,cost:4,color:"#f1f1d8",speed:9,desc:"Barreira mineral de cálcio.",weak:"Ácido"}
};
const ELEMENT_POWER={H:"Poder H",He:"Poder He",N:"Poder N",O:"Poder O",F:"Poder F",Ne:"Poder Ne",Cl:"Poder Cl",Ar:"Poder Ar",Na:"Poder Na",C:"Poder C",Fe:"Poder Fe",Cu:"Poder Cu",Al:"Poder Al",Ca:"Poder Ca"};
const ATOM_KEYS=["z","c","v","b","n","m","r","t"];
const ATOM_NAMES={H:"Hidrogênio",He:"Hélio",N:"Nitrogênio",O:"Oxigênio",F:"Flúor",Ne:"Neônio",Cl:"Cloro",Ar:"Argônio",Na:"Sódio",C:"Carbono",Fe:"Ferro",Cu:"Cobre",Al:"Alumínio",Ca:"Cálcio"};
function availableAtoms(){
 const phaseAtoms=game.items.filter(i=>i.taken).map(i=>i.symbol);
 return [...new Set([...(save.elements||[]),...phaseAtoms])].filter(s=>ELEMENT_POWER[s]).slice(-8);
}
function equipAtom(symbol){
 const power=ELEMENT_POWER[symbol];if(!power||!POWERS[power])return false;
 if(!save.powers.includes(power))save.powers.push(power);
 if(player.energy[power]===undefined)player.energy[power]=28;
 player.power=power;persist();
 game.collectNotice={text:`Poder ${symbol} ativado!`,sub:ATOM_NAMES[symbol]||symbol,t:90};
 GAME_AUDIO?.speak?.(`${ATOM_NAMES[symbol]||symbol}, poder ativado`);
 return true;
}
function atomHitAt(x,y){
 const atoms=availableAtoms();
 const startX=335,slotW=48,top=86;
 if(y<top||y>116)return null;
 const i=Math.floor((x-startX)/slotW);
 return i>=0&&i<atoms.length?atoms[i]:null;
}
const bossNames=["Rei Sódio","Guardião Cálcio","Mestre Alumínio","Titã Carbono","Enigma Nitrogênio","Guardião Oxigênio","Mestre Halogênio","Rei Gás Nobre"];
const miniNames=["Golem Alcalino","Guardião de Magnésio","Sentinela de Alumínio","Colosso de Silício","Drone de Fósforo","Fera de Enxofre","Slime de Bromo","Escudo de Argônio"];
const bossPowers=["Explosão Alcalina","Barreira Mineral","Escudo Metálico","Lâmina de Carbono","Nuvem Nitrogenada","Pulso Oxidante","Rajada Halogênica","Campo Inerte"];
const weakPowers=["Campo Inerte","Explosão Alcalina","Barreira Mineral","Escudo Metálico","Lâmina de Carbono","Nuvem Nitrogenada","Pulso Oxidante","Rajada Halogênica"];

const game={
 worldW:6200,worldH:1100,platforms:[],oneWays:[],slopes:[],walls:[],moving:[],hazards:[],reactions:[],terminals:[],synthesisTerminal:null,phaseDoor:null,jumpCatalyst:null,bubbles:[],effects:[],enemies:[],shots:[],enemyShots:[],items:[],energyItems:[],checkpoints:[],mini:null,boss:null,finalStats:null,camera:{x:0,y:0,shake:0,zoom:1},objective:"",start:0,correct:0,totalQ:0,secretCount:0,damage:0,phaseDone:false,collectNotice:null
};
const player={
 x:80,y:390,w:30,h:50,vx:0,vy:0,dir:1,onGround:false,onWall:0,hp:100,maxHp:100,lives:5,power:"Canhão Atômico",energy:{},inv:0,dash:0,dashCooldown:0,coyote:0,jumpBuffer:0,anim:"idle",animT:0,landFx:0,checkpoint:{x:80,y:390},aimX:1,aimY:0,charge:0,charging:false,jumpsUsed:0,underwater:false
};
function resetEnergy(){for(const p of save.powers)player.energy[p]=28;for(const sym of availableAtoms()){const p=ELEMENT_POWER[sym];if(p)player.energy[p]=28}player.energy["Canhão Atômico"]=999}
function resetPlayer(){player.x=player.checkpoint.x;player.y=player.checkpoint.y;player.vx=player.vy=0;player.hp=player.maxHp;player.inv=0;resetEnergy()}
function difficultyMult(){return save.difficulty==="Fácil"?.7:save.difficulty==="Difícil"?1.3:1}
function phaseData(id){return PHASES[id-1]}

function buildMap(id){
 game.platforms=[{x:0,y:470,w:game.worldW,h:80,type:"ground"}];
 game.oneWays=[];game.slopes=[];game.walls=[];game.moving=[];game.hazards=[];game.reactions=[];
 // Layouts revisados: caminho principal contínuo, saltos curtos e alturas progressivas.
 // Cada fase mantém identidade visual, mas nenhuma plataforma exige salto impossível.
 const phaseOffsets=[0,18,-12,10,-18,15,-8,20];
 const wave=[400,350,390,325,375,305,365,340,395,320,370,300,360,335,390,315,365,345,400,330,375,305,360,340,395];
 const offset=phaseOffsets[id-1]||0;
 const layouts=wave.map((base,i)=>[
   220+i*235,
   clamp(base+offset+((i%5===0)?10:0),285,420)
 ]);
 layouts.forEach(([x,y],i)=>{
   const width=(i%4===0)?165:145;
   const p={x,y,w:width,h:20,type:"platform"};
   game.platforms.push(p);
   // Plataformas de cima podem ser atravessadas por baixo, evitando prender o jogador.
   if(i%3!==0)game.oneWays.push(p);
   // Degrau auxiliar quando a plataforma fica mais alta que a anterior.
   if(i>0&&y<layouts[i-1][1]-55){
     const step={x:x-78,y:y+72,w:92,h:18,type:"platform"};
     game.platforms.push(step);game.oneWays.push(step);
   }
 });
 game.slopes.push({x:1120,y:470,w:190,h:70,up:true},{x:2860,y:400,w:190,h:70,up:false});
 game.walls.push(
   {x:1450,y:285,w:30,h:185,climb:true,passThrough:true},
   {x:2700,y:265,w:30,h:205,climb:true,passThrough:true}
 );
 game.moving=[
   {x:1700,y:385,w:120,h:18,axis:"y",min:245,max:410,speed:1.15,dir:1},
   {x:2320,y:250,w:120,h:18,axis:"x",min:2200,max:2520,speed:1.5,dir:1}
 ];
 const type=phaseData(id).hazards;
 {
   const cfg=window.PHASE_INTERACTIONS[String(id)];
   const prog=save.phaseProgress[String(id)];
   game.synthesisTerminal={x:1850,y:360,w:80,h:110,active:true,label:cfg.terminal};
   game.phaseDoor={x:2500,y:290,w:70,h:180,open:!!prog.doorOpen,label:cfg.door};
   game.jumpCatalyst={x:2950,y:300,w:54,h:54,taken:!!prog.reward,label:cfg.reward,ability:cfg.ability};
   if(id===1){
     game.hazards=game.hazards.filter(h=>h.type!=="water");
     game.hazards.push({x:820,y:420,w:220,h:50,type:"water",interactive:true});
   }
 }
 {
   const rcfg=window.PHASE_INTERACTIONS[String(id)];
   const required=[];
   for(const reaction of rcfg.reactions)for(const [symbol,count] of Object.entries(reaction.need))for(let n=0;n<count;n++)required.push(symbol);
   const familyGroup=[1,2,13,14,15,16,17,18][id-1];
   for(const e of C.elements.filter(e=>e.group===familyGroup).slice(0,3))required.push(e.symbol);
   const itemXs=[520,900,1320,1550,2150,2780,3350,3920,4450,5050,5450,5650,5850];
   const itemYs=[390,330,285,390,330,275,390,315,365,290,390,330,270];
   game.items=required.slice(0,itemXs.length).map((symbol,i)=>{const e=C.elements.find(x=>x.symbol===symbol)||{symbol,name:symbol,Z:"?"};return{x:itemXs[i],y:itemYs[i],w:42,h:42,symbol:e.symbol,name:e.name,Z:e.Z,taken:false,kind:"atom",phaseOffset:i*.8}});
   // Esferas separadas: servem somente para recuperar energia e um pouco de HP.
   const energyXs=[700,1180,1780,2420,3050,3680,4300,5250];
   const energyYs=[365,285,350,260,385,300,355,275];
   const energyValues=[20,20,50,20,50,20,100,50];
   game.energyItems=energyXs.map((x,i)=>({x,y:energyYs[i],baseY:energyYs[i],w:28+(energyValues[i]>=100?8:0),h:28+(energyValues[i]>=100?8:0),value:energyValues[i],taken:false,t:i*17,kind:"energy"}));
 }
 game.checkpoints=[{x:1300,y:400,w:42,h:70,active:false},{x:3200,y:400,w:42,h:70,active:false},{x:5000,y:400,w:42,h:70,active:false}];
 game.enemies=[];
 for(let i=0;i<20;i++){
   const kind=i%6;
   const x=350+i*275;
   const e=makeEnemy(kind,x,410,id);
   if(id===1)e.behavior=["gel","fly","patrol","acid","shield","fly"][kind];
   // Inimigos terrestres nascem apoiados no piso/plataforma. Voadores recebem faixa aérea própria.
   if(e.behavior==="fly"){
     e.y=210+(i%3)*55;e.baseY=e.y;e.airborne=true;
   }else{
     const floorY=findEnemyFloor(x+e.w/2,0);
     e.y=floorY-e.h;e.baseY=e.y;e.airborne=false;
   }
   game.enemies.push(e);
 }
 game.mini=makeMini(id,4700,350);
 // Somente o Drone de Fósforo (fase 5) é aéreo; os demais ficam apoiados no piso.
 if(id===5){game.mini.y=250;game.mini.airborne=true}else{game.mini.y=findEnemyFloor(game.mini.x+game.mini.w/2,0)-game.mini.h;game.mini.airborne=false}
 game.boss=makeBoss(id,5850,335);
 game.shots=[];game.enemyShots=[];game.effects=[];game.objective=window.PHASE_INTERACTIONS[String(id)].objective;
 game.start=performance.now();game.correct=0;game.totalQ=0;game.secretCount=0;game.damage=0;game.phaseDone=false;game.collectNotice=null;
 player.checkpoint={x:80,y:390};player.lives=5;resetPlayer();game.camera.x=game.camera.y=0;game.camera.zoom=1;game.camera.shake=0;
}
function findEnemyFloor(cx,minY=0){
 // Retorna o topo da superfície sólida mais próxima abaixo do inimigo.
 const surfaces=[...game.platforms,...game.moving].filter(p=>cx>=p.x-4&&cx<=p.x+p.w+4&&p.y>=minY);
 if(!surfaces.length)return 470;
 return Math.min(...surfaces.map(p=>p.y));
}
function makeEnemy(kind,x,y,id){
 const behaviors=["gel","jump","fly","shield","flee","acid"][kind];
 const isGel=kind===0;
 return{x,y,baseY:y,w:48,h:48,hp:isGel?1:(3+kind%3)*(save.newGamePlus?2:1),kind,behavior:behaviors,t:0,vx:kind===4?2:-1.2,vy:0,shield:kind===3,phase:id,calling:false,pulse:0,airborne:behaviors==="fly"}
}
function makeMini(id,x,y){return{x,y,w:96,h:92,hp:30+id*4,t:0,id,name:miniNames[id-1],active:false,dead:false,reward:"Cristal de energia"}}
function makeBoss(id,x,y){const hp=(90+id*12)*(save.newGamePlus?1.5:1);return{x,y,w:110,h:130,hp,maxHp:hp,id,name:bossNames[id-1],form:1,t:0,active:false,telegraph:0,attack:"",transition:0,dead:false}}
function startPhase(id){
 pendingPhase=id;phase=id;introTimer=0;state="phaseIntro";
 GAME_AUDIO?.playMusic?.(`fase${id}`);
 GAME_AUDIO?.speak?.(`Fase ${id}. ${phaseData(id).name}`);
}

function beginPendingPhase(){
 buildMap(pendingPhase);state="play";paused=false;introTimer=0;
}
function updatePlayer(dt){
 if(paused)return;
 const speed=6.0*save.settings.speed*(player.underwater?.62:1),acc=player.onGround?.75:(player.underwater?.28:.44);
 if(keys.left){player.vx=Math.max(-speed,player.vx-acc);player.dir=-1}
 else if(keys.right){player.vx=Math.min(speed,player.vx+acc);player.dir=1}
 else if(player.onGround){player.vx*=.76;if(Math.abs(player.vx)<.08)player.vx=0}
 
 if(player.onGround){player.coyote=14;player.jumpsUsed=0}else player.coyote=Math.max(0,player.coyote-1);
 player.jumpBuffer=Math.max(0,player.jumpBuffer-1);
 player.onWall=0;
 for(const w of game.walls)if(!w.passThrough&&player.y+player.h>w.y&&player.y<w.y+w.h&&Math.abs((player.x+player.w)-w.x)<6)player.onWall=1;
 if(player.jumpBuffer>0){
   if(player.coyote>0||player.onWall){
     if(player.onWall){player.vx=-player.dir*9.5;player.vy=-19.0;player.dir*=-1}
     else{
       player.vy=-18.0;
       player.jumpsUsed=1;
       if(keys.left)player.vx=Math.min(player.vx,-4.2);
       if(keys.right)player.vx=Math.max(player.vx,4.2);
     }
     player.jumpBuffer=0;player.coyote=0;GAME_AUDIO?.play?.("pulo")
   }else if(save.abilities.doubleJump&&player.jumpsUsed<2){
     player.vy=-16.5;player.jumpsUsed=2;player.jumpBuffer=0;
     game.camera.shake=4;GAME_AUDIO?.play?.("pulo");
   }
 }
 if(!keys.jump&&player.vy<-6)player.vy*=.78;
 if(player.dash>0){player.dash--;player.vx=player.dir*13;player.vy*=.4}
 else player.vy=Math.min(player.underwater?5.8:12.0,player.vy+(player.underwater?.18:.38));
 player.dashCooldown=Math.max(0,player.dashCooldown-1);
 moveX(player.vx);moveY(player.vy);
 if(player.y>game.worldH+100)die();
 player.inv=Math.max(0,player.inv-1);player.animT+=dt;player.landFx=Math.max(0,player.landFx-1);
 if(player.dash>0)player.anim="dash";else if(!player.onGround)player.anim="jump";else if(Math.abs(player.vx)>.3)player.anim="run";else player.anim="idle";
}
function moveX(dx){player.x+=dx;const solids=[...game.platforms.filter(p=>!game.oneWays.includes(p)),...game.walls.filter(w=>!w.passThrough)];for(const p of solids)if(hit(player,p)){if(dx>0)player.x=p.x-player.w;else if(dx<0)player.x=p.x+p.w;player.vx=0}}
function moveY(dy){
 const wasGround=player.onGround;player.y+=dy;player.onGround=false;
 for(const p of game.platforms){
   if(game.oneWays.includes(p)&&!(dy>0&&player.y+player.h-dy<=p.y+6))continue;
   if(hit(player,p)){if(dy>0){player.y=p.y-player.h;player.vy=0;player.onGround=true}else if(dy<0){player.y=p.y+p.h;player.vy=0}}
 }
 for(const m of game.moving)if(hit(player,m)&&dy>=0){player.y=m.y-player.h;player.vy=0;player.onGround=true;if(m.axis==="x")player.x+=m.speed*m.dir}
 for(const s of game.slopes){
   if(player.x+player.w>s.x&&player.x<s.x+s.w){
     const rel=clamp((player.x+player.w/2-s.x)/s.w,0,1),surface=s.up?s.y+s.h*(1-rel):s.y+s.h*rel;
     if(player.y+player.h>=surface&&player.y+player.h<=surface+18&&dy>=0){player.y=surface-player.h;player.vy=0;player.onGround=true}
   }
 }
 if(!wasGround&&player.onGround){player.landFx=12;game.camera.shake=3}
}
function dash(){if(player.dashCooldown<=0){player.dash=12;player.dashCooldown=45;player.inv=Math.max(player.inv,8)}}


function currentShotDirection(){
 let dx=player.dir,dy=0;
 const up=keys.up||keys.w||keys.arrowup;
 const down=keys.down||keys.s||keys.arrowdown;
 if(up){
   if(Math.abs(player.vx)>.25){dx=player.dir;dy=-1}
   else{dx=0;dy=-1}
 }else if(down&&!player.onGround){
   dx=player.dir;dy=1;
 }
 const mag=Math.hypot(dx,dy)||1;
 return{x:dx/mag,y:dy/mag};
}
function shoot(chargeLevel=0){
 const p=POWERS[player.power];
 const cost=p.cost+(chargeLevel>=2?2:chargeLevel>=1?1:0);
 if((player.energy[player.power]??0)<cost)return;
 player.energy[player.power]-=cost;
 const dir=currentShotDirection();
 const muzzleX=player.x+player.w/2+dir.x*30;
 const muzzleY=player.y+player.h*.45+dir.y*22;
 const mult=chargeLevel===3?3:chargeLevel===2?2.2:chargeLevel===1?1.5:1;
 const size=chargeLevel===3?26:chargeLevel===2?21:chargeLevel===1?17:14;
 game.shots.push({
   x:muzzleX,y:muzzleY,w:size,h:Math.max(8,size*.6),
   vx:dir.x*p.speed,vy:dir.y*p.speed,
   damage:p.damage*mult,power:player.power,color:p.color,life:100,
   charged:chargeLevel
 });
 GAME_AUDIO?.play?.(player.power)
}
function updateCharge(){
 if(player.charging){
   player.charge=Math.min(180,player.charge+1);
 }
}
function releaseCharge(){
 if(!player.charging)return;
 const level=player.charge>=120?3:player.charge>=70?2:player.charge>=30?1:0;
 shoot(level);
 player.charge=0;
 player.charging=false;
}
function hurt(n){if(player.inv>0)return;const inert=save.abilities.inertField?.75:1;const d=Math.ceil(n*difficultyMult()*inert);player.hp-=d;game.damage+=d;player.inv=60;game.camera.shake=8;GAME_AUDIO?.play?.("dano");if(player.hp<=0)die()}
function die(){player.lives--;if(player.lives<0){state="gameover";GAME_AUDIO?.play?.("derrota");return}resetPlayer()}
function resetEnergy(){for(const p of save.powers)player.energy[p]=28;for(const sym of availableAtoms()){const p=ELEMENT_POWER[sym];if(p)player.energy[p]=28}player.energy["Canhão Atômico"]=999}

function atomInventory(){const inv={};for(const it of game.items)if(it.taken)inv[it.symbol]=(inv[it.symbol]||0)+1;return inv}
function phaseReactions(){return window.PHASE_INTERACTIONS[String(phase)]?.reactions||[]}
function canSynthesizeReaction(r){const inv=atomInventory();return Object.entries(r.need).every(([k,v])=>(inv[k]||0)>=v)}
function openReactor(){reactorSelection=0;reactorMessage="Escolha uma reação";state="reactor";keys.interact=false}
function performReaction(r){
 const prog=save.phaseProgress[String(phase)];if(!prog.reactions)prog.reactions=[];
 if(prog.reactions.includes(r.formula)){reactorMessage=`${r.formula} já foi produzido.`;return}
 if(!canSynthesizeReaction(r)){reactorMessage="Átomos insuficientes para esta reação.";GAME_AUDIO?.speak?.("Átomos insuficientes");return}
 prog.reactions.push(r.formula);if(!save.compounds.includes(r.formula))save.compounds.push(r.formula);
 if(r.primary){prog.synth=true;triggerSynthesisExplosion(r.formula)}else{game.secretCount++;game.objective=`Reação opcional ${r.formula} concluída: ${r.effect}.`;GAME_AUDIO?.speak?.(`${r.name} produzido`)}
 persist();reactorMessage=`${r.formula} produzido! ${r.effect}`;
}
function triggerSynthesisExplosion(compound){
 const t=game.synthesisTerminal;
 if(!t)return;
 const cx=t.x+t.w/2,cy=t.y+t.h/2;
 game.effects.push({type:"synthesis",x:cx,y:cy,t:0,life:78,compound});
 game.camera.shake=18;
 // Remove somente inimigos comuns que estão visíveis na tela.
 const left=game.camera.x-40,right=game.camera.x+W+40,top=game.camera.y-40,bottom=game.camera.y+H+40;
 let defeated=0;
 for(const e of [...game.enemies]){
   if(e.x+e.w>left&&e.x<right&&e.y+e.h>top&&e.y<bottom){
     game.enemies.splice(game.enemies.indexOf(e),1);defeated++;
     for(let i=0;i<7;i++)game.effects.push({type:"particle",x:e.x+e.w/2,y:e.y+e.h/2,vx:(Math.random()-.5)*7,vy:(Math.random()-.7)*7,t:0,life:35});
   }
 }
 game.enemyShots=game.enemyShots.filter(s=>!(s.x>left&&s.x<right&&s.y>top&&s.y<bottom));
 game.objective=`${compound} produzido! Explosão controlada derrotou ${defeated} inimigo(s). Vá até a porta.`;
 GAME_AUDIO?.play?.("explosao_alcalina");
 GAME_AUDIO?.speak?.(`${compound} produzido. Explosão química controlada.`);
}
function updateEffects(){
 if(game.collectNotice&&--game.collectNotice.t<=0)game.collectNotice=null;
 for(const fx of [...game.effects]){
   fx.t++;
   if(fx.type==="particle"){fx.x+=fx.vx;fx.y+=fx.vy;fx.vy+=.18}
   if(fx.t>=fx.life)game.effects.splice(game.effects.indexOf(fx),1);
 }
}
function updateWorld(){
 for(const m of game.moving){m[m.axis]+=m.speed*m.dir;if(m[m.axis]<m.min||m[m.axis]>m.max)m.dir*=-1}
 for(const h of game.hazards)applyHazard(h);
 for(const cp of game.checkpoints)if(hit(player,cp)&&!cp.active){cp.active=true;player.checkpoint={x:cp.x,y:390};player.hp=player.maxHp;resetEnergy();GAME_AUDIO?.play?.("checkpoint");GAME_AUDIO?.speak?.("Checkpoint")}
 for(const it of game.items)if(!it.taken&&hit(player,it)){
   it.taken=true;if(!save.elements.includes(it.symbol))save.elements.push(it.symbol);
   const elementalPower=ELEMENT_POWER[it.symbol];if(elementalPower&&!save.powers.includes(elementalPower)){save.powers.push(elementalPower);player.energy[elementalPower]=28}
   const cfg=window.PHASE_INTERACTIONS[String(phase)],prog=save.phaseProgress[String(phase)];
   if(it.symbol===cfg.collect)prog.collected=true;
   GAME_AUDIO?.play?.("coleta");GAME_AUDIO?.speak?.(`${it.name}`);game.collectNotice={text:`${it.name} (${it.symbol}) coletado!`,sub:`Número atômico ${it.Z}`,t:150};persist()
 }
 for(const orb of game.energyItems){
   if(orb.taken)continue;orb.t++;orb.y=orb.baseY+Math.sin(orb.t*.055)*9;
   if(hit(player,orb)){
     orb.taken=true;
     const before=player.energy[player.power]??0;
     if(player.power!=="Canhão Atômico")player.energy[player.power]=Math.min(28,before+orb.value);
     // A energia excedente estabiliza o reator de vida em pequena quantidade.
     player.hp=Math.min(player.maxHp,player.hp+Math.max(2,Math.round(orb.value/10)));
     GAME_AUDIO?.play?.("coleta");game.collectNotice={text:`Energia Atômica +${orb.value}`,sub:`Reator +${Math.max(2,Math.round(orb.value/10))} HP`,t:100};
     for(let i=0;i<8;i++)game.effects.push({type:"particle",x:orb.x+orb.w/2,y:orb.y+orb.h/2,vx:(Math.random()-.5)*5,vy:(Math.random()-.7)*5,t:0,life:28});
   }
 }
 for(const t of game.terminals)if(!t.done&&hit(player,t)){t.done=true;openQuestion();return}
 if(game.synthesisTerminal&&hit(player,game.synthesisTerminal)&&keys.interact){openReactor();return}
 
 if(game.phaseDoor&&!game.phaseDoor.open&&hit(player,game.phaseDoor)){
   const cfg=window.PHASE_INTERACTIONS[String(phase)];
   const prog=save.phaseProgress[String(phase)];
   if(prog.synth){
     game.phaseDoor.open=true;
     prog.doorOpen=true;
     persist();
     game.objective=`${cfg.door} aberta. Encontre ${cfg.reward}.`;
   }else{
     player.x=game.phaseDoor.x-player.w-2;
     game.objective=`Produza ${cfg.compound} antes de abrir ${cfg.door}.`;
   }
 }
 if(game.jumpCatalyst&&!game.jumpCatalyst.taken&&hit(player,game.jumpCatalyst)){
   const cfg=window.PHASE_INTERACTIONS[String(phase)];
   const prog=save.phaseProgress[String(phase)];
   game.jumpCatalyst.taken=true;
   prog.reward=true;
   save.abilities[cfg.ability]=true;
   persist();
   game.objective=`${cfg.reward} desbloqueado! Continue até o chefe.`;
   GAME_AUDIO?.speak?.(`${cfg.reward} desbloqueado.`);
 }
 for(const r of game.reactions)if(!r.done&&hit(player,r)){const c=save.compounds.includes(r.need);if(c){r.done=true;game.secretCount++;GAME_AUDIO?.speak?.("Reação concluída")}else{game.objective=`Sintetize ${r.need} no laboratório para avançar.`}}
 for(const b of [...game.bubbles]){b.x+=b.vx;b.y+=b.vy;b.life--;if(b.life<=0)game.bubbles.splice(game.bubbles.indexOf(b),1)}
 updateEffects();
 updateEnemies();updateMini();updateBoss();updateShots();
}
function applyHazard(h){

 const prog=save.phaseProgress[String(phase)];
 if(phase===1&&h.type==="water"&&hit(player,h))prog.condition=true;
 if(phase===2&&h.type==="breakwall"&&hit(player,h))prog.condition=true;
 if(phase===3&&h.type==="magnet"&&hit(player,h)){prog.condition=true;if(save.abilities.magnet)player.vx+=player.dir*.3;}
 if(phase===4&&h.type==="conductor"&&hit(player,h)){prog.condition=true;if(save.abilities.conductor)h.h=0;}
 if(phase===5&&(h.type==="wind"||h.type==="ice")&&hit(player,h))prog.condition=true;
 if(phase===6&&(h.type==="fire"||h.type==="rust")&&hit(player,h))prog.condition=true;
 if(phase===7&&(h.type==="acid"||h.type==="toxic")&&hit(player,h))prog.condition=true;
 if(phase===8&&(h.type==="shield"||h.type==="teleport")&&hit(player,h))prog.condition=true;

 if(h.type==="water"){
   const inside=hit(player,h);
   if(inside&&!player.underwater){
     player.underwater=true;save.phaseProgress["1"].condition=true;persist();
     for(let i=0;i<8;i++)game.bubbles.push({x:player.x+Math.random()*player.w,y:player.y+player.h,vx:(Math.random()-.5)*.5,vy:-1-Math.random(),life:50+Math.random()*40});
   }else if(!inside&&player.underwater){
     const stillInWater=game.hazards.some(x=>x.type==="water"&&hit(player,x));
     if(!stillInWater)player.underwater=false;
   }
   if(inside&&player.power==="Explosão Alcalina")hurt(18);
   return;
 }
 if(!hit(player,h))return;
 if(h.type==="breakwall"&&save.abilities.mineralBreak&&player.dash>0){h.w=0;return}
 if(h.type==="explosive")hurt(12);
 else if(h.type==="wind")player.vx+=.22;
 else if(h.type==="ice"){player.vx*=save.abilities.iceResist?.99:1.04}
 else if(h.type==="fire"){if(!save.abilities.fireResist)hurt(6)}
 else if(["acid","toxic"].includes(h.type)){if(!save.abilities.acidResist)hurt(6)}
 else if(h.type==="teleport"){player.x+=250}
 else if(h.type==="magnet"&&player.power==="Escudo Metálico")player.x+=player.dir*3;
}
function updateEnemies(){
 for(const e of [...game.enemies]){
   e.t++;
   if(e.behavior==="fly"){
     // Voo estável: altura-base fixa, oscilação suave e sprite visualmente aéreo.
     e.y=e.baseY+Math.sin(e.t*.045+e.x*.01)*22;
     e.x+=e.vx*.55;
     if(e.t%240===0)e.vx*=-1;
   }else{
     // Física terrestre comum: gravidade e encaixe exato no topo do chão/plataforma.
     if(e.behavior==="gel"){
       e.pulse=Math.sin(e.t*.16);
       if(Math.abs(e.vy)<.01&&e.t%105===0)e.vy=-6.6;
       e.x+=e.vx*.35;if(e.t%210===0)e.vx*=-1;
     }else if(e.behavior==="jump"){
       if(Math.abs(e.vy)<.01&&e.t%90===0)e.vy=-8.2;
       e.x+=e.vx*.45;if(e.t%180===0)e.vx*=-1;
     }else if(e.behavior==="patrol"){
       e.x+=e.vx;if(e.t%150===0)e.vx*=-1;
     }else if(e.behavior==="flee"){
       e.x+=(player.x<e.x?1.8:-1.8);
     }
     e.vy+=.42;e.y+=e.vy;
     const floorY=findEnemyFloor(e.x+e.w/2,Math.max(0,e.y-8));
     if(e.y+e.h>=floorY&&e.vy>=0){e.y=floorY-e.h;e.baseY=e.y;e.vy=0}
     // Se saiu da borda, cai até a próxima superfície em vez de permanecer suspenso.
     if(e.y>game.worldH){e.y=470-e.h;e.vy=0}
   }
   if(e.behavior==="shield")e.shield=(Math.floor(e.t/90)%2===0);
   if(e.behavior==="acid"&&e.t%100===0)game.enemyShots.push({x:e.x,y:e.y+20,w:16,h:16,vx:-4,vy:1,damage:9,color:"#8cff65",life:160});
   if(e.behavior!=="gel"&&e.t%260===0&&e.kind===0&&!e.calling){e.calling=true;const n=makeEnemy(1,e.x+70,e.y,e.phase);n.y=findEnemyFloor(n.x+n.w/2,0)-n.h;n.baseY=n.y;game.enemies.push(n)}
   if(hit(player,e)){
     const stomp=e.behavior!=="fly"&&player.vy>1.5&&player.y+player.h<=e.y+18;
     if(stomp){
       game.enemies.splice(game.enemies.indexOf(e),1);player.vy=-10.5;player.y=e.y-player.h-2;GAME_AUDIO?.play?.("impacto");
     }else if(e.behavior==="gel"){
       if(player.inv<=0){player.hp-=1;game.damage+=1;player.inv=60;game.camera.shake=5;GAME_AUDIO?.play?.("dano");if(player.hp<=0)die()}
     }else hurt(7+e.kind);
   }
 }
}

function updateMini(){
 const m=game.mini;if(m.dead)return;if(player.x>4400)m.active=true;if(!m.active)return;m.t++;
 if(m.id===1&&m.t%85===0)for(const vy of[-2,0,2])game.enemyShots.push({x:m.x,y:m.y+35,w:18,h:18,vx:-6,vy,damage:10,color:"#ffb35b",life:140});
 if(m.id===2&&m.t%120===0)game.walls.push({x:m.x-120,y:380,w:25,h:90,climb:false,temp:180});
 if(m.id===5)m.y=250+Math.sin(m.t*.05)*80;
 if(hit(player,m))hurt(14);
 if(m.hp<=0){m.dead=true;game.objective=`Minichefe derrotado. Recompensa: ${m.reward}.`;player.hp=Math.min(player.maxHp,player.hp+25)}
}
function updateBoss(){
 const b=game.boss;if(b.dead)return;if(!b.active&&player.x>5450){b.active=true;GAME_AUDIO?.play?.("boss_warning");GAME_AUDIO?.speak?.("Chefe se aproximando");b.telegraph=60}
 if(!b.active)return;b.t++;const ratio=b.hp/b.maxHp,newForm=ratio<=.5?2:1;if(newForm!==b.form){b.form=newForm;b.transition=90;b.w=135;b.h=145;GAME_AUDIO?.speak?.("Segunda forma")}
 if(b.transition>0){b.transition--;return}
 if(b.telegraph>0){b.telegraph--;return}
 const patterns=b.form===1?["single","spread","jump"]:["rain","charge","special"];if(!b.attack){b.attack=patterns[Math.floor(b.t/120)%patterns.length];b.telegraph=35;return}
 if(b.attack==="single")game.enemyShots.push({x:b.x,y:b.y+60,w:18,h:18,vx:-7,vy:0,damage:10,color:"#ff8b5c",life:150});
 if(b.attack==="spread")for(const vy of[-3,0,3])game.enemyShots.push({x:b.x,y:b.y+60,w:18,h:18,vx:-6,vy,damage:11,color:"#ffb15c",life:150});
 if(b.attack==="jump")b.x-=100;
 if(b.attack==="rain")for(let i=0;i<4;i++)game.enemyShots.push({x:player.x-180+i*120,y:-20,w:18,h:18,vx:0,vy:6,damage:12,color:"#8bd5ff",life:140});
 if(b.attack==="charge"){b.x-=180}
 if(b.attack==="special")for(const vy of[-4,-2,0,2,4])game.enemyShots.push({x:b.x,y:b.y+60,w:18,h:18,vx:-7,vy,damage:14,color:"#ffe35c",life:160});
 b.attack="";b.telegraph=50;if(hit(player,b))hurt(15);
 if(b.hp<=0){b.dead=true;completePhase()}
}
function updateShots(){
 for(const s of [...game.shots]){
   s.x+=s.vx;s.y+=s.vy;s.life--;let used=false;
   for(const e of [...game.enemies])if(hit(s,e)){if(!e.shield)e.hp-=s.damage;if(e.hp<=0)game.enemies.splice(game.enemies.indexOf(e),1);used=true;break}
   if(!used&&game.mini.active&&!game.mini.dead&&hit(s,game.mini)){game.mini.hp-=s.damage;used=true}
   if(!used&&game.boss.active&&!game.boss.dead&&hit(s,game.boss)){const weak=weakPowers[phase-1]===s.power;game.boss.hp-=s.damage*(weak?3:1);used=true}
   if(used||s.life<=0)game.shots.splice(game.shots.indexOf(s),1)
 }
 for(const s of [...game.enemyShots]){s.x+=s.vx;s.y+=s.vy;s.life--;if(hit(s,player)){hurt(s.damage);game.enemyShots.splice(game.enemyShots.indexOf(s),1)}else if(s.life<=0)game.enemyShots.splice(game.enemyShots.indexOf(s),1)}
 for(const w of [...game.walls])if(w.temp!==undefined&&--w.temp<=0)game.walls.splice(game.walls.indexOf(w),1)
}
function completePhase(){
 if(!save.powers.includes(bossPowers[phase-1]))save.powers.push(bossPowers[phase-1]);
 save.phaseUnlocked=Math.max(save.phaseUnlocked,Math.min(8,phase+1));
 const elapsed=(performance.now()-game.start)/1000,knowledge=game.totalQ?game.correct/game.totalQ:1,explore=(game.items.filter(i=>i.taken).length+game.secretCount)/(game.items.length+1);
 const stars=1+(knowledge>=.7?1:0)+(explore>=.8&&game.damage<45?1:0);
 save.stars[phase]=Math.max(save.stars[phase]||0,stars);save.secrets[phase]=Math.max(save.secrets[phase]||0,game.secretCount);
 const made=[...(save.phaseProgress[String(phase)].reactions||[])];
 const collected=game.items.filter(i=>i.taken).map(i=>i.symbol);
 game.finalStats={time:elapsed,hp:Math.max(0,player.hp),maxHp:player.maxHp,power:player.power,energy:player.power==="Canhão Atômico"?999:(player.energy[player.power]??0),atoms:collected,reactions:made,energyOrbs:game.energyItems.filter(i=>i.taken).length,energyOrbsTotal:game.energyItems.length,secrets:game.secretCount,stars};
 save.attempts.push({phase,time:elapsed,correct:game.correct,total:game.totalQ,damage:game.damage,stars,reactions:made,elements:collected,date:new Date().toISOString()});persist();
 state="victory";GAME_AUDIO?.playMusic?.("vitoria");GAME_AUDIO?.speak?.("Poder adquirido")
}

function updateCamera(){
 const look=player.dir*110,targetX=clamp(player.x-W*.42+look,0,game.worldW-W),targetY=clamp(player.y-H*.58,0,game.worldH-H);
 if(game.boss.active&&!game.boss.dead){game.camera.x=clamp(game.camera.x+(targetX-game.camera.x)*.08,5200,game.worldW-W)}
 else game.camera.x+=(targetX-game.camera.x)*.09;
 game.camera.y+=(targetY-game.camera.y)*.07;game.camera.shake=Math.max(0,game.camera.shake-.6)
}

let previousPad=[];
function updateGamepad(){
 const pads=navigator.getGamepads?navigator.getGamepads():[];
 const pad=[...pads].find(Boolean);if(!pad)return;
 const ax=pad.axes[0]||0,ay=pad.axes[1]||0;
 keys.left=ax<-.3||pad.buttons[14]?.pressed;
 keys.right=ax>.3||pad.buttons[15]?.pressed;
 keys.up=ay<-.45||pad.buttons[12]?.pressed;
 keys.down=ay>.45||pad.buttons[13]?.pressed;
 const jump=pad.buttons[0]?.pressed;
 if(jump&&!previousPad[0])player.jumpBuffer=14;
 keys.jump=jump;

 const fire=pad.buttons[2]?.pressed;
 if(fire&&!previousPad[2]){player.charging=true;player.charge=0;keys.shoot=true}
 if(!fire&&previousPad[2]){keys.shoot=false;releaseCharge()}

 if(pad.buttons[1]?.pressed&&!previousPad[1]&&state==="play")dash();
 if(pad.buttons[3]?.pressed&&!previousPad[3]&&state==="play"){state="powers";menu=save.powers.indexOf(player.power)}
 if(pad.buttons[9]?.pressed&&!previousPad[9]){
   if(state==="title")state="menu";
   else if(state==="menu")activateMenu();
   else if(state==="play"){paused=true;state="pause";menu=0}
 }
 previousPad=pad.buttons.map(b=>b.pressed);
}

function update(dt){updateGamepad();
 if(state==="play"&&!paused){
   updatePlayer(dt);updateCharge();updateWorld();updateCamera();
   if(save.settings.autoFire&&keys.shoot&&timer%8===0)shoot();
   if(challenge&&challenge.time){
     challenge.time-=dt/1000;
     if(challenge.time<=0){state="gameover";challenge=null}
   }
   if(challenge&&challenge.noDamage&&game.damage>0){state="gameover";challenge=null}
 }
 timer++;
}
function worldToScreen(r){const sh=game.camera.shake,dx=(Math.random()-.5)*sh,dy=(Math.random()-.5)*sh;return{x:r.x-game.camera.x+dx,y:r.y-game.camera.y+dy,w:r.w,h:r.h}}

function draw(){
 ctx.clearRect(0,0,W,H);
 if(state==="title")drawTitle();else if(state==="menu")drawMenu();else if(state==="map")drawMap();else if(state==="play")drawGame();else if(state==="pause")drawPause();
 else if(state==="powers")drawPowerMenu();else if(state==="elementodex")drawElementodex();else if(state==="compendium")drawCompendium();else if(state==="reactor")drawReactor();
 else if(state==="question")drawQuestion();
 else if(state==="victory")drawVictory();else if(state==="gameover")drawGameOver();else if(state==="settings")drawSettings();else if(state==="reports")drawReports();else if(state==="classroom")drawClassroom();
}
function drawTitle(){
 const bg=img(A.v6Opening);
 if(bg)ctx.drawImage(bg,0,0,W,H);else{ctx.fillStyle="#071321";ctx.fillRect(0,0,W,H)}
 ctx.fillStyle="rgba(2,8,18,.18)";ctx.fillRect(0,0,W,H);
 text("MEGAQUÍMICO",W/2,105,50,"#62dcff","center");
 text("QUIMIX: REAÇÕES & COMPOSTOS",W/2,150,22,"#ffe36a","center");
 panel(255,210,450,120,"#62dcff");
 text("8 REGIÕES QUÍMICAS",W/2,250,22,"#fff","center");
 text("ELEMENTOS · PODERES · DESAFIOS",W/2,288,17,"#c6f2ff","center");
 text("ENTER / TOQUE PARA COMEÇAR",W/2,480,18,"#fff","center")
}
function drawPhaseIntro(){
 const bg=img(A.v6PhaseIntros?.[phase-1]);
 if(bg)ctx.drawImage(bg,0,0,W,H);else{ctx.fillStyle="#10263b";ctx.fillRect(0,0,W,H)}
 ctx.fillStyle="rgba(3,10,20,.30)";ctx.fillRect(0,0,W,H);
 const p=phaseData(phase);
 text(`FASE ${phase}`,W/2,120,32,"#ffe36a","center");
 text(p.name.toUpperCase(),W/2,180,38,"#fff","center");
 text(p.mechanic,W/2,228,20,"#bfefff","center");
 panel(260,290,440,105,"#62dcff");
 text(`Elementos: ${p.elements.join(" · ")}`,W/2,330,19,"#fff","center");
 text("ENTER / TOQUE PARA INICIAR",W/2,372,16,"#ffe36a","center")
}
const menuItems=["Campanha","Boss Rush","Modo Desafio","New Game+","Laboratório / Compêndios","Modo Professor em Sala","Relatórios","Configurações","Editor de Perguntas","Sair"];
function drawMenu(){ctx.fillStyle="#0a1b2e";ctx.fillRect(0,0,W,H);text("MENU PRINCIPAL",W/2,45,34,"#57cdff","center");menuItems.forEach((m,i)=>text(`${i===menu?"> ":"  "}${m}`,285,90+i*40,20,i===menu?"#ffe36a":"#fff"));text(`Fases ${save.phaseUnlocked}/8 · Elementos ${save.elements.length}/118 · New Game+ ${save.newGamePlus?"ON":"OFF"}`,W/2,515,15,"#b8d8e8","center")}
function drawMap(){ctx.fillStyle="#12364d";ctx.fillRect(0,0,W,H);text("MAPA-MÚNDI",W/2,40,32,"#fff","center");PHASES.forEach((p,i)=>{const x=100+i*105,y=190+(i%2)*120,un=i<save.phaseUnlocked,sel=i===phase-1;ctx.fillStyle=sel?"#ffe36a":un?"#56c9ff":"#4d5965";ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.fill();text(i+1,x,y+7,20,"#111","center");text(p.name,x,y+48,12,"#fff","center");text(`${"★".repeat(save.stars[i+1]||0)}${"☆".repeat(3-(save.stars[i+1]||0))}`,x,y+68,14,"#ffe36a","center");if(save.powers.includes(bossPowers[i]))text("PODER ✓",x,y+88,11,"#8dffb0","center")});text("←/→ selecionar · ENTER jogar · ESC voltar",W/2,510,16,"#fff","center")}
function drawBackground(){
 const b=img(A.backgrounds?.[phase-1]);
 if(b){
   const far=-game.camera.x*.08;
   ctx.globalAlpha=.55;
   for(let x=(far%W)-W;x<W*2;x+=W)ctx.drawImage(b,x-40,-25,W+80,H+50);
   ctx.globalAlpha=1;
   const near=-game.camera.x*.16;
   for(let x=(near%W)-W;x<W*2;x+=W)ctx.drawImage(b,x,0,W,H);
   ctx.fillStyle="rgba(4,12,24,.14)";ctx.fillRect(0,0,W,H);
 }else{
   ctx.fillStyle="#183650";ctx.fillRect(0,0,W,H)
 }
}
function drawGame(){
 drawBackground();
 for(const p of game.platforms)drawPlatform(p);for(const m of game.moving)drawPlatform(m);
 for(const s of game.slopes){const r=worldToScreen(s);ctx.fillStyle="#6b7683";ctx.beginPath();ctx.moveTo(r.x,s.up?r.y+r.h:r.y);ctx.lineTo(r.x+r.w,s.up?r.y:r.y+r.h);ctx.lineTo(r.x+r.w,r.y+r.h);ctx.lineTo(r.x,r.y+r.h);ctx.fill()}
 for(const w of game.walls){const r=worldToScreen(w);ctx.fillStyle=w.climb?"#6f8798":"#836f62";ctx.fillRect(r.x,r.y,r.w,r.h)}
 for(const h of game.hazards)drawHazard(h);
 if(game.synthesisTerminal){
   const r=worldToScreen(game.synthesisTerminal),im=img(A.v9Phase1?.terminal);
   if(im)ctx.drawImage(im,r.x,r.y,r.w,r.h);
   else{ctx.fillStyle="#1ca3c8";ctx.fillRect(r.x,r.y,r.w,r.h)}
   if(Math.abs(player.x-game.synthesisTerminal.x)<140)text(`E / AÇÃO: escolher reação`,r.x+r.w/2,r.y-10,13,"#fff","center");
 }
 if(game.phaseDoor&&!game.phaseDoor.open){
   const r=worldToScreen(game.phaseDoor);ctx.fillStyle="#657d8c";ctx.fillRect(r.x,r.y,r.w,r.h);
   ctx.strokeStyle="#a9e9ff";ctx.lineWidth=4;ctx.strokeRect(r.x,r.y,r.w,r.h);text(game.phaseDoor.label,r.x+r.w/2,r.y+90,13,"#fff","center");
 }
 if(game.jumpCatalyst&&!game.jumpCatalyst.taken){
   const r=worldToScreen(game.jumpCatalyst),im=img(A.v9Phase1?.jumpCatalyst);
   if(im)ctx.drawImage(im,r.x,r.y,r.w,r.h);
   else{ctx.fillStyle="#57d8ff";ctx.beginPath();ctx.arc(r.x+r.w/2,r.y+r.h/2,r.w/2,0,Math.PI*2);ctx.fill()}
   text(game.jumpCatalyst.label,r.x+r.w/2,r.y-8,12,"#ffe36a","center");
 }
 for(const b of game.bubbles){const r=worldToScreen({x:b.x,y:b.y,w:8,h:8});ctx.strokeStyle="#c5f6ff";ctx.beginPath();ctx.arc(r.x,r.y,4,0,Math.PI*2);ctx.stroke()}
 for(const t of game.terminals)if(!t.done){const q=worldToScreen(t);ctx.fillStyle="#45c6e8";ctx.fillRect(q.x,q.y,q.w,q.h);text("?",q.x+q.w/2,q.y+38,22,"#111","center")}
 for(const r of game.reactions)if(!r.done){const q=worldToScreen(r);ctx.fillStyle="#24b7d6";ctx.fillRect(q.x,q.y,q.w,q.h);text(r.need,q.x+q.w/2,q.y+38,13,"#fff","center")}
 // Átomos: núcleo com símbolo e órbitas; nunca usam o sprite das esferas de energia.
 game.items.forEach((it,i)=>{if(!it.taken){const r=worldToScreen(it),cx=r.x+r.w/2,cy=r.y+r.h/2,bob=Math.sin(performance.now()*.003+it.phaseOffset)*4;
   ctx.save();ctx.translate(cx,cy+bob);ctx.strokeStyle="rgba(150,235,255,.85)";ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(0,0,20,8,.55,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,20,8,-.55,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle="#112c46";ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e8fbff";ctx.stroke();
   text(it.symbol,0,5,13,"#fff","center");ctx.fillStyle="#7df2ff";ctx.beginPath();ctx.arc(18,0,3,0,Math.PI*2);ctx.fill();ctx.restore();
   text(it.name,r.x+r.w/2,r.y-10,11,"#bff6ff","center");
 }});
 // Energia: esfera sem símbolo químico, com raio e cor conforme o valor.
 game.energyItems.forEach(orb=>{if(!orb.taken){const r=worldToScreen(orb),cx=r.x+r.w/2,cy=r.y+r.h/2;
   const color=orb.value>=100?"#d68cff":orb.value>=50?"#69f0a5":"#62dfff";ctx.save();ctx.shadowColor=color;ctx.shadowBlur=16;
   ctx.fillStyle=color;ctx.globalAlpha=.28;ctx.beginPath();ctx.arc(cx,cy,r.w*.62,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   ctx.strokeStyle="#eaffff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r.w*.42,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(cx,cy,r.w*.18,0,Math.PI*2);ctx.fill();ctx.restore();
   text(`+${orb.value}`,cx,cy+4,10,"#08233a","center");
 }});
 game.checkpoints.forEach(cp=>{const r=worldToScreen(cp),im=img(A.tiles?.checkpoint);if(im)ctx.drawImage(im,r.x,r.y,r.w,r.h);else{ctx.fillStyle=cp.active?"#ffe36a":"#58798d";ctx.fillRect(r.x,r.y,r.w,r.h)}});
 for(const fx of game.effects){
   const r=worldToScreen({x:fx.x,y:fx.y,w:1,h:1});
   if(fx.type==="synthesis"){
     const progress=fx.t/fx.life,rad=25+progress*330,alpha=Math.max(0,1-progress);
     ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle="#bff8ff";ctx.lineWidth=8*(1-progress)+2;ctx.beginPath();ctx.arc(r.x,r.y,rad,0,Math.PI*2);ctx.stroke();
     ctx.fillStyle=`rgba(120,245,255,${Math.max(0,.55-progress*.6)})`;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(8,80*(1-progress)),0,Math.PI*2);ctx.fill();ctx.restore();
     if(fx.t<32)text(fx.t<15?"REAÇÃO...":"EXPLOSÃO QUÍMICA!",r.x,r.y-95,24,"#fff176","center");
   }else if(fx.type==="particle"){
     ctx.fillStyle="#d9fbff";ctx.fillRect(r.x-3,r.y-3,6,6);
   }
 }
 game.enemies.forEach(drawEnemy);if(game.mini.active&&!game.mini.dead)drawMini(game.mini);if(game.boss.active&&!game.boss.dead)drawBoss(game.boss);
 game.shots.forEach(s=>{const r=worldToScreen(s);ctx.fillStyle=s.color;ctx.fillRect(r.x,r.y,r.w,r.h)});game.enemyShots.forEach(s=>{const r=worldToScreen(s);ctx.fillStyle=s.color;ctx.fillRect(r.x,r.y,r.w,r.h)});
 drawQuimix(player.x-game.camera.x,player.y-game.camera.y,player.dir,1);
 if(player.charging){
   const cx=player.x-game.camera.x+player.w/2,cy=player.y-game.camera.y+player.h/2;
   const level=player.charge>=120?3:player.charge>=70?2:player.charge>=30?1:0;
   const radius=14+level*7+Math.sin(timer*.25)*3;
   ctx.strokeStyle=level===3?"#fff176":level===2?"#7ee8ff":level===1?"#b7f5ff":"#6fc9ff";
   ctx.lineWidth=2+level;
   ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
   text(`CARGA ${level}`,cx,cy-radius-8,11,"#fff176","center");
 }
 if(game.collectNotice){
   panel(W/2-185,128,370,68,"#ffe36a");text(game.collectNotice.text,W/2,154,19,"#ffe36a","center");text(game.collectNotice.sub,W/2,180,14,"#d7f4ff","center");
 }
 drawHUD();drawMinimap();drawTouchControls();if(paused)drawPause();
}
function drawPlatform(p){const r=worldToScreen(p),im=img(p.type==="ground"?A.tiles?.ground:A.tiles?.platform);if(im){for(let x=r.x;x<r.x+r.w;x+=80)ctx.drawImage(im,x,r.y,80,r.h)}else{ctx.fillStyle="#596573";ctx.fillRect(r.x,r.y,r.w,r.h)}}
function drawHazard(h){const r=worldToScreen(h);const colors={water:"#368bd0",explosive:"#ff9a34",breakwall:"#8b7c69",fallingrock:"#777",magnet:"#8ab8dc",metalrail:"#bbc4ce",conductor:"#333",crystal:"#7de4ff",wind:"#9ce3ff55",ice:"#b7efff",fire:"#ff633c",rust:"#9b623e",acid:"#80da4d",toxic:"#75d86a66",shield:"#a78cff66",teleport:"#8fdcff"};if(h.type==="water"&&img(A.v9Phase1?.water)){
   const wi=img(A.v9Phase1.water);for(let x=r.x;x<r.x+r.w;x+=160)ctx.drawImage(wi,x,r.y,160,r.h);
 }else{ctx.fillStyle=colors[h.type]||"#f55";ctx.fillRect(r.x,r.y,r.w,r.h)}
 if(h.type!=="water")text(h.type,r.x+r.w/2,r.y+20,11,"#fff","center")}
function enemySpriteFor(e){
 const family=A.familyEnemies?.[String(phase)]||[];
 const all=[...family,...(A.enemies||[])];
 const lower=p=>String(p||"").toLowerCase();
 let candidates=[];
 if(e.behavior==="fly")candidates=all.filter(p=>/(flyer|drone|voador|ionico)/.test(lower(p)));
 else if(e.behavior==="gel")candidates=all.filter(p=>/(slime|gel|gota|corrosiva)/.test(lower(p)));
 else if(e.behavior==="shield")candidates=all.filter(p=>/(shield|tank|torre)/.test(lower(p)));
 else candidates=all.filter(p=>/(runner|soldado|rato|tank|robo)/.test(lower(p)));
 return candidates[e.kind%Math.max(1,candidates.length)]||family[e.kind%Math.max(1,family.length)]||A.enemies?.[e.kind%(A.enemies?.length||1)];
}
function drawEnemy(e){const im=img(enemySpriteFor(e)),r=worldToScreen(e);if(e.behavior==="gel"){
 const sx=1+(e.pulse||0)*.08,sy=1-(e.pulse||0)*.06;
 ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h);ctx.scale(sx,sy);
 if(im)ctx.drawImage(im,-r.w/2,-r.h,r.w,r.h);else{ctx.fillStyle="#f29a32";ctx.beginPath();ctx.ellipse(0,-r.h/2,r.w/2,r.h/2,0,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}else if(im){
 ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2);if(e.vx>0)ctx.scale(-1,1);ctx.drawImage(im,-r.w/2,-r.h/2,r.w,r.h);ctx.restore();
}else{ctx.fillStyle=e.behavior==="fly"?"#79d9ff":"#d66";ctx.fillRect(r.x,r.y,r.w,r.h)}
 if(e.behavior==="fly"){ctx.strokeStyle="rgba(170,235,255,.55)";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(r.x+r.w/2,r.y+r.h+7,18,4,0,0,Math.PI*2);ctx.stroke()}
 if(e.shield){ctx.strokeStyle="#aeeaff";ctx.lineWidth=3;ctx.strokeRect(r.x-4,r.y-4,r.w+8,r.h+8)}}
function drawMini(m){const r=worldToScreen(m),im=img(A.miniBosses?.[m.id-1]);
 ctx.save();
 const pulse=1+Math.sin(m.t*.12)*.035;ctx.translate(r.x+r.w/2,r.y+r.h/2);ctx.scale(pulse,pulse);
 if(im)ctx.drawImage(im,-r.w*.18,-r.h*.32,r.w*1.36,r.h*1.36);else{ctx.fillStyle="#6b91b8";ctx.fillRect(-r.w/2,-r.h/2,r.w,r.h)}ctx.restore();
 text(`MINICHEFE: ${m.name}`,r.x+r.w/2,r.y-25,13,"#fff","center");bar(r.x,r.y-17,r.w,m.hp/(30+m.id*4),"#ffb85c")
}
function drawBoss(b){const r=worldToScreen(b),im=img(A.bosses?.[phase-1]);if(im)ctx.drawImage(im,r.x,r.y,r.w,r.h);else{ctx.fillStyle="#d85f5f";ctx.fillRect(r.x,r.y,r.w,r.h)}if(b.telegraph>0){ctx.strokeStyle="#ffe36a";ctx.lineWidth=5;ctx.strokeRect(r.x-8,r.y-8,r.w+16,r.h+16)}if(b.transition>0){text("FORMA 2!",W/2,H/2,42,"#ffe36a","center")}}
function drawQuimix(x,y,dir=1,scale=1){const moving=Math.abs(player.vx)>.3,paths=A.hero||{},path=player.anim==="jump"?paths.jump:player.anim==="run"?(paths.run?.[Math.floor(player.animT/90)%Math.max(1,paths.run.length)]):paths.idle,im=img(path);ctx.save();ctx.translate(x+(dir<0?player.w:0),y);ctx.scale(dir*scale,scale);if(im)ctx.drawImage(im,-20,-18,72,82);else{ctx.fillStyle="#eaf3f8";ctx.fillRect(3,20,30,34);ctx.fillStyle="#4fcaff";ctx.fillRect(7,4,24,18)}ctx.restore();if(player.landFx>0){ctx.strokeStyle="#dff8ff";ctx.beginPath();ctx.ellipse(x+16,y+player.h,35-player.landFx,8,0,0,Math.PI*2);ctx.stroke()}}
function drawHUD(){
 ctx.fillStyle="rgba(5,14,25,.68)";
 ctx.fillRect(0,0,W,118);
 panel(10,10,310,98,"#55caff");
 text(`HP ${Math.max(0,player.hp)}/${player.maxHp}`,22,34,16);
 bar(22,42,180,player.hp/player.maxHp,"#54d17a");
 text(player.power,22,72,16,POWERS[player.power].color);
 text(`Energia ${player.energy[player.power]??0}`,205,72,14);
 text(`Vidas ${player.lives}`,205,94,14,"#ffe36a");
 if(player.charging)bar(22,94,180,player.charge/180,"#ffe36a");
 text(game.objective,340,28,14,"#fff");
 text(`Elementos ${game.items.filter(i=>i.taken).length}/${game.items.length} · Segredos ${game.secretCount}`,340,52,14,"#ffe36a");
 const cfg=window.PHASE_INTERACTIONS?.[String(phase)];
 const prog=save.phaseProgress?.[String(phase)];
 if(cfg&&prog){
   const made=(prog.reactions||[]);text(`REAÇÕES: ${cfg.reactions.map(r=>`${made.includes(r.formula)?"☑":"☐"} ${r.formula}`).join("   ")}   ${prog.doorOpen?"☑":"☐"} Porta`,340,78,12,"#bfffe0");
   if(prog.reward)text(`☑ ${cfg.reward}`,340,100,12,"#ffe36a");
 }
 drawAtomPowerBar();
 if(challenge)text(`DESAFIO ${Math.max(0,Math.ceil(challenge.time||0))}s`,690,100,13,"#ffb36b");
}
function drawAtomPowerBar(){
 const atoms=availableAtoms();if(!atoms.length)return;
 const startX=335,slotW=48,y=86;
 atoms.forEach((sym,i)=>{
   const power=ELEMENT_POWER[sym],active=player.power===power,x=startX+i*slotW;
   ctx.fillStyle=active?POWERS[power].color:"rgba(10,30,48,.92)";ctx.beginPath();ctx.arc(x+15,y+14,13,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=active?"#fff":POWERS[power].color;ctx.lineWidth=2;ctx.stroke();
   text(sym,x+15,y+19,sym.length>1?11:14,active?"#07111d":"#fff","center");
   text(ATOM_KEYS[i].toUpperCase(),x+34,y+19,10,"#ffe36a","center");
 });
}
function bar(x,y,w,p,c){ctx.fillStyle="#222";ctx.fillRect(x,y,w,12);ctx.fillStyle=c;ctx.fillRect(x,y,w*clamp(p,0,1),12)}
function drawMinimap(){panel(730,10,220,55,"#7fdcff");ctx.fillStyle="#32465a";ctx.fillRect(745,37,190,7);ctx.fillStyle="#ffe36a";ctx.fillRect(745+190*player.x/game.worldW-3,31,6,18);text("MINIMAPA",840,27,12,"#fff","center")}
function drawTouchControls(){
 if(!matchMedia("(pointer:coarse)").matches)return;
 const alpha=save.settings.joystickAlpha,size=save.settings.joystickSize;
 ctx.globalAlpha=alpha;
 ctx.fillStyle="#153f61";ctx.beginPath();ctx.arc(joy.baseX,joy.baseY,58*size,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#75dfff";ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle="#3b86b0";ctx.beginPath();ctx.arc(joy.baseX+joy.dx,joy.baseY+joy.dy,27*size,0,Math.PI*2);ctx.fill();
 const jumpX=W-175,shotX=W-85;
 ctx.fillStyle="#1c5d84";ctx.beginPath();ctx.arc(jumpX,H-82,42*size,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(shotX,H-82,42*size,0,Math.PI*2);ctx.fill();
 text("PULO",jumpX,H-77,13,"#fff","center");text("X",shotX,H-72,25,"#fff","center");
 ctx.globalAlpha=1
}
function drawPause(){panel(230,70,500,400,"#ffe36a");text("PAUSA",W/2,120,36,"#fff","center");["Continuar","Controles","Inventário","Elementodex","Reiniciar checkpoint","Sair"].forEach((m,i)=>text(`${i===menu?"> ":"  "}${m}`,330,180+i*45,21,i===menu?"#ffe36a":"#fff"))}
function drawPowerMenu(){ctx.fillStyle="#0a1b2e";ctx.fillRect(0,0,W,H);text("PODERES",W/2,45,34,"#fff","center");save.powers.forEach((p,i)=>{const d=POWERS[p];panel(100,85+i*48,760,42,d.color);text(`${i===menu?"> ":""}${p}`,120,112+i*48,18,d.color);text(d.desc,360,112+i*48,15);text(`Energia ${player.energy[p]??28}`,650,112+i*48,15);text(`Fraqueza: ${d.weak}`,830,112+i*48,13,"#ffe36a","right")})}
function drawElementodex(){ctx.fillStyle="#0b1d31";ctx.fillRect(0,0,W,H);text("ELEMENTODEX — 118 ELEMENTOS",W/2,40,30,"#fff","center");const start=Math.floor(menu/18)*18;C.elements.slice(start,start+18).forEach((e,i)=>{const x=35+(i%9)*102,y=85+Math.floor(i/9)*130,found=save.elements.includes(e.symbol);panel(x,y,90,110,found?"#62dfa0":"#5d6873");text(e.symbol,x+45,y+32,24,found?"#fff":"#89939c","center");text(e.Z,x+8,y+16,11);text(e.name,x+45,y+56,11,"#fff","center");text(e.family,x+45,y+76,9,"#bfe7f5","center");text(e.state,x+45,y+94,9,"#ffe36a","center")});text("←/→ páginas · ESC voltar",W/2,510,15,"#fff","center")}
function drawCompendium(){ctx.fillStyle="#102139";ctx.fillRect(0,0,W,H);text("COMPÊNDIO DE COMPOSTOS",W/2,40,30,"#fff","center");C.compounds.forEach((c,i)=>{const y=85+i*52,found=save.compounds.includes(c.formula);text(c.formula,55,y,21,found?"#6de3a8":"#68747d");text(c.name,145,y,17);text(`${c.bond} · ${c.function}`,400,y,14,"#bce7f5");text(c.use,650,y,14,"#ffe36a");text(c.risk,900,y,12,"#ffb0a0","right")})}
function drawReactor(){
 ctx.fillStyle="#071522";ctx.fillRect(0,0,W,H);panel(90,45,780,440,"#55d9ff");
 text("SINTETIZADOR QUÍMICO",W/2,88,30,"#ffe36a","center");
 const inv=atomInventory();text("ÁTOMOS COLETADOS: "+(Object.entries(inv).map(([k,v])=>`${k}×${v}`).join(" · ")||"nenhum"),W/2,125,16,"#bfffe0","center");
 phaseReactions().forEach((r,i)=>{const y=180+i*112,selected=i===reactorSelection,ok=canSynthesizeReaction(r),done=(save.phaseProgress[String(phase)].reactions||[]).includes(r.formula);panel(145,y-38,670,88,selected?"#ffe36a":"#2b83a2");text(`${selected?"> ":""}${r.formula} — ${r.name}`,175,y,24,done?"#72ff9c":ok?"#fff":"#778995");text("Necessário: "+Object.entries(r.need).map(([k,v])=>`${k}×${v}`).join(" + "),175,y+27,16,ok?"#bfffe0":"#ff9e9e");text(r.primary?"REAÇÃO PRINCIPAL":"REAÇÃO OPCIONAL",785,y,13,r.primary?"#ffcf55":"#9ddcff","right")});
 text(reactorMessage,W/2,430,16,"#fff","center");text("↑/↓ escolher · ENTER produzir · ESC voltar",W/2,466,15,"#bfefff","center");
}
function drawQuestion(){ctx.fillStyle="#0b1d31";ctx.fillRect(0,0,W,H);panel(80,55,800,430,"#56caff");text(question.prompt,W/2,120,24,"#fff","center");if(question.type==="formula"){text(formulaInput||"_",W/2,250,36,"#ffe36a","center");text("Digite a fórmula e pressione ENTER",W/2,400,16,"#fff","center")}else{const opts=question.options||question.items||[];opts.forEach((o,i)=>text(`${i===qSelection?"> ":""}${i+1}) ${o}`,220,210+i*55,22,i===qSelection?"#ffe36a":"#fff"));text("↑/↓ selecionar · ENTER responder",W/2,440,16,"#fff","center")}}
function drawVictory(){
 const st=game.finalStats||{time:0,hp:player.hp,maxHp:player.maxHp,power:player.power,energy:player.energy[player.power]??0,atoms:game.items.filter(i=>i.taken).map(i=>i.symbol),reactions:save.phaseProgress[String(phase)].reactions||[],energyOrbs:game.energyItems.filter(i=>i.taken).length,energyOrbsTotal:game.energyItems.length,secrets:game.secretCount,stars:save.stars[phase]||1};
 ctx.fillStyle="#071827";ctx.fillRect(0,0,W,H);panel(45,28,870,462,"#5bdcff");text("FASE CONCLUÍDA!",W/2,72,35,"#ffe36a","center");
 text(`Poder adquirido: ${bossPowers[phase-1]}`,W/2,105,18,"#fff","center");
 // Reator/HP
 panel(75,130,360,142,"#65e89b");text("REATOR DE VIDA",95,158,16,"#bfffe0");text(`HP ${st.hp}/${st.maxHp}`,390,158,15,"#fff","right");bar(95,174,310,st.hp/st.maxHp,st.hp/st.maxHp<.25?"#ff5c5c":"#54d17a");
 text("ENERGIA ELETRÔNICA",95,214,15,"#bfefff");const er=st.energy===999?1:clamp(st.energy/28,0,1);bar(95,226,310,er,"#62dfff");text(st.energy===999?"∞":`${st.energy}/28`,390,250,14,"#fff","right");
 // Resultados químicos
 panel(465,130,420,232,"#a88cff");text("RESULTADOS QUÍMICOS",485,158,16,"#e7d8ff");
 text(`Reações: ${st.reactions.length?st.reactions.join("  •  "):"nenhuma"}`,485,190,16,"#fff");
 const atomText=st.atoms.length?st.atoms.join(" · "):"nenhum";text(`Átomos coletados (${st.atoms.length}):`,485,222,14,"#bfffe0");
 const chunks=[];for(let i=0;i<atomText.length;i+=36)chunks.push(atomText.slice(i,i+36));chunks.slice(0,3).forEach((line,i)=>text(line,485,246+i*22,14,"#fff"));
 text(`Esferas de energia: ${st.energyOrbs}/${st.energyOrbsTotal}`,485,326,14,"#62dfff");text(`Segredos: ${st.secrets}`,720,326,14,"#ffe36a");
 // Rodapé
 const min=Math.floor(st.time/60),sec=Math.floor(st.time%60).toString().padStart(2,"0");
 text(`Tempo ${min}:${sec}`,95,316,17,"#fff");text(`Poder final: ${st.power}`,95,348,15,POWERS[st.power]?.color||"#fff");
 text(`Estrelas: ${"★".repeat(st.stars)}${"☆".repeat(3-st.stars)}`,95,392,26,"#ffe36a");
 text("ENTER — voltar ao mapa",W/2,462,17,"#fff","center");
}
function drawGameOver(){ctx.fillStyle="#24121a";ctx.fillRect(0,0,W,H);text("DERROTA",W/2,180,48,"#ff7272","center");text("ENTER voltar ao menu",W/2,330,18,"#fff","center")}
function drawSettings(){ctx.fillStyle="#0b1d31";ctx.fillRect(0,0,W,H);text("CONFIGURAÇÕES",W/2,45,34,"#fff","center");const opts=[`Velocidade ${save.settings.speed.toFixed(1)}`,`Sensibilidade ${save.settings.aimSensitivity.toFixed(1)}`,`Tiro automático ${save.settings.autoFire?"ON":"OFF"}`,`Joystick ${save.settings.joystickSize.toFixed(1)}`,`Transparência ${save.settings.joystickAlpha.toFixed(1)}`,`Botões à esquerda ${save.settings.buttonsLeft?"SIM":"NÃO"}`];opts.forEach((o,i)=>text(`${i===menu?"> ":"  "}${o}`,300,130+i*55,22,i===menu?"#ffe36a":"#fff"))}
function drawReports(){ctx.fillStyle="#0b1d31";ctx.fillRect(0,0,W,H);text("RELATÓRIOS",W/2,45,34,"#fff","center");const total=save.answers.length,ok=save.answers.filter(a=>a.correct).length;text(`Questões: ${total} · Acertos: ${ok} · Aproveitamento: ${total?Math.round(ok/total*100):0}%`,80,110,20);text(`Tentativas: ${save.attempts.length} · Elementos: ${save.elements.length}/118 · Compostos: ${save.compounds.length}/${C.compounds.length}`,80,150,20);["Exportar resultados CSV","Exportar backup JSON","Imprimir relatório/PDF","Voltar"].forEach((m,i)=>text(`${i===menu?"> ":"  "}${m}`,280,240+i*55,22,i===menu?"#ffe36a":"#fff"))}
function drawClassroom(){ctx.fillStyle="#12283c";ctx.fillRect(0,0,W,H);text("MODO PROFESSOR EM SALA",W/2,45,32,"#fff","center");text("Equipe A",220,120,26,"#5bcaff","center");text("Equipe B",740,120,26,"#ff8f72","center");text(`${save.classA||0}`,220,200,60,"#fff","center");text(`${save.classB||0}`,740,200,60,"#fff","center");text("1 = ponto A · 2 = ponto B · Q = nova pergunta · ESC voltar",W/2,480,17,"#fff","center")}

function openQuestion(){
 const previous=state;
 const phaseBank=(window.PHASE_QUESTIONS&&window.PHASE_QUESTIONS[String(phase)])||C.questions;
 let selected=phaseBank[Math.floor(Math.random()*phaseBank.length)];
 if(phaseBank.length>1&&selected.prompt===lastQuestionPrompt){
   const alternatives=phaseBank.filter(q=>q.prompt!==lastQuestionPrompt);
   selected=alternatives[Math.floor(Math.random()*alternatives.length)];
 }
 lastQuestionPrompt=selected.prompt;
 question={...selected,fromClassroom:previous==="classroom"};qSelection=0;formulaInput="";game.totalQ++;state="question"}
function answerQuestion(){
 let correct=false;
 if(question.type==="formula")correct=formulaInput.replace(/\s/g,"").toLowerCase()===question.answer.toLowerCase();
 else correct=qSelection===question.answer;
 save.answers.push({topic:question.topic,correct,date:new Date().toISOString(),phase});
 if(correct){
   game.correct++;
   player.lives++;
   GAME_AUDIO?.play?.("correta");
   GAME_AUDIO?.speak?.("Resposta correta. Você ganhou uma vida.");
 }else{
   player.lives--;
   GAME_AUDIO?.play?.("errada");
   GAME_AUDIO?.speak?.("Resposta incorreta. Você perdeu uma vida.");
   if(player.lives<0){state="gameover";persist();return}
 }
 persist();
 state=question.fromClassroom?"classroom":"play";
}
function synthesizeFirst(){for(const c of C.compounds)if(!save.compounds.includes(c.formula)){save.compounds.push(c.formula);persist();GAME_AUDIO?.speak?.("Síntese concluída");return c.formula}return null}
function exportCSV(){const rows=["fase,tempo,acertos,total,dano,estrelas,data",...save.attempts.map(a=>[a.phase,a.time,a.correct,a.total,a.damage,a.stars,a.date].join(","))];download("resultados_quimica_man.csv",rows.join("\n"),"text/csv")}
function backup(){download("backup_quimica_man.json",JSON.stringify(save,null,2),"application/json")}
function download(n,c,t){const b=new Blob([c],{type:t}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=n;a.click();URL.revokeObjectURL(u)}

function activateMenu(){
 if(state==="menu"){
   if(menu===0){state="map";phase=1}
   else if(menu===1){bossRush=true;startPhase(1);game.enemies=[];player.x=3500;game.boss.active=true}
   else if(menu===2){challenge={noDamage:true,time:180,onePower:true,noCheckpoints:true};startPhase(Math.min(save.phaseUnlocked,8))}
   else if(menu===3){save.newGamePlus=!save.newGamePlus;persist()}
   else if(menu===4){state="compendium"}
   else if(menu===5){state="classroom"}
   else if(menu===6){state="reports";menu=0}
   else if(menu===7){state="settings";menu=0}
   else if(menu===8)window.open("editor/perguntas.html","_blank")
   else return;
 }
}
function handleKeyDown(e){
 GAME_AUDIO?.unlock?.();const k=e.key.toLowerCase();keys[k]=true;
 if(k==="a"||k==="arrowleft"){keys.left=true;keys.right=false}
 if(k==="d"||k==="arrowright"){keys.right=true;keys.left=false}
 if(k==="w"||k==="arrowup")keys.up=true;
 if(k==="s"||k==="arrowdown")keys.down=true;
 if(k===" "){keys.jump=true;player.jumpBuffer=10}
 if(k==="x"){keys.shoot=true;if(state==="play"){player.charging=true;player.charge=0}}
 if(k==="e")keys.interact=true;
 if(state==="title"){state="menu";GAME_AUDIO?.playMusic?.("menu");return}
 if(state==="phaseIntro"){if(e.key==="Enter"||e.key===" "){beginPendingPhase()}return}
 if(state==="menu"){if(k==="arrowup")menu=(menu-1+menuItems.length)%menuItems.length;if(k==="arrowdown")menu=(menu+1)%menuItems.length;if(e.key==="Enter")activateMenu();return}
 if(state==="map"){if(k==="arrowleft")phase=Math.max(1,phase-1);if(k==="arrowright")phase=Math.min(save.phaseUnlocked,phase+1);if(e.key==="Enter")startPhase(phase);if(e.key==="Escape")state="menu";return}
 if(state==="play"){
   const atomIndex=ATOM_KEYS.indexOf(k);
   if(atomIndex>=0){const atom=availableAtoms()[atomIndex];if(atom){equipAtom(atom);return}}
   if(k===" "||k==="w"||k==="arrowup")player.jumpBuffer=14;
   if(k==="shift")dash();if(k==="x"){}if(k==="q")openQuestion();if(k==="tab"){e.preventDefault();state="powers";menu=save.powers.indexOf(player.power)}
   if(k==="escape"){paused=true;state="pause";menu=0}
 }
 else if(state==="pause"){if(k==="arrowup")menu=(menu-1+6)%6;if(k==="arrowdown")menu=(menu+1)%6;if(e.key==="Enter"){if(menu===0){state="play";paused=false}else if(menu===2)state="compendium";else if(menu===3)state="elementodex";else if(menu===4){resetPlayer();state="play";paused=false}else if(menu===5){state="menu";paused=false}}if(k==="escape"){state="play";paused=false}}
 else if(state==="powers"){if(k==="arrowup")menu=(menu-1+save.powers.length)%save.powers.length;if(k==="arrowdown")menu=(menu+1)%save.powers.length;if(e.key==="Enter"){player.power=save.powers[menu];state="play"}if(k==="escape")state="play"}
 else if(state==="elementodex"){if(k==="arrowright")menu=Math.min(117,menu+18);if(k==="arrowleft")menu=Math.max(0,menu-18);if(k==="escape")state="pause"}
 else if(state==="compendium"){if(k==="s"){const f=synthesizeFirst();if(f)alert(`Síntese concluída: ${f}`)}if(k==="e")state="elementodex";if(k==="escape")state="menu"}
 else if(state==="reactor"){
   const rs=phaseReactions();if(k==="arrowup")reactorSelection=(reactorSelection-1+rs.length)%rs.length;if(k==="arrowdown")reactorSelection=(reactorSelection+1)%rs.length;
   if(e.key==="Enter")performReaction(rs[reactorSelection]);if(k==="escape"){state="play";reactorMessage=""}
 }
 else if(state==="question"){if(question.type==="formula"){if(e.key==="Backspace")formulaInput=formulaInput.slice(0,-1);else if(e.key==="Enter")answerQuestion();else if(e.key.length===1)formulaInput+=e.key}else{const opts=question.options||question.items||[];if(k==="arrowup")qSelection=(qSelection-1+opts.length)%opts.length;if(k==="arrowdown")qSelection=(qSelection+1)%opts.length;if(e.key==="Enter")answerQuestion()}}
 else if(state==="victory"){if(e.key==="Enter"){if(bossRush&&phase<8){phase++;startPhase(phase);game.enemies=[];player.x=3500;game.boss.active=true}else{bossRush=false;state="map"}}}
 else if(state==="gameover"){if(e.key==="Enter")state="menu"}
 else if(state==="settings"){if(k==="arrowup")menu=(menu-1+6)%6;if(k==="arrowdown")menu=(menu+1)%6;const d=k==="arrowleft"?-.1:k==="arrowright"?.1:0;if(menu===0&&d)save.settings.speed=clamp(save.settings.speed+d,.7,1.5);if(menu===1&&d)save.settings.aimSensitivity=clamp(save.settings.aimSensitivity+d,.5,2);if(menu===2&&e.key==="Enter")save.settings.autoFire=!save.settings.autoFire;if(menu===3&&d)save.settings.joystickSize=clamp(save.settings.joystickSize+d,.7,1.5);if(menu===4&&d)save.settings.joystickAlpha=clamp(save.settings.joystickAlpha+d,.2,1);if(menu===5&&e.key==="Enter")save.settings.buttonsLeft=!save.settings.buttonsLeft;if(k==="escape"){persist();state="menu"}}
 else if(state==="reports"){if(k==="arrowup")menu=(menu-1+4)%4;if(k==="arrowdown")menu=(menu+1)%4;if(e.key==="Enter"){if(menu===0)exportCSV();if(menu===1)backup();if(menu===2)window.open("reports/relatorio.html","_blank");if(menu===3)state="menu"}if(k==="escape")state="menu"}
 else if(state==="classroom"){if(k==="1")save.classA=(save.classA||0)+1;if(k==="2")save.classB=(save.classB||0)+1;if(k==="q")openQuestion();if(k==="escape")state="menu";persist()}
}
function handleKeyUp(e){
 const k=e.key.toLowerCase();
 keys[k]=false;
 if(k==="a"||k==="arrowleft")keys.left=false;
 if(k==="d"||k==="arrowright")keys.right=false;
 if(k==="w"||k==="arrowup")keys.up=false;
 if(k==="s"||k==="arrowdown")keys.down=false;
 if(k===" "){keys.jump=false}
 if(k==="x"){keys.shoot=false;releaseCharge()}
 if(k==="e")keys.interact=false;
}
function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener("pointermove",e=>Object.assign(pointer,pointerPos(e)));
canvas.addEventListener("pointerdown",e=>{
 GAME_AUDIO?.unlock?.();const p=pointerPos(e);Object.assign(pointer,p);pointer.down=true;
 if(state==="title"){state="menu";return}
 if(state==="phaseIntro"){beginPendingPhase();return}
 if(state==="play"){const atom=atomHitAt(p.x,p.y);if(atom){equipAtom(atom);return}}
 if(state==="reactor"){const rs=phaseReactions();if(p.y>142&&p.y<390){reactorSelection=clamp(Math.floor((p.y-142)/112),0,rs.length-1);performReaction(rs[reactorSelection]);return}}
 if(state==="play"&&matchMedia("(pointer:coarse)").matches){
   if(p.x<260&&p.y>330){
     joy.active=true;joy.id=e.pointerId;joy.baseX=p.x;joy.baseY=p.y;joy.x=p.x;joy.y=p.y;joy.dx=joy.dy=0;
     canvas.setPointerCapture?.(e.pointerId);return;
   }
   if(p.x>W-230&&p.x<W-120&&p.y>350){player.jumpBuffer=14;keys.jump=true;return}
   if(p.x>W-120&&p.y>350){player.charging=true;player.charge=0;keys.shoot=true;return}
 }
 if(state==="play"){player.charging=true;player.charge=0;keys.shoot=true}
});
canvas.addEventListener("pointermove",e=>{
 const p=pointerPos(e);Object.assign(pointer,p);
 if(joy.active&&e.pointerId===joy.id){
   const dx=p.x-joy.baseX,dy=p.y-joy.baseY,max=58*save.settings.joystickSize,len=Math.hypot(dx,dy)||1;
   const m=Math.min(1,max/len);joy.dx=dx*m;joy.dy=dy*m;
   keys.left=joy.dx<-12;keys.right=joy.dx>12;keys.up=joy.dy<-20;keys.down=joy.dy>20;
 }
});
canvas.addEventListener("pointerup",e=>{
 pointer.down=false;
 if(joy.active&&e.pointerId===joy.id){joy.active=false;joy.id=null;joy.dx=joy.dy=0;keys.left=keys.right=keys.up=keys.down=false}
 if(keys.shoot){keys.shoot=false;releaseCharge()}
 keys.jump=false;
});
canvas.addEventListener("pointercancel",e=>{
 if(joy.active&&e.pointerId===joy.id){joy.active=false;joy.id=null;joy.dx=joy.dy=0;keys.left=keys.right=keys.up=keys.down=false}
 if(keys.shoot){keys.shoot=false;releaseCharge()}
 keys.jump=false;
});
addEventListener("keydown",handleKeyDown);addEventListener("keyup",handleKeyUp);

document.querySelectorAll("#touchControls button").forEach(button=>{
 const action=button.dataset.key;
 const down=e=>{
   e.preventDefault();GAME_AUDIO?.unlock?.();
   if(action==="left")keys.left=true;
   if(action==="right")keys.right=true;
   if(action==="jump"){keys.jump=true;player.jumpBuffer=10}
   if(action==="shoot"&&state==="play"){player.charging=true;player.charge=0;keys.shoot=true}
   if(action==="power"&&state==="play"){state="powers";menu=save.powers.indexOf(player.power)}
   if(action==="interact"){
     if(state==="title")state="menu";
     else if(state==="menu")activateMenu();
     else if(state==="play"){keys.interact=true;setTimeout(()=>keys.interact=false,120)}
     else if(state==="victory")state="map";
   }
 };
 const up=e=>{e.preventDefault();if(action==="left")keys.left=false;if(action==="right")keys.right=false;if(action==="jump")keys.jump=false;if(action==="shoot"){keys.shoot=false;releaseCharge()}if(action==="interact")keys.interact=false};
 button.addEventListener("pointerdown",down);button.addEventListener("pointerup",up);button.addEventListener("pointercancel",up);
});

function loop(now){const dt=now-lastTime;lastTime=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();