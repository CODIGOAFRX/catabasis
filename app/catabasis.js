import { initVisor } from './ficha.js';

const doc = document.documentElement;
doc.classList.replace('no-js', 'js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

initVisor();

const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    reveal.unobserve(entry.target);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
document.querySelectorAll('.lamina').forEach(el => reveal.observe(el));

// ---------------------------------------------------------------- sonda: sigue a la zona que ocupa el centro de la pantalla
const sonda = document.querySelector('.sonda');
const sondaCota = sonda.querySelector('.sonda-cota');
const sondaZona = sonda.querySelector('.sonda-zona');
const formato = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
const parseCota = s => Number(String(s).replace(/[^\d-]/g, '')) || 0;
const pintaCota = n => `${n > 0 ? '+' : ''}${formato.format(Math.round(n))} m`;
let cotaActual = parseCota(sondaCota.textContent);
let tween = 0;

function irACota(destino) {
  cancelAnimationFrame(tween);
  if (reduce.matches) { cotaActual = destino; sondaCota.textContent = pintaCota(destino); return; }
  const desde = cotaActual, t0 = performance.now(), dur = 1100;
  const paso = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
    cotaActual = desde + (destino - desde) * e;
    sondaCota.textContent = pintaCota(cotaActual);
    if (k < 1) tween = requestAnimationFrame(paso);
  };
  tween = requestAnimationFrame(paso);
}

const zonaObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const { zona, tono, cota, nombre } = entry.target.dataset;
    document.body.dataset.zona = zona;
    document.body.dataset.tono = tono;
    doc.style.setProperty('--cab-fondo', `var(--z-${zona})`);
    irACota(parseCota(cota));
    sondaZona.textContent = nombre;
  }
}, { rootMargin: '-48% 0px -48% 0px' });
document.querySelectorAll('section[data-zona]').forEach(el => zonaObserver.observe(el));

// ---------------------------------------------------------------- linterna del abismo
const linterna = document.querySelector('.linterna');
if (linterna && matchMedia('(pointer: fine)').matches) {
  let frame = 0, x = 0, y = 0;
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    if (frame || document.body.dataset.zona !== 'abismo') return;
    frame = requestAnimationFrame(() => {
      linterna.style.setProperty('--lx', `${x}px`);
      linterna.style.setProperty('--ly', `${y}px`);
      frame = 0;
    });
  }, { passive: true });
}

// ---------------------------------------------------------------- osario: mesa de quimeras
const mesa = document.querySelector('.mesa');
if (mesa) initOsario(mesa);

