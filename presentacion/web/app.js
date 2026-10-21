'use strict';
const slides = [...document.querySelectorAll('.slide')];
const dialog = document.querySelector('#index');
let current = 0;
let transitionVersion = 0;
function show(index) {
  const next = Math.max(0, Math.min(slides.length - 1, index));
  const outgoing = slides[current];
  const incoming = slides[next];
  const direction = next >= current ? 1 : -1;
  const moveFocus = outgoing.contains(document.activeElement);
  const wasVisible = outgoing.classList.contains('active');
  const version = ++transitionVersion;
  slides.forEach(slide => {
    slide.getAnimations().forEach(animation => animation.cancel());
    slide.classList.remove('leaving');
  });
  current = next;
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === current);
    slide.setAttribute('aria-hidden', i !== current);
    slide.inert = i !== current;
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (wasVisible && outgoing !== incoming && !reducedMotion && incoming.animate) {
    outgoing.classList.add('leaving');
    const options = {duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'};
    const exit = outgoing.animate([
      {opacity: 1, transform: 'translateX(0)'},
      {opacity: 0, transform: `translateX(${-direction * 14}px)`}
    ], {...options, duration: 300, fill: 'forwards'});
    incoming.animate([
      {opacity: 0, transform: `translateX(${direction * 18}px)`},
      {opacity: 1, transform: 'translateX(0)'}
    ], options);
    exit.finished.then(() => {
      if (version === transitionVersion) {
        outgoing.classList.remove('leaving');
        exit.cancel();
      }
    }).catch(() => {}); // A new navigation cancels the previous transition.
  }
  if (moveFocus) incoming.focus({preventScroll: true});
  document.querySelector('#position').textContent = `${String(current + 1).padStart(2, '0')} / ${slides.length} · JORNADA DOCTORAL`;
  document.querySelector('#progress').style.width = `${(current + 1) / slides.length * 100}%`;
  document.querySelector('#previous').disabled = current === 0;
  document.querySelector('#next').disabled = current === slides.length - 1;
  history.replaceState(null, '', `#${current + 1}`);
  window.scrollTo(0, 0);
}
function readHash() {const n = Number(location.hash.slice(1)); show(Number.isInteger(n) && n > 0 ? n - 1 : 0);}
function overview() {dialog.showModal();}
async function fullscreen() {
  try {if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();}
  catch {document.querySelector('#fullscreen').textContent = 'Usá pantalla completa del navegador';}
}
document.querySelector('#previous').onclick = () => show(current - 1);
document.querySelector('#next').onclick = () => show(current + 1);
document.querySelector('#overview').onclick = overview;
function goHome() {
  if (dialog.open) dialog.close();
  show(0);
  slides[0].focus({preventScroll: true});
}
document.querySelector('#home').onclick = goHome;
document.querySelector('#index-home').onclick = goHome;
document.querySelector('#close-index').onclick = () => dialog.close();
document.querySelector('#fullscreen').onclick = fullscreen;
slides.forEach((slide, i) => {const b = document.createElement('button'); b.textContent = slide.querySelector('.eyebrow').textContent; b.onclick = () => {dialog.close();show(i);slides[i].focus();};document.querySelector('#contents').append(b);});
document.addEventListener('keydown', e => {
  if (dialog.open || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {e.preventDefault();show(current + 1);}
  if (['ArrowLeft', 'PageUp'].includes(e.key)) {e.preventDefault();show(current - 1);}
  if (e.key === 'Home') show(0);
  if (e.key === 'End') show(slides.length - 1);
  if (e.key.toLowerCase() === 'i') overview();
  if (e.key.toLowerCase() === 'f') fullscreen();
});
window.addEventListener('hashchange', readHash);
readHash();
// Datos de desarrollo de obtenerEcosistema en AIMoneyLoop.hs.
// [nombre, ingresos, capitalización, deuda, x, y]
const nodes = [
 ['ASML',7500,340000,5000,75,70], ['TSMC',28000,1000000,8000,260,70],
 ['SK_Hynix',27980,90000,4000,75,180], ['Micron',21750,110000,9000,75,285],
 ['Samsung',60000,380000,30000,75,390], ['NVIDIA',96200,4500000,12000,340,245],
 ['CoreWeave',3500,25000,6000,535,100], ['Microsoft',65000,3100000,95000,650,245],
 ['Oracle',13300,490000,86000,535,390], ['Broadcom',14000,900000,15000,340,410]
];
// [origen, destino, ventas, participación, colateral]
const edges = [
 ['NVIDIA','CoreWeave',2000,1500,3000], ['NVIDIA','Microsoft',25000,0,0],
 ['NVIDIA','Oracle',9000,0,0], ['TSMC','NVIDIA',12000,0,0],
 ['SK_Hynix','NVIDIA',4500,0,0], ['Micron','NVIDIA',3800,0,0],
 ['Samsung','NVIDIA',3200,0,0], ['Microsoft','NVIDIA',0,0,0],
 ['Oracle','NVIDIA',0,0,0], ['CoreWeave','Microsoft',1200,0,0],
 ['ASML','TSMC',3000,0,0], ['Broadcom','NVIDIA',0,0,0]
];
const byName = Object.fromEntries(nodes.map(n => [n[0], n]));
const safeDiv = (x, y) => y === 0 ? 0 : x / y;
function weight(edge) {
 const [a,b,v,e,g] = edge;
 return Math.max(0, Math.min(1, .5 * safeDiv(v,byName[a][1]) + .3 * safeDiv(e,byName[b][2]) + .2 * safeDiv(g,byName[b][3])));
}
// Actualización simultánea: cada aporte se calcula sobre el estado anterior.
function propagate(state, network = true) {
 const next = {...state};
 if (network) edges.forEach(edge => {next[edge[1]] += weight(edge) * state[edge[0]];});
 return next;
}
const sim = document.querySelector('#simulation');
sim.innerHTML = `<div class="sim-controls"><label>Origen<select id="origin">${nodes.map(n=>`<option value="${n[0]}">${n[0]}</option>`).join('')}</select></label><label>Shock inicial (unidades)<input id="shock" type="range" min="10" max="200" step="10" value="100"><output id="shock-value">100</output></label><label>Modelo<select id="model"><option value="fixed">M1 · Pesos estructurales</option><option value="none">M0 · Sin red</option></select></label><button id="back-step">− Paso</button><button id="step">+ Paso</button><button id="reset">Reiniciar</button></div><p class="metric" id="step-label" aria-live="polite"></p><div class="sim-layout"><svg class="network" viewBox="0 0 740 455" role="group" aria-label="Grafo interactivo: seleccioná una empresa para iniciar el shock"></svg><div><p class="sim-caption">Impacto acumulado · unidades de simulación</p><div class="ranking"></div></div></div><p class="sim-caption"><span class="edge-key">Azul: arista con peso positivo.</span> Discontinua: relación con peso cero. Las flechas siguen la dirección del prototipo; seleccioná un nodo para cambiar el origen.</p><p class="sim-caption">Datos de ejemplo del Haskell, sin calibración empírica. Paso ≠ día. El impacto no representa un retorno bursátil ni una predicción. Modelo acumulativo sin amortiguación; exploración limitada a 8 pasos.</p>`;
let steps = 0;
const origin = document.querySelector('#origin'); origin.value = 'SK_Hynix';
const shock = document.querySelector('#shock');
const model = document.querySelector('#model');
const svg = sim.querySelector('svg');
const ns = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent = svg) {const el = document.createElementNS(ns, tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;}
function renderSimulation() {
 const magnitude = Number(shock.value);
 document.querySelector('#shock-value').textContent = magnitude;
 let state = Object.fromEntries(nodes.map(n=>[n[0],n[0]===origin.value?magnitude:0]));
 for (let i=0;i<steps;i++) state = propagate(state, model.value==='fixed');
 svg.replaceChildren();
 const defs=svgEl('defs',{});const marker=svgEl('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'},defs);svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#85c5dc'},marker);
 edges.forEach(edge=>{
  const a=byName[edge[0]],b=byName[edge[1]],w=weight(edge),dx=b[4]-a[4],dy=b[5]-a[5],d=Math.hypot(dx,dy),pad=36;
  const line=svgEl('line',{x1:a[4]+dx/d*pad,y1:a[5]+dy/d*pad,x2:b[4]-dx/d*pad,y2:b[5]-dy/d*pad,stroke:w?'#85c5dc':'#46525e','stroke-width':w?1+w*7:1,'stroke-dasharray':w?'none':'4 5','marker-end':w?'url(#arrow)':'',opacity:model.value==='none'?.15:.65});
  svgEl('title',{},line).textContent=`${a[0]} → ${b[0]} · peso ${(w*100).toFixed(2)} %`;
 });
 nodes.forEach(n=>{
  const active=n[0]===origin.value,value=state[n[0]];
  const group=svgEl('g',{class:'node',role:'button',tabindex:0,'aria-label':`${n[0]}, impacto ${value.toFixed(2)}. Seleccionar como origen`});
  svgEl('circle',{cx:n[4],cy:n[5],r:32,fill:active?'#d8ed88':value>0?'#2a5361':'#192735',stroke:active?'#d8ed88':'#547080','stroke-width':2},group);
  const label=svgEl('text',{x:n[4],y:n[5]+4,'text-anchor':'middle',style:active?'fill:#101a24;font-size:11px':'font-size:11px'},group);label.textContent=n[0];
  svgEl('text',{x:n[4],y:n[5]+51,'text-anchor':'middle',class:'value'},group).textContent=value.toFixed(2);
  const choose=()=>{origin.value=n[0];steps=0;renderSimulation();};group.onclick=choose;group.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};
 });
 const ranking=sim.querySelector('.ranking');ranking.replaceChildren();
 const max=Math.max(...Object.values(state),1);
 Object.entries(state).sort((a,b)=>b[1]-a[1]).forEach(([name,value])=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${name}</span><div class="bar"><span style="width:${value/max*100}%"></span></div><span>${value.toFixed(2)}</span>`;ranking.append(row);});
 document.querySelector('#step-label').textContent=`Paso ${steps} / 8 · Origen: ${origin.value} · ${model.value==='fixed'?'Pesos estructurales':'Sin propagación'}`;
 document.querySelector('#back-step').disabled=steps===0;document.querySelector('#step').disabled=steps===8;
}
origin.onchange=()=>{steps=0;renderSimulation();};shock.oninput=renderSimulation;model.onchange=renderSimulation;
document.querySelector('#step').onclick=()=>{steps=Math.min(8,steps+1);renderSimulation();};
document.querySelector('#back-step').onclick=()=>{steps=Math.max(0,steps-1);renderSimulation();};
document.querySelector('#reset').onclick=()=>{steps=0;renderSimulation();};
renderSimulation();
