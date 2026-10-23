window.GAME_AUDIO = (() => {
  const ROOT = "assets/audio/ultimate/";
  const musicFiles = {
    menu:"music/menu.wav", laboratorio:"music/laboratorio.wav",
    fase1:"music/fase1.wav", fase2:"music/fase2.wav",
    fase3:"music/fase3.wav", fase4:"music/fase4.wav",
    fase5:"music/fase5.wav", fase6:"music/fase6.wav",
    fase7:"music/fase7.wav", fase8:"music/fase8.wav",
    boss1:"music/boss1.wav", boss2:"music/boss2.wav",
    boss3:"music/boss3.wav", drmol:"music/drmol.wav",
    vitoria:"music/vitoria.wav"
  };
  const sfxFiles = {
    "Canhão Atômico":"sfx/tiro_atomico.wav",
    "Explosão Alcalina":"sfx/explosao_alcalina.wav",
    "Barreira Mineral":"sfx/barreira_mineral.wav",
    "Escudo Metálico":"sfx/escudo_metalico.wav",
    "Lâmina de Carbono":"sfx/lamina_carbono.wav",
    "Nuvem Nitrogenada":"sfx/nuvem_nitrogenada.wav",
    "Pulso Oxidante":"sfx/pulso_oxidante.wav",
    "Rajada Halogênica":"sfx/rajada_halogenica.wav",
    "Campo Inerte":"sfx/campo_inerte.wav",
    tiro:"sfx/tiro_atomico.wav", poder:"sfx/menu_confirm.wav", checkpoint:"sfx/checkpoint.wav",
    pulo:"sfx/pulo.wav", dano:"sfx/dano.wav",
    coleta:"sfx/coleta.wav", checkpoint:"sfx/checkpoint.wav",
    menu_select:"sfx/menu_select.wav", menu_confirm:"sfx/menu_confirm.wav",
    correta:"sfx/resposta_certa.wav", errada:"sfx/resposta_errada.wav",
    boss_warning:"sfx/boss_warning.wav", vitoria:"sfx/vitoria.wav",
    derrota:"sfx/derrota.wav"
  };

  let unlocked=false, muted=false, music=null, current="", fadeToken=0;
  let musicVolume=Number(localStorage.getItem("qmMusicVolume") ?? .35);
  let sfxVolume=Number(localStorage.getItem("qmSfxVolume") ?? .55);
  let voiceVolume=Number(localStorage.getItem("qmVoiceVolume") ?? .65);
  let voiceEnabled=localStorage.getItem("qmVoiceEnabled") !== "false";
  const sfxCache={};

  for(const [name,file] of Object.entries(sfxFiles)){
    const a=new Audio(ROOT+file);a.preload="auto";sfxCache[name]=a;
  }

  function unlock(){
    if(unlocked)return;
    unlocked=true;
    const a=new Audio();a.muted=true;a.play().catch(()=>{});
  }

  function play(name){
    if(muted||!unlocked)return;
    const source=sfxCache[name]||sfxCache.menu_select;
    if(!source)return;
    const a=source.cloneNode();a.volume=sfxVolume;a.play().catch(()=>{});
  }

  function stopMusic(){
    fadeToken++;
    if(music){music.pause();music.currentTime=0}
    music=null;current="";
  }

  function playMusic(name,fade=.55){
    if(!musicFiles[name]||muted||!unlocked)return;
    if(current===name&&music&&!music.paused)return;
    const token=++fadeToken;
    const old=music;
    const next=new Audio(ROOT+musicFiles[name]);
    next.loop=true;next.volume=0;next.play().catch(()=>{});
    current=name;music=next;
    const steps=18,dt=Math.max(20,fade*1000/steps);
    let i=0;
    const timer=setInterval(()=>{
      if(token!==fadeToken){clearInterval(timer);return}
      i++;
      next.volume=Math.min(musicVolume,musicVolume*i/steps);
      if(old)old.volume=Math.max(0,musicVolume*(1-i/steps));
      if(i>=steps){
        clearInterval(timer);
        if(old){old.pause();old.currentTime=0}
        next.volume=musicVolume;
      }
    },dt);
  }

  function bossPhase(phase){
    playMusic(`boss${Math.max(1,Math.min(3,phase))}`,.35);
  }

  function speak(text){
    if(!voiceEnabled||muted||!("speechSynthesis" in window))return;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="pt-BR";u.rate=1.05;u.pitch=1.12;u.volume=voiceVolume;
    speechSynthesis.speak(u);
  }

  function setMusicVolume(v){
    musicVolume=Math.max(0,Math.min(1,v));localStorage.setItem("qmMusicVolume",musicVolume);
    if(music)music.volume=musicVolume;
  }
  function setSfxVolume(v){sfxVolume=Math.max(0,Math.min(1,v));localStorage.setItem("qmSfxVolume",sfxVolume)}
  function setVoiceVolume(v){voiceVolume=Math.max(0,Math.min(1,v));localStorage.setItem("qmVoiceVolume",voiceVolume)}
  function toggleVoice(){voiceEnabled=!voiceEnabled;localStorage.setItem("qmVoiceEnabled",voiceEnabled);return voiceEnabled}
  function toggleMute(){muted=!muted;if(music)music.muted=muted;if(muted&&"speechSynthesis"in window)speechSynthesis.cancel();return muted}

  return {
    unlock,play,playMusic,bossPhase,stopMusic,speak,
    setMusicVolume,setSfxVolume,setVoiceVolume,toggleVoice,toggleMute,
    get musicVolume(){return musicVolume},
    get sfxVolume(){return sfxVolume},
    get voiceVolume(){return voiceVolume},
    get voiceEnabled(){return voiceEnabled},
    get muted(){return muted}
  };
})();