function initOsario(mesa) {
  const huesos = JSON.parse(mesa.dataset.osario);
  const N = huesos.length;
  const ruta = f => new URL(`media/osario/${f}`, import.meta.url).href;
  const femeninos = new Set(['zarigüeya', 'cobaya', 'marmota', 'mangosta', 'morsa']);
  const art = a => `${femeninos.has(a) ? 'la' : 'el'} ${a}`;
  const de = a => (femeninos.has(a) ? `de la ${a}` : `del ${a}`);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const estado = JSON.parse(mesa.dataset.inicial);
  const piezas = Object.fromEntries([...mesa.querySelectorAll('.mesa-pieza')].map(p => [p.dataset.parte, p]));
  // Cada parte se ve en su franja del lienzo común, de la cola a la cabeza, con los bordes fundidos.
  // La misma tabla recorta las piezas en pantalla y en la lámina que se guarda, en este orden.
  const franjas = { cola: [[0, 1], [.30, 1], [.37, 0]], tronco: [[.29, 0], [.36, 1], [.64, 1], [.71, 0]], cabeza: [[.63, 0], [.70, 1], [1, 1]] };
  for (const [parte, pieza] of Object.entries(piezas)) {
    const mascara = `linear-gradient(90deg, ${franjas[parte].map(([p, a]) => `rgb(0 0 0 / ${a}) ${Math.round(p * 100)}%`).join(', ')})`;
    pieza.style.setProperty('-webkit-mask-image', mascara);
    pieza.style.setProperty('mask-image', mascara);
  }
  const campo = n => mesa.querySelector(`[data-quimera="${n}"]`);
  const total = formato.format(N ** 3);
  const cambios = {};

  const plantillas = [
    (c, t, k) => `Tiene el gesto ${de(c.a)}, la paciencia ${de(t.a)} y la cola ${de(k.a)}. Nadie la ha visto moverse, pero sus huesos encajan.`,
    (c, t, k) => `Apareció en el fondo con la cabeza ${de(c.a)} mirando hacia arriba. Entre las costillas ${de(t.a)} aún quedaba arena.`,
    (c, t, k) => `Come lo que comería ${art(c.a)} y duerme como ${art(k.a)}. Camina con las patas ${de(t.a)}, despacio.`,
    (c, t, k) => `Los pescadores la confunden con ${art(t.a)} hasta que se gira. Entonces ven la cabeza ${de(c.a)}.`,
  ];

  function pinta() {
    const c = huesos[estado.cabeza], t = huesos[estado.tronco], k = huesos[estado.cola];
    const n = estado.cabeza * N * N + estado.tronco * N + estado.cola + 1;
    if (c === t && t === k) {
      campo('latin').textContent = `Esqueleto de ${c.a}`;
      campo('vulgar').textContent = 'Un animal que existe';
      campo('texto').textContent = `Las tres piezas son ${de(c.a)}. Cambia alguna para que deje de ser real.`;
    } else {
      campo('latin').textContent = `${cap(c.s)}o${t.s}us ${k.s}ura`;
      campo('vulgar').textContent = `Quimera con cabeza de ${c.a}, tronco de ${t.a} y cola de ${k.a}`;
      campo('texto').textContent = `${plantillas[n % plantillas.length](c, t, k)} Es la quimera n.º ${formato.format(n)} de ${total}.`;
    }
    for (const [parte, i] of Object.entries(estado)) {
      const img = piezas[parte].querySelector('img');
      const nuevo = ruta(huesos[i].f);
      if (img.getAttribute('src') === nuevo) continue;
      if (reduce.matches || !img.getAttribute('src')) { img.src = nuevo; continue; }
      // la pieza se apaga (.mesa-pieza, transición de opacity en catabasis.css) y se cambia casi a oscuras;
      // un clic nuevo antes de tiempo anula el cambio pendiente, así nunca gana una pieza antigua
      clearTimeout(cambios[parte]);
      piezas[parte].classList.add('is-cambiando');
      cambios[parte] = setTimeout(() => {
        img.src = ruta(huesos[estado[parte]].f);
        img.decode().catch(() => {}).finally(() => piezas[parte].classList.remove('is-cambiando'));
      }, 220);
    }
  }

  mesa.addEventListener('click', e => {
    const mover = e.target.closest('[data-mover]');
    if (mover) {
      const parte = mover.dataset.mover;
      estado[parte] = (estado[parte] + Number(mover.dataset.paso) + N) % N;
      pinta();
    } else if (e.target.closest('[data-quimera-nueva]')) {
      const azar = () => Math.floor(Math.random() * N);
      do { estado.cabeza = azar(); estado.tronco = azar(); estado.cola = azar(); }
      while (estado.cabeza === estado.tronco || estado.tronco === estado.cola);
      pinta();
    } else if (e.target.closest('[data-quimera-guardar]')) {
      guardar().catch(err => console.error('No se pudo guardar la quimera', err));
    }
  });

  async function guardar() {
    const imgs = await Promise.all(Object.keys(franjas).map(parte => cargar(ruta(huesos[estado[parte]].f))));
    const W = imgs[0].naturalWidth, LAM = imgs[0].naturalHeight, H = LAM + 120;
    const lienzo = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#f0eee6';
    ctx.fillRect(0, 0, W, H);
    for (const [k, parte] of Object.keys(franjas).entries()) {
      const img = imgs[k];
      const capa = Object.assign(document.createElement('canvas'), { width: W, height: LAM });
      const c2 = capa.getContext('2d');
      c2.fillStyle = '#fff';
      c2.fillRect(0, 0, W, LAM);
      c2.drawImage(img, 0, 0, W, LAM);
      c2.globalCompositeOperation = 'destination-in';
      const g = c2.createLinearGradient(0, 0, W, 0);
      for (const [p, a] of franjas[parte]) g.addColorStop(p, `rgba(0,0,0,${a})`);
      c2.fillStyle = g;
      c2.fillRect(0, 0, W, LAM);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(capa, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
    // mismas familias que las @font-face de catabasis.css; se cargan antes de dibujar con cada una
    const escribe = async (font, texto, y) => { ctx.font = font; await document.fonts.load(font); ctx.fillText(texto, W / 2, y); };
    ctx.fillStyle = '#1c1f1c';
    ctx.textAlign = 'center';
    await escribe('italic 46px "IM Fell English", Georgia, serif', campo('latin').textContent, LAM + 50);
    await escribe('22px "EB Garamond", Georgia, serif', 'Catábasis, osario de quimeras. Esqueletos de E. J. d\'Alton, 1821-1838.', LAM + 92);
    const enlace = Object.assign(document.createElement('a'), {
      href: lienzo.toDataURL('image/png'),
      download: `quimera-${campo('latin').textContent.toLowerCase().replace(/[^a-z]+/g, '-')}.png`,
    });
    enlace.click();
  }

  const cargar = src => new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = mal;
    img.src = src;
  });

  pinta();
}
