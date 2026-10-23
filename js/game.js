(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),D=window.GAME_DATA,W=960,H=540;
try{const custom=JSON.parse(localStorage.getItem("qmCustomQuestions")||"[]");if(Array.isArray(custom))D.questions.push(...custom)}catch{}
const keys={};let state="title",menuIndex=0,phaseIndex=0,selectedAnswer=0,currentQuestion=null,message="",messageTimer=0,cameraX=0;
const menus=["Mapa-múndi / Campanha","Laboratório Central","Inventário","Síntese","Boss Rush","New Game+","Configurações","Editor de Perguntas","Salvar progresso","Final / Dr. Mol"];
let settingsIndex=0,bossRushActive=false,bossRushPhase=1,lastBossMusicPhase=0;
const settingsItems=["Música","Efeitos","Voz","Voz ativa","Tela cheia","Voltar"];
let infoScrollX=W,infoIndex=0,infoTimer=0;
let mouseAim={x:W/2,y:H/2},mouseDown=false,touchMovePointer=null;
const canvasButtons={
 left:{x:18,y:H-92,w:66,h:66,label:"◀"},
 right:{x:94,y:H-92,w:66,h:66,label:"▶"},
 jump:{x:W-160,y:H-92,w:66,h:66,label:"▲"},
 shoot:{x:W-84,y:H-92,w:66,h:66,label:"X"}
};
const ASSET_PATHS=window.ASSET_MANIFEST||{};
const IMAGES={};
function flattenAssets(obj,out=[]){for(const v of Object.values(obj||{})){if(typeof v==="string")out.push(v);else if(Array.isArray(v))v.forEach(x=>typeof x==="string"?out.push(x):null);else if(v&&typeof v==="object")flattenAssets(v,out)}return out}
for(const path of flattenAssets(ASSET_PATHS)){const im=new Image();im.src=path;IMAGES[path]=im}
function image(path){const im=IMAGES[path];return im&&im.complete&&im.naturalWidth?im:null}
function canvasPoint(ev){
 const r=canvas.getBoundingClientRect();
 return {x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};
}
function inside(pt,b){return pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h}
function pointerActionDown(pt){
 mouseAim=pt;
 if(state==="playing"){
   if(inside(pt,canvasButtons.left)){keys.left=true;return}
   if(inside(pt,canvasButtons.right)){keys.right=true;return}
   if(inside(pt,canvasButtons.jump)){keys.jump=true;player.jumpBuffer=8;return}
   if(inside(pt,canvasButtons.shoot)){shoot();return}
   if(pt.x<W*.38){keys.left=true;touchMovePointer="left"}
   else if(pt.x<W*.62){keys.right=true;touchMovePointer="right"}
   else shoot();
 }else if(state==="title"){state="menu";GAME_AUDIO.unlock();GAME_AUDIO.playMusic("menu")}
 else if(state==="menu"){
   const startY=100,step=39;
   const i=Math.floor((pt.y-startY+20)/step);
   if(i>=0&&i<menus.length){menuIndex=i;activateMenu()}
 }else if(state==="settings"){
   const i=Math.floor((pt.y-125)/55);
   if(i>=0&&i<settingsItems.length){
     settingsIndex=i;
     if(i<=2){
       const value=Math.max(0,Math.min(1,(pt.x-500)/250));
       if(i===0)GAME_AUDIO.setMusicVolume(value);
       if(i===1)GAME_AUDIO.setSfxVolume(value);
       if(i===2)GAME_AUDIO.setVoiceVolume(value);
     }else if(i===3)GAME_AUDIO.toggleVoice();
     else if(i===4){if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.()}
     else state="menu";
   }
 }else if(state==="map"){
   const pts=D.phases.map((p,i)=>({x:100+i*105,y:215+i%2*105,p}));
   let best=-1,dist=999;
   pts.forEach((q,i)=>{const d=Math.hypot(pt.x-q.x,pt.y-q.y);if(d<dist){dist=d;best=i}});
   if(best>=0&&dist<55){phaseIndex=best;if(save.unlockedPhases.includes(best+1)){buildPhase(best+1);GAME_AUDIO.playMusic(`fase${best+1}`)}}
 }else if(state==="question"){
   const i=Math.floor((pt.y-240)/55);
   if(i>=0&&i<3){selectedAnswer=i;answerQuestion()}
 }else if(state==="victory"){state="map";GAME_AUDIO.playMusic("menu")}
 else if(state==="gameover"){state="menu"}
}
function pointerActionUp(){keys.left=false;keys.right=false;keys.jump=false;touchMovePointer=null}
function activateMenu(){
 GAME_AUDIO.play("menu_confirm");
 if(menuIndex===0){state="map";GAME_AUDIO.playMusic("menu")}
 else if(menuIndex===1){state="lab";GAME_AUDIO.playMusic("laboratorio")}
 else if(menuIndex===2)state="inventory";
 else if(menuIndex===3)state="synthesis";
 else if(menuIndex===4)startBossRush();
 else if(menuIndex===5){
   save.newGamePlus=!save.newGamePlus;persist();
   message=save.newGamePlus?"New Game+ ativado: inimigos e chefes mais fortes.":"New Game+ desativado.";
   messageTimer=150;
 }
 else if(menuIndex===6){state="settings";settingsIndex=0}
 else if(menuIndex===7)window.open("editor/perguntas.html","_blank");
 else if(menuIndex===8){persist();message="Progresso salvo.";messageTimer=100}
 else state="final";
}
function startBossRush(){
 bossRushActive=true;bossRushPhase=1;buildPhase(1);
 world.enemies=[];world.items.forEach(i=>i.taken=true);world.terminals.forEach(t=>t.done=true);
 player.x=world.width-850;world.boss.active=true;lastBossMusicPhase=1;
 GAME_AUDIO.play("boss_warning");GAME_AUDIO.speak("Atenção! Boss Rush iniciado!");GAME_AUDIO.bossPhase(1);
}
function answerQuestion(){
 const ok=selectedAnswer===currentQuestion.a;
 save.answers.push({topic:currentQuestion.topic,correct:ok});
 if(ok){GAME_AUDIO.play("correta");player.hp=Math.min(player.maxHp,player.hp+15);message="Resposta correta!"}
 else{GAME_AUDIO.play("errada");damage(8);message="Resposta incorreta."}
 messageTimer=90;persist();state="playing";
}

