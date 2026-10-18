import { initVisor } from './ficha.js';

document.documentElement.classList.replace('no-js', 'js');
initVisor();

const hojas = [...document.querySelectorAll('.hoja')];
const botones = [...document.querySelectorAll('[data-filtro]')];
const buscar = document.querySelector('.filtros-buscar input');
const vacio = document.querySelector('.hojas-vacio');
const normal = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
let zona = new URLSearchParams(location.search).get('zona') || 'todas';

function aplica() {
  const q = normal(buscar.value);
  let visibles = 0;
  for (const hoja of hojas) {
    const ok = (zona === 'todas' || hoja.dataset.zona === zona) && (!q || normal(hoja.dataset.buscar).includes(q));
    hoja.hidden = !ok;
    visibles += ok;
  }
  vacio.hidden = visibles > 0;
  for (const b of botones) b.setAttribute('aria-pressed', String(b.dataset.filtro === zona));
}

for (const b of botones) {
  b.addEventListener('click', () => {
    zona = b.dataset.filtro;
    const url = new URL(location.href);
    if (zona === 'todas') url.searchParams.delete('zona'); else url.searchParams.set('zona', zona);
    history.replaceState(null, '', url);
    aplica();
  });
}
buscar.addEventListener('input', aplica);
if (!botones.some(b => b.dataset.filtro === zona)) zona = 'todas';
aplica();
