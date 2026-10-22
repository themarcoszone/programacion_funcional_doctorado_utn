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
  document.querySelector('#position').textContent = `${String(current + 1).padStart(2, '0')} / ${slides.length} · CÓDIGO POR BLOQUES`;
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
  if (dialog.open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || (e.target.tagName === 'BUTTON' && [' ', 'Enter'].includes(e.key)) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {e.preventDefault();show(current + 1);}
  if (['ArrowLeft', 'PageUp'].includes(e.key)) {e.preventDefault();show(current - 1);}
  if (e.key === 'Home') show(0);
  if (e.key === 'End') show(slides.length - 1);
  if (e.key.toLowerCase() === 'i') overview();
  if (e.key.toLowerCase() === 'f') fullscreen();
});
window.addEventListener('hashchange', readHash);
readHash();

const runHistory = [{"ASML": 0.0, "Broadcom": 0.0, "CoreWeave": 0.0, "Micron": 0.0, "Microsoft": 0.0, "NVIDIA": 0.0, "Oracle": 0.0, "SK_Hynix": 100.0, "Samsung": 0.0, "TSMC": 0.0}, {"ASML": 0.0, "Broadcom": 0.0, "CoreWeave": 0.0, "Micron": 0.0, "Microsoft": 0.0, "NVIDIA": 8.041458184417442, "Oracle": 0.0, "SK_Hynix": 100.0, "Samsung": 0.0, "TSMC": 0.0}, {"ASML": 0.0, "Broadcom": 0.0, "CoreWeave": 1.0324831071793188, "Micron": 0.0, "Microsoft": 1.0448880177257591, "NVIDIA": 16.082916368834884, "Oracle": 0.3761596863812733, "SK_Hynix": 100.0, "Samsung": 0.0, "TSMC": 0.0}, {"ASML": 0.0, "Broadcom": 0.0, "CoreWeave": 3.0974493215379564, "Micron": 0.0, "Microsoft": 3.311661157265161, "NVIDIA": 24.124374553252323, "Oracle": 1.1284790591438199, "SK_Hynix": 100.0, "Samsung": 0.0, "TSMC": 0.0}, {"ASML": 0.0, "Broadcom": 0.0, "CoreWeave": 6.194898643075913, "Micron": 0.0, "Microsoft": 6.977316522706088, "NVIDIA": 32.16583273766977, "Oracle": 2.2569581182876397, "SK_Hynix": 100.0, "Samsung": 0.0, "TSMC": 0.0}, {"ASML": 0.0, "Broadcom": 0.0, "CoreWeave": 10.324831071793188, "Micron": 0.0, "Microsoft": 12.218851218136425, "NVIDIA": 40.20729092208721, "Oracle": 3.761596863812733, "SK_Hynix": 100.0, "Samsung": 0.0, "TSMC": 0.0}];

let step = 0;
const names = ['SK_Hynix','NVIDIA','CoreWeave','Microsoft','Oracle'];
const explanations = [
 'Estado inicial: solo SK_Hynix tiene impacto. Todavía no se aplicó pasoPropagacion.',
 'Primer paso: NVIDIA recibe 8,041458… desde SK_Hynix. Sus clientes siguen en cero porque los aportes usan el estado anterior.',
 'Segundo paso: NVIDIA suma otro aporte. CoreWeave, Microsoft y Oracle reciben por primera vez desde NVIDIA.',
 'Tercer paso: Microsoft recibe desde NVIDIA y también desde CoreWeave. Cada nodo conserva lo que ya había acumulado.',
 'Cuarto paso: se repite la misma función sobre el nuevo estado; no se modifican ni el grafo ni los pesos.',
 'Quinto paso: este es el estado que imprime main en el bloque «Modelo pesos fijos».'
];
function renderStep() {
 const currentState = runHistory[step];
 const previous = runHistory[Math.max(0,step-1)];
 const format = value => value.toLocaleString('es-AR',{minimumFractionDigits:4,maximumFractionDigits:4});
 document.querySelector('#step-values').innerHTML = names.map(name => `<tr><td>${name}</td><td>${step ? format(previous[name]) : '—'}</td><td>${step ? '+'+format(currentState[name]-previous[name]) : '—'}</td><td>${format(currentState[name])}</td></tr>`).join('');
 document.querySelector('#step-label').textContent = `Paso ${step} / 5`;
 document.querySelector('#step-explanation').textContent = explanations[step];
 document.querySelector('#step-back').disabled = step === 0;
 document.querySelector('#step-next').disabled = step === 5;
}
document.querySelector('#step-back').onclick = () => {step=Math.max(0,step-1);renderStep();};
document.querySelector('#step-next').onclick = () => {step=Math.min(5,step+1);renderStep();};
document.querySelector('#step-reset').onclick = () => {step=0;renderStep();};
renderStep();