function drawImageFit(im,x,y,w,h,flip=false){if(!im)return false;ctx.save();if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h)}else ctx.drawImage(im,x,y,w,h);ctx.restore();return true}

function defaultSave(){return{name:"Aluno",unlockedPhases:[1],powers:["Canhão Atômico"],inventory:{H:2,O:1,Na:1,Cl:1},compounds:[],stars:{},answers:[],achievements:[],bosses:0}}
function loadSave(){try{return Object.assign(defaultSave(),JSON.parse(localStorage.getItem("quimicaManSave"))||{})}catch{return defaultSave()}}
const save=loadSave();function persist(){localStorage.setItem("quimicaManSave",JSON.stringify(save))}
const world={width:3600,platforms:[],enemies:[],items:[],terminals:[],checkpoints:[],projectiles:[],enemyProjectiles:[],boss:null};
const player={x:80,y:390,w:38,h:62,vx:0,vy:0,onGround:false,dir:1,hp:100,maxHp:100,lives:3,power:"Canhão Atômico",energy:{},inv:0,checkpoint:{x:80,y:390},score:0,damageTaken:0,jumpBuffer:0,coyote:0};

function text(t,x,y,size=20,color="#fff",align="left"){ctx.fillStyle=color;ctx.font=`bold ${size}px Arial`;ctx.textAlign=align;ctx.fillText(t,x,y)}
function panel(x,y,w,h,color="#4abcf0"){ctx.fillStyle="#081522";ctx.fillRect(x,y,w,h);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h)}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function resetPlayer(){player.x=player.checkpoint.x;player.y=player.checkpoint.y;player.vx=player.vy=0;player.hp=player.maxHp;for(const p of save.powers)player.energy[p]=28;player.energy["Canhão Atômico"]=999}
function buildPhase(id){
 const ph=D.phases[id-1];world.platforms=[{x:0,y:470,w:world.width,h:70}];
 for(let i=1;i<18;i++)world.platforms.push({x:150+i*190,y:[320,360,400,430][i%4],w:130,h:20});
 world.platforms.push({x:1300,y:260,w:130,h:20},{x:1480,y:190,w:130,h:20},{x:1650,y:125,w:180,h:20});
 world.enemies=[];for(let i=0;i<10;i++)world.enemies.push({x:350+i*280,y:i%3===0?300:420,w:48,h:48,hp:(3+i%3)*(save.newGamePlus?2:1),kind:i%6,t:0});
 world.items=ph.collect.map((s,i)=>({x:550+i*700,y:[350,290,350][i],w:34,h:34,symbol:s,taken:false}));
 world.terminals=[{x:900,y:410,w:42,h:60,done:false},{x:2050,y:410,w:42,h:60,done:false},{x:2900,y:410,w:42,h:60,done:false}];
 world.checkpoints=[{x:1200,y:400,w:42,h:70,active:false},{x:2500,y:400,w:42,h:70,active:false}];
 world.projectiles=[];world.enemyProjectiles=[];const bossHp=(60+id*8)*(save.newGamePlus?1.6:1);world.boss={x:world.width-300,y:345,w:105,h:125,hp:bossHp,maxHp:bossHp,t:0,phase:1,name:ph.boss,active:false};
 phaseIndex=id-1;infoScrollX=W;infoIndex=0;infoTimer=0;player.checkpoint={x:80,y:390};player.damageTaken=0;resetPlayer();cameraX=0;state="playing"
}
function physics(){
 const accel=player.onGround?.75:.42;
 if(keys.left){player.vx=Math.max(-5.6,player.vx-accel);player.dir=-1}else if(keys.right){player.vx=Math.min(5.6,player.vx+accel);player.dir=1}else if(player.onGround){player.vx*=.78;if(Math.abs(player.vx)<.08)player.vx=0}
 if(player.onGround)player.coyote=7;else player.coyote=Math.max(0,player.coyote-1);player.jumpBuffer=Math.max(0,player.jumpBuffer-1);
 if(player.jumpBuffer>0&&player.coyote>0){GAME_AUDIO.play("pulo");player.vy=-12.8;player.onGround=false;player.jumpBuffer=player.coyote=0}
 if(!keys.jump&&player.vy<-4)player.vy*=.58;player.vy=Math.min(13.5,player.vy+.62);
 player.x+=player.vx;for(const p of world.platforms)if(hit(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;player.vx=0}
 player.y+=player.vy;player.onGround=false;for(const p of world.platforms)if(hit(player,p)){if(player.vy>0){player.y=p.y-player.h;player.vy=0;player.onGround=true}else if(player.vy<0){player.y=p.y+p.h;player.vy=0}}
 if(player.y>H+200)die();if(player.inv>0)player.inv--
}
function shoot(){GAME_AUDIO.play(player.power);const pow=D.powers[player.power];if((player.energy[player.power]??0)<pow.cost)return;player.energy[player.power]-=pow.cost;world.projectiles.push({x:player.x+(player.dir>0?player.w:-14),y:player.y+player.h*.45,w:14,h:8,vx:pow.speed*player.dir,vy:0,power:player.power,color:pow.color,damage:pow.damage})}
function damage(n){if(player.inv>0)return;GAME_AUDIO.play("dano");player.hp-=n;player.damageTaken+=n;player.inv=60;if(player.hp<=0)die()}
function die(){player.lives--;if(player.lives<0){GAME_AUDIO.play("derrota");state="gameover";return}resetPlayer()}
function updateEnemies(){for(const e of world.enemies){e.t++;if(e.kind===0)e.y+=Math.sin(e.t*.08)*.8;else if(e.kind===1)e.x+=Math.floor(e.t/90)%2===0?1.7:-1.7;else if(e.kind===2)e.x-=1.3;else if(e.kind===3)e.x+=Math.floor(e.t/70)%2===0?1:-1;if(hit(player,e))damage(6+e.kind);if(e.kind===4&&e.t%120===0)world.enemyProjectiles.push({x:e.x,y:e.y+20,w:16,h:16,vx:-5,vy:0,damage:9,color:"#ff6868"})}}
function updateBoss(){const b=world.boss;if(!b.active&&player.x>world.width-1000){b.active=true;lastBossMusicPhase=1;GAME_AUDIO.play("boss_warning");GAME_AUDIO.speak("Chefe se aproximando!");GAME_AUDIO.bossPhase(1);}if(!b.active)return;b.t++;const ratio=b.hp/b.maxHp;b.phase=ratio<=.25?3:ratio<=.5?2:1;if(b.phase!==lastBossMusicPhase){lastBossMusicPhase=b.phase;GAME_AUDIO.bossPhase(b.phase);GAME_AUDIO.speak(b.phase===2?"Segunda fase!":"Fase crítica!")}const interval=b.phase===1?90:b.phase===2?65:45;if(b.t%interval===0){const count=b.phase+1;for(let i=0;i<count;i++)world.enemyProjectiles.push({x:b.x,y:b.y+50,w:18,h:18,vx:-5.5-b.phase,vy:(i-(count-1)/2)*2.2,damage:8+b.phase*2,color:"#ffb35b"})}if(b.phase===3&&b.t%200===0)for(const vy of[-4,-2,0,2,4])world.enemyProjectiles.push({x:b.x,y:b.y+50,w:18,h:18,vx:-7,vy,damage:14,color:"#ffe45d"});if(hit(player,b))damage(15);if(b.hp<=0)winPhase()}
function updateProjectiles(){
 for(const p of world.projectiles)p.x+=p.vx;for(const p of world.enemyProjectiles){p.x+=p.vx;p.y+=p.vy}
 for(const p of [...world.projectiles]){let removed=false;for(const e of [...world.enemies])if(hit(p,e)){e.hp-=p.damage;world.projectiles.splice(world.projectiles.indexOf(p),1);removed=true;if(e.hp<=0){world.enemies.splice(world.enemies.indexOf(e),1);player.score+=100}break}if(removed)continue;const b=world.boss;if(b.active&&hit(p,b)){const weak=D.weaknesses[b.name]===p.power;b.hp-=p.damage*(weak?3:1);world.projectiles.splice(world.projectiles.indexOf(p),1)}}
 for(const p of [...world.enemyProjectiles])if(hit(p,player)){damage(p.damage);world.enemyProjectiles.splice(world.enemyProjectiles.indexOf(p),1)}
 world.projectiles=world.projectiles.filter(p=>p.x>-100&&p.x<world.width+100);world.enemyProjectiles=world.enemyProjectiles.filter(p=>p.x>-100&&p.y<800)
}
function updateObjects(){
 for(const it of world.items)if(!it.taken&&hit(player,it)){it.taken=true;save.inventory[it.symbol]=(save.inventory[it.symbol]||0)+1;player.score+=100;GAME_AUDIO.play("coleta");message=`Elemento coletado: ${it.symbol}`;messageTimer=120;persist()}
 for(let i=0;i<world.checkpoints.length;i++){const cp=world.checkpoints[i];if(hit(player,cp)){cp.active=true;player.checkpoint={x:cp.x,y:390};player.hp=player.maxHp;for(const p of save.powers)player.energy[p]=28;GAME_AUDIO.play("checkpoint");message=`Checkpoint ${i+1} ativado`;messageTimer=100}}
 for(const t of world.terminals)if(!t.done&&hit(player,t)){currentQuestion=D.questions[Math.floor(Math.random()*D.questions.length)];selectedAnswer=0;state="question";t.done=true}
}
function winPhase(){const ph=D.phases[phaseIndex];if(!save.powers.includes(ph.power))save.powers.push(ph.power);player.energy[ph.power]=28;if(!save.unlockedPhases.includes(ph.id+1)&&ph.id<8)save.unlockedPhases.push(ph.id+1);save.bosses++;const collected=world.items.filter(i=>i.taken).length,answered=world.terminals.filter(t=>t.done).length,stars=1+(collected===3?1:0)+(answered===3&&player.damageTaken<40?1:0);save.stars[ph.id]=Math.max(save.stars[ph.id]||0,stars);persist();GAME_AUDIO.play("vitoria");GAME_AUDIO.speak(`${ph.boss} derrotado!`);
 if(bossRushActive){
   if(bossRushPhase<8){
     bossRushPhase++;buildPhase(bossRushPhase);world.enemies=[];world.items.forEach(i=>i.taken=true);world.terminals.forEach(t=>t.done=true);player.x=world.width-850;world.boss.active=true;GAME_AUDIO.bossPhase(1);message=`Boss Rush ${bossRushPhase}/8`;messageTimer=120;return;
   }
   bossRushActive=false;message="BOSS RUSH COMPLETO!";state="victory";GAME_AUDIO.playMusic("vitoria");return;
 }
 message=`${ph.boss} derrotado! Poder: ${ph.power}`;state="victory";GAME_AUDIO.playMusic("vitoria")}
function synthesize(){for(const c of D.compounds){if(save.compounds.includes(c.formula))continue;let ok=true;for(const[k,v]of Object.entries(c.need))if((save.inventory[k]||0)<v)ok=false;if(ok){for(const[k,v]of Object.entries(c.need))save.inventory[k]-=v;save.compounds.push(c.formula);persist();message=`Síntese concluída: ${c.formula}`;return}}message="Nenhuma síntese disponível com os reagentes atuais."}

let prevPadButtons=[];
function updateGamepad(){
 const pads=navigator.getGamepads?navigator.getGamepads():[];
 const p=[...pads].find(Boolean);if(!p)return;
 const ax=p.axes[0]||0;
 keys.left=ax<-.35||p.buttons[14]?.pressed;
 keys.right=ax>.35||p.buttons[15]?.pressed;
 const jump=p.buttons[0]?.pressed||p.buttons[12]?.pressed;
 if(jump&&!prevPadButtons[0])player.jumpBuffer=8;
 keys.jump=jump;
 if(p.buttons[2]?.pressed&&!prevPadButtons[2]&&state==="playing")shoot();
 if(p.buttons[3]?.pressed&&!prevPadButtons[3]&&state==="playing"){const a=save.powers;player.power=a[(a.indexOf(player.power)+1)%a.length];GAME_AUDIO.play("menu_confirm")}
 if(p.buttons[9]?.pressed&&!prevPadButtons[9]){
   if(state==="title")state="menu";
   else if(state==="menu")activateMenu();
   else if(state==="victory")state="map";
 }
 prevPadButtons=p.buttons.map(b=>b.pressed);
}
function update(){updateGamepad();if(state==="playing"){physics();updateEnemies();updateBoss();updateProjectiles();updateObjects();cameraX+=(Math.max(0,Math.min(world.width-W,player.x-W*.45))-cameraX)*.1;if(messageTimer>0)messageTimer--;
    const info=(D.familyInfo&&D.familyInfo[String(phaseIndex+1)])||[];
    if(info.length){
      infoScrollX-=1.25;
      infoTimer++;
      const estimatedWidth=(info[infoIndex]||"").length*10+80;
      if(infoScrollX<-estimatedWidth){
        infoIndex=(infoIndex+1)%info.length;
        infoScrollX=W;
      }
    }
  }}
function drawQuimix(x,y,dir=1){
 const moving=Math.abs(player.vx)>.35;
 const path=!player.onGround?ASSET_PATHS.hero.jump:(moving?ASSET_PATHS.hero.run[Math.floor(performance.now()/130)%ASSET_PATHS.hero.run.length]:ASSET_PATHS.hero.idle);
 const im=image(path);
 if(drawImageFit(im,x-15,y-16,72,82,dir<0))return;
 ctx.save();ctx.translate(x+(dir<0?38:0),y);ctx.scale(dir,1);ctx.fillStyle="#7edaff";ctx.fillRect(7,9,25,18);ctx.fillStyle="#8c4b25";ctx.fillRect(8,0,22,11);ctx.fillStyle="#f3f7fa";ctx.fillRect(5,27,28,28);ctx.fillStyle="#2f8f76";ctx.fillRect(12,31,14,16);ctx.restore()
}
function draw(){ctx.clearRect(0,0,W,H);({title:drawTitle,menu:drawMenu,map:drawMap,lab:drawLab,inventory:drawInventory,synthesis:drawSynthesis,playing:drawGame,question:drawQuestion,victory:()=>drawModal("VITÓRIA!",message,"ENTER continua"),gameover:()=>drawModal("DERROTA","Quimix foi derrotado.","ENTER volta ao menu"),final:drawFinal,settings:drawSettings}[state]||drawTitle)()}
function drawTitle(){ctx.fillStyle="#09182b";ctx.fillRect(0,0,W,H);text("QUÍMICA MAN HTML5",W/2,150,48,"#58cfff","center");text("QUIMIX: REAÇÕES & COMPOSTOS",W/2,205,25,"#ffe365","center");drawQuimix(W/2-20,255,1);text("Pressione ENTER",W/2,430,22,"#fff","center")}
function drawMenu(){
 ctx.fillStyle="#0a1a2c";ctx.fillRect(0,0,W,H);
 text("MENU PRINCIPAL",W/2,52,34,"#5bd0ff","center");
 menus.forEach((m,i)=>text(`${i===menuIndex?"> ":"  "}${m}`,270,100+i*39,19,i===menuIndex?"#ffe365":"#fff"));
 text(`Aluno: ${save.name} | Chefes: ${save.bosses}/8 | New Game+: ${save.newGamePlus?"ON":"OFF"}`,30,510,15,"#c8dce8")
}
function drawSettings(){
 ctx.fillStyle="#0b1d31";ctx.fillRect(0,0,W,H);text("CONFIGURAÇÕES",W/2,65,36,"#58cfff","center");
 const vals=[
  `${Math.round(GAME_AUDIO.musicVolume*100)}%`,
  `${Math.round(GAME_AUDIO.sfxVolume*100)}%`,
  `${Math.round(GAME_AUDIO.voiceVolume*100)}%`,
  GAME_AUDIO.voiceEnabled?"SIM":"NÃO",
  document.fullscreenElement?"ATIVA":"DESATIVADA",
  ""
 ];
 settingsItems.forEach((m,i)=>{text(`${i===settingsIndex?"> ":"  "}${m}`,280,145+i*55,23,i===settingsIndex?"#ffe365":"#fff");text(vals[i],650,145+i*55,21,"#bdeaff","right")});
 text("↑/↓ selecionar · ←/→ ajustar · ENTER confirmar · ESC voltar",W/2,500,16,"#fff","center")
}
function drawMap(){
 const map=image(ASSET_PATHS.map);
 if(map)ctx.drawImage(map,0,0,W,H);else{ctx.fillStyle="#123a4f";ctx.fillRect(0,0,W,H)}
 ctx.fillStyle="rgba(5,18,28,.44)";ctx.fillRect(0,0,W,H);
 text("MAPA-MÚNDI QUÍMICO",W/2,42,31,"#fff","center");
 const pts=D.phases.map((p,i)=>({x:100+i*105,y:215+i%2*105,p}));
 pts.forEach((q,i)=>{
   ctx.fillStyle=i===phaseIndex?"#ffe365":save.unlockedPhases.includes(q.p.id)?q.p.accent:"#4c5864";
   ctx.beginPath();ctx.arc(q.x,q.y,25,0,Math.PI*2);ctx.fill();
   text(q.p.id,q.x,q.y+6,18,"#111","center");
   const label=q.p.mapLabel||q.p.name.replace("Reino do ","").replace("Fortaleza do ","").replace("Cidade do ","").replace("Bosque do ","").replace("Vale do ","").replace("Templo do ","").replace("Domínio dos ","").replace("Palácio dos ","");
   text(label,q.x,q.y+43,12,i===phaseIndex?"#ffe365":"#fff","center");
 });
 const selected=D.phases[phaseIndex];
 panel(245,395,470,72,selected.accent);
 text(`${selected.id}. ${selected.name}`,W/2,425,23,"#fff","center");
 text(selected.family,W/2,451,16,selected.accent,"center");
 text("←/→ escolher | ENTER jogar | ESC voltar",W/2,510,17,"#fff","center")
}
function drawLab(){
 const bg=image(ASSET_PATHS.backgrounds[0]);if(bg)ctx.drawImage(bg,0,0,W,H);else{ctx.fillStyle="#164b55";ctx.fillRect(0,0,W,H)}
 ctx.fillStyle="rgba(5,20,25,.42)";ctx.fillRect(0,0,W,H);text("LABORATÓRIO CENTRAL",W/2,50,34,"#fff","center");
 const names=["Professor Íon","Dra. Catalis","Robô Béquer","Pipeta"];
 names.forEach((n,i)=>{panel(75+i*215,180,175,155,"#69e6c1");const im=image(ASSET_PATHS.lab[i]);if(im)ctx.drawImage(im,115+i*215,205,95,95);text(n,162+i*215,335,17,"#fff","center")});
 text("1-4 interagir | ESC voltar",W/2,490,18,"#fff","center")
}
function drawInventory(){ctx.fillStyle="#0c1d31";ctx.fillRect(0,0,W,H);text("INVENTÁRIO QUÍMICO",W/2,50,34,"#fff","center");panel(40,80,410,400);panel(510,80,410,400,"#71e6ad");text("Elementos / Reagentes",70,115,22,"#59d1ff");let y=150;Object.entries(save.inventory).filter(([,v])=>v>0).slice(0,12).forEach(([k,v])=>{text(`${k} × ${v}`,80,y,18);y+=28});text("Compostos descobertos",540,115,22,"#77efb4");y=150;save.compounds.forEach(c=>{text(c,550,y,18);y+=28});text("ESC voltar",W/2,515,16,"#fff","center")}
function drawSynthesis(){ctx.fillStyle="#111f32";ctx.fillRect(0,0,W,H);text("LABORATÓRIO DE SÍNTESE",W/2,55,34,"#fff","center");D.compounds.forEach((c,i)=>{const need=Object.entries(c.need).map(([k,v])=>`${k}×${v}`).join(" + ");text(`${c.formula} — ${c.name} | ${need}`,110,115+i*43,18,save.compounds.includes(c.formula)?"#71e6ad":"#fff")});text("ENTER sintetiza o primeiro composto possível | ESC volta",W/2,500,16,"#fff","center")}
function drawGame(){
 const ph=D.phases[phaseIndex];
 const bg=image(ASSET_PATHS.backgrounds[phaseIndex]);
 if(bg){
   const par=-cameraX*.15;
   for(let x=(par%W)-W;x<W*2;x+=W)ctx.drawImage(bg,x,0,W,H);
 }else{ctx.fillStyle="#183652";ctx.fillRect(0,0,W,H)}
 ctx.fillStyle="rgba(12,28,44,.22)";ctx.fillRect(0,0,W,H);
 const ground=image(ASSET_PATHS.tiles.ground),platform=image(ASSET_PATHS.tiles.platform);
 for(const p of world.platforms){
   const im=p.h>30?ground:platform;
   if(im){const tw=Math.max(40,Math.round(im.width*(p.h/im.height)));for(let x=p.x-cameraX;x<p.x-cameraX+p.w;x+=tw)ctx.drawImage(im,x,p.y,tw,p.h)}
   else{ctx.fillStyle="#4d5968";ctx.fillRect(p.x-cameraX,p.y,p.w,p.h)}
   ctx.fillStyle=ph.accent;ctx.fillRect(p.x-cameraX,p.y,p.w,3)
 }
 for(let i=0;i<world.items.length;i++){const it=world.items[i];if(!it.taken){const im=image(ASSET_PATHS.collectibles[i%ASSET_PATHS.collectibles.length]);if(im)ctx.drawImage(im,it.x-cameraX,it.y,it.w,it.h);else{ctx.fillStyle=ph.accent;ctx.beginPath();ctx.arc(it.x-cameraX+17,it.y+17,17,0,Math.PI*2);ctx.fill()}text(it.symbol,it.x-cameraX+17,it.y+24,14,"#111","center")}}
 for(const cp of world.checkpoints){const im=image(ASSET_PATHS.tiles.checkpoint);if(im)ctx.drawImage(im,cp.x-cameraX,cp.y,cp.w,cp.h);else{ctx.fillStyle=cp.active?"#ffe365":"#55758a";ctx.fillRect(cp.x-cameraX,cp.y,cp.w,cp.h)}}
 for(const t of world.terminals)if(!t.done){const im=image(ASSET_PATHS.tiles.terminal);if(im)ctx.drawImage(im,t.x-cameraX,t.y,t.w,t.h);else{ctx.fillStyle="#3cc4e8";ctx.fillRect(t.x-cameraX,t.y,t.w,t.h)}}
 for(const e of world.enemies){
   const familyList=(ASSET_PATHS.familyEnemies&&ASSET_PATHS.familyEnemies[String(phaseIndex+1)])||ASSET_PATHS.enemies;
   const enemyPath=familyList[e.kind%familyList.length];
   const im=image(enemyPath);
   if(im)ctx.drawImage(im,e.x-cameraX,e.y,e.w,e.h);
   else{ctx.fillStyle="#d06b58";ctx.fillRect(e.x-cameraX,e.y,e.w,e.h)}
 }
 for(const p of world.projectiles){ctx.fillStyle=p.color;ctx.fillRect(p.x-cameraX,p.y,p.w,p.h)}
 for(const p of world.enemyProjectiles){ctx.fillStyle=p.color;ctx.fillRect(p.x-cameraX,p.y,p.w,p.h)}
 if(world.boss.active){const im=image(ASSET_PATHS.bosses[phaseIndex]);if(im)ctx.drawImage(im,world.boss.x-cameraX-15,world.boss.y-10,135,145);else{ctx.fillStyle=ph.accent;ctx.fillRect(world.boss.x-cameraX,world.boss.y,world.boss.w,world.boss.h)}text(ph.boss,world.boss.x-cameraX+world.boss.w/2,world.boss.y-12,16,"#fff","center")}
 drawQuimix(player.x-cameraX,player.y,player.dir);
 // PLACA INFORMATIVA ROLANTE DA FAMÍLIA
 const infoList=(D.familyInfo&&D.familyInfo[String(phaseIndex+1)])||[];
 if(infoList.length){
   const boardX=170,boardY=12,boardW=500,boardH=42;
   ctx.fillStyle="rgba(7,18,28,.92)";ctx.fillRect(boardX,boardY,boardW,boardH);
   ctx.strokeStyle=ph.accent;ctx.lineWidth=2;ctx.strokeRect(boardX,boardY,boardW,boardH);
   ctx.save();ctx.beginPath();ctx.rect(boardX+8,boardY+4,boardW-16,boardH-8);ctx.clip();
   text(infoList[infoIndex],infoScrollX,boardY+28,16,"#eaf8ff","left");
   ctx.restore();
   text("INFO",boardX+8,boardY-3,11,ph.accent);
 }
 text(ph.name,18,100,22);text(`Poder: ${player.power} | Energia: ${player.energy[player.power]??0}`,18,124,15);text(`Vidas: ${player.lives} | Pontos: ${player.score}`,18,146,15);
 ctx.fillStyle="#222";ctx.fillRect(720,15,220,20);ctx.fillStyle="#45d36f";ctx.fillRect(720,15,220*Math.max(0,player.hp)/player.maxHp,20);text(`HP ${Math.max(0,player.hp)}`,830,31,14,"#fff","center");
 if(world.boss.active){ctx.fillStyle="#222";ctx.fillRect(650,52,290,18);ctx.fillStyle="#e75b5b";ctx.fillRect(650,52,290*world.boss.hp/world.boss.maxHp,18)}
 if(messageTimer>0)text(message,W/2,175,18,"#ffe365","center");
 // CONTROLES DE MOUSE/TOQUE NO CANVAS
 for(const b of Object.values(canvasButtons)){
   ctx.fillStyle="rgba(10,35,55,.62)";ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,14);ctx.fill();
   ctx.strokeStyle="rgba(130,220,255,.85)";ctx.lineWidth=2;ctx.stroke();
   text(b.label,b.x+b.w/2,b.y+b.h/2+10,28,"#fff","center");
 }
}
function drawQuestion(){ctx.fillStyle="#0d1c30";ctx.fillRect(0,0,W,H);panel(90,70,780,400,"#56c9f2");text("TERMINAL QUÍMICO",W/2,125,32,"#fff","center");text(currentQuestion.q,W/2,195,22,"#fff","center");currentQuestion.ops.forEach((o,i)=>text(`${i===selectedAnswer?"> ":""}${i+1}) ${o}`,250,260+i*55,22,i===selectedAnswer?"#ffe365":"#fff"));text("↑/↓ selecionar | ENTER responder",W/2,430,17,"#fff","center")}
function drawModal(title,body,hint){ctx.fillStyle="#091522";ctx.fillRect(0,0,W,H);panel(170,130,620,280,"#ffe365");text(title,W/2,205,40,"#fff","center");text(body,W/2,275,20,"#fff","center");text(hint,W/2,345,17,"#ffe365","center")}
function drawFinal(){const complete=save.bosses>=8;ctx.fillStyle=complete?"#493817":"#152944";ctx.fillRect(0,0,W,H);text(complete?"FINAL CIENTISTA MESTRE":"FINAL NORMAL",W/2,120,42,complete?"#ffe365":"#5bd0ff","center");text(complete?"Quimix restaurou as oito regiões químicas!":"Continue derrotando chefes e completando o Elementodex.",W/2,210,21,"#fff","center");text(`Compostos: ${save.compounds.length}/${D.compounds.length} | Chefes: ${save.bosses}/8`,W/2,270,18,"#fff","center");text("ESC voltar",W/2,430,17,"#fff","center")}
function onKeyDown(e){GAME_AUDIO.unlock();const k=e.key.toLowerCase();if(["arrowleft","a"].includes(k))keys.left=true;if(["arrowright","d"].includes(k))keys.right=true;if(["arrowup","w"," "].includes(k)){keys.jump=true;player.jumpBuffer=8}if(k==="m"){GAME_AUDIO.toggleMute();message=GAME_AUDIO.muted?"Som desligado":"Som ligado";messageTimer=90;}if(k==="x"&&state==="playing")shoot();if(k==="tab"&&state==="playing"){e.preventDefault();const a=save.powers;player.power=a[(a.indexOf(player.power)+1)%a.length];GAME_AUDIO.play("poder")}if(state==="title"&&e.key==="Enter"){state="menu";GAME_AUDIO.playMusic("menu");}else if(state==="menu"){if(k==="arrowup"){menuIndex=(menuIndex-1+menus.length)%menus.length;GAME_AUDIO.play("menu_select")}if(k==="arrowdown"){menuIndex=(menuIndex+1)%menus.length;GAME_AUDIO.play("menu_select")}if(e.key==="Enter")activateMenu()}else if(state==="settings"){
 if(k==="arrowup")settingsIndex=(settingsIndex-1+settingsItems.length)%settingsItems.length;
 if(k==="arrowdown")settingsIndex=(settingsIndex+1)%settingsItems.length;
 const delta=k==="arrowleft"?-.05:k==="arrowright"?.05:0;
 if(delta){
  if(settingsIndex===0)GAME_AUDIO.setMusicVolume(GAME_AUDIO.musicVolume+delta);
  if(settingsIndex===1)GAME_AUDIO.setSfxVolume(GAME_AUDIO.sfxVolume+delta);
  if(settingsIndex===2)GAME_AUDIO.setVoiceVolume(GAME_AUDIO.voiceVolume+delta);
 }
 if(e.key==="Enter"){
  if(settingsIndex===3)GAME_AUDIO.toggleVoice();
  else if(settingsIndex===4){if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.()}
  else if(settingsIndex===5)state="menu";
 }
 if(e.key==="Escape")state="menu";
 }else if(state==="map"){if(k==="arrowleft")phaseIndex=(phaseIndex-1+8)%8;if(k==="arrowright")phaseIndex=(phaseIndex+1)%8;if(e.key==="Enter"&&save.unlockedPhases.includes(phaseIndex+1)){buildPhase(phaseIndex+1);GAME_AUDIO.playMusic(`fase${phaseIndex+1}`);}if(e.key==="Escape")state="menu"}else if(state==="lab"){if(k==="1"){message="Professor Íon: explore e aprenda com cada família.";messageTimer=100}if(k==="2")state="synthesis";if(k==="3"){message=`Poderes: ${save.powers.join(", ")}`;messageTimer=100}if(k==="4"){message="Pipeta: encontre elementos secretos e responda terminais.";messageTimer=100}if(e.key==="Escape")state="menu"}else if(state==="inventory"||state==="synthesis"||state==="final"){if(e.key==="Escape")state="menu";if(state==="synthesis"&&e.key==="Enter")synthesize()}else if(state==="question"){if(k==="arrowup")selectedAnswer=(selectedAnswer+2)%3;if(k==="arrowdown")selectedAnswer=(selectedAnswer+1)%3;if(e.key==="Enter")answerQuestion()}else if(state==="victory"&&e.key==="Enter"){state="map";GAME_AUDIO.playMusic("menu");}else if(state==="gameover"&&e.key==="Enter")state="menu"}
