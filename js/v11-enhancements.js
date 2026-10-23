/* V11: controles, foco e tela cheia sem alterar a mecânica original. */
(()=>{
 const btn=document.getElementById('v11-fullscreen');
 btn?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('app').requestFullscreen();}catch(e){console.warn('Tela cheia indisponível',e)}});
 document.querySelectorAll('#touchControls button').forEach(b=>{
   b.setAttribute('aria-label',({left:'Mover à esquerda',right:'Mover à direita',jump:'Pular',shoot:'Atirar',interact:'Interagir',power:'Trocar poder'})[b.dataset.key]||b.textContent);
   b.addEventListener('contextmenu',e=>e.preventDefault());
   b.addEventListener('pointerdown',e=>{try{b.setPointerCapture(e.pointerId)}catch(_){}});
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){document.querySelectorAll('#touchControls button').forEach(b=>{if(b.hasPointerCapture){/* pointercancel dispatched on blur below */}b.dispatchEvent(new Event('pointercancel'))})}});
 window.addEventListener('blur',()=>document.querySelectorAll('#touchControls button').forEach(b=>b.dispatchEvent(new Event('pointercancel'))));
})();
