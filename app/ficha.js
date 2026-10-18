// Shared plate viewer: any button carrying data-id opens the full ficha in the <dialog>.
const BASE = '/proyecto/catabasis/media/laminas/';

export function initVisor(root = document) {
  const visor = document.querySelector('.visor');
  if (!visor) return;
  const img = visor.querySelector('.visor-lamina img');
  const latin = visor.querySelector('.ficha-latin');
  const titulo = visor.querySelector('#visor-titulo');
  const texto = visor.querySelector('.visor-texto');
  const verdad = visor.querySelector('.ficha-verdad');
  const nota = visor.querySelector('.visor-nota');
  const descargar = visor.querySelector('[data-accion="descargar"]');
  const original = visor.querySelector('[data-accion="original"]');
  let origen = null;

  const open = d => {
    origen = document.activeElement;
    img.removeAttribute('src');
    img.alt = d.titulo + (d.autor ? `, ${d.autor}` : '');
    img.width = Number(d.w) || 1200;
    img.height = Number(d.h) || 1200;
    img.src = `${BASE}${d.id}-lg.webp`;
    visor.dataset.modo = d.modo || '';
    latin.textContent = d.latin || '';
    latin.hidden = !d.latin;
    titulo.textContent = d.vulgar || d.titulo;
    texto.textContent = d.texto || '';
    texto.hidden = !d.texto;
    verdad.querySelector('em').textContent = d.verdad || '';
    verdad.hidden = !d.verdad;
    for (const dd of visor.querySelectorAll('[data-campo]')) dd.textContent = d[dd.dataset.campo] || '';
    nota.textContent = d.ampliada ? 'Ampliada con Real-ESRGAN a partir de un escaneo de menos de 2.000 píxeles.' : '';
    descargar.href = img.src;
    descargar.setAttribute('download', `catabasis-${d.id}.webp`);
    original.href = d.url;
    visor.showModal();
    visor.querySelector('.visor-cerrar').focus();
  };

  root.addEventListener('click', e => {
    const boton = e.target.closest('button[data-id]');
    if (boton) open(boton.dataset);
  });
  visor.querySelector('.visor-cerrar').addEventListener('click', () => visor.close());
  // a click on the backdrop lands on the dialog element itself
  visor.addEventListener('click', e => { if (e.target === visor) visor.close(); });
  visor.addEventListener('close', () => { origen?.focus?.(); });
}