function onKeyUp(e){const k=e.key.toLowerCase();if(["arrowleft","a"].includes(k))keys.left=false;if(["arrowright","d"].includes(k))keys.right=false;if(["arrowup","w"," "].includes(k))keys.jump=false}
canvas.addEventListener("pointerdown",e=>{e.preventDefault();GAME_AUDIO.unlock();mouseDown=true;canvas.setPointerCapture?.(e.pointerId);pointerActionDown(canvasPoint(e))});
canvas.addEventListener("pointermove",e=>{mouseAim=canvasPoint(e);if(mouseDown&&state==="playing"&&touchMovePointer){keys.left=touchMovePointer==="left";keys.right=touchMovePointer==="right"}});
canvas.addEventListener("pointerup",e=>{e.preventDefault();mouseDown=false;pointerActionUp()});
canvas.addEventListener("pointercancel",()=>{mouseDown=false;pointerActionUp()});
canvas.addEventListener("contextmenu",e=>e.preventDefault());
addEventListener("keydown",onKeyDown);addEventListener("keyup",onKeyUp);
document.querySelectorAll("#touchControls button").forEach(btn=>{const key=btn.dataset.key;const down=e=>{e.preventDefault();GAME_AUDIO.unlock();
 if(key==="left"||key==="right"){keys[key]=true}
 else if(key==="jump"){keys.jump=true;player.jumpBuffer=8}
 else if(key==="shoot"&&state==="playing")shoot();
 else if(key==="power"&&state==="playing"){const a=save.powers;player.power=a[(a.indexOf(player.power)+1)%a.length];GAME_AUDIO.play("poder")}
 else if(key==="interact"){
   if(state==="title")state="menu";
   else if(state==="victory")state="map";
   else if(state==="gameover")state="menu";
   else if(state==="question")answerQuestion();
 }
};const up=e=>{e.preventDefault();if(key==="left"||key==="right"||key==="jump")keys[key]=false};btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointercancel",up)});
function loop(){update();draw();requestAnimationFrame(loop)}loop();
})();