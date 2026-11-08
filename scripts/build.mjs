// Genera dist/proyecto/catabasis (servido en pedrogomez.dev/proyecto/catabasis) a partir de app/:
// copia los recursos, escribe index.html y herbolario.html desde app/data/laminas.json,
// versiona CSS y JS con un hash de su contenido y añade las cabeceras del Worker.
// Uso: node scripts/build.mjs
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(repo, 'app');
const base = '/proyecto/catabasis';
const out = resolve(repo, 'dist', base.slice(1));
const { zonas, laminas, osario } = JSON.parse(await readFile(resolve(app, 'data', 'laminas.json'), 'utf8'));

// Estilos y módulos se publican con ?v=<hash de lo publicado>. Los imports entre módulos llevan también
// la versión, así que si cambia ficha.js cambia la URL de quien lo importa y nunca se mezclan versiones.
// Cada archivo va después de los que importa.
const publicado = {};
for (const f of ['tema.js', 'catabasis.css', 'ficha.js', 'catabasis.js', 'herbolario.js']) {
  const contenido = (await readFile(resolve(app, f), 'utf8')).replace(/from '\.\/([\w-]+\.js)'/g, (_, dep) => {
    if (!publicado[dep]) throw Error(`${f} importa ${dep}, que tiene que ir antes en la lista de build.mjs`);
    return `from './${dep}?v=${publicado[dep].v}'`;
  });
  publicado[f] = { contenido, v: createHash('sha256').update(contenido).digest('hex').slice(0, 10) };
}
const url = f => `${base}/${f}?v=${publicado[f].v}`;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const darkZones = new Set(['mar', 'abismo', 'osario']);
const tono = id => (darkZones.has(id) ? 'oscuro' : 'claro');
const portadaZona = { id: 'portada', nombre: 'Portada', cota: '+2.400 m' };
const osarioZona = {
  id: 'osario', nombre: 'El osario', cota: '-6.000 m',
  intro: 'En el fondo se acumulan los huesos de todo lo que cayó. Con ellos se arman las criaturas que nadie dibujó: cabeza, tronco y cola de animales distintos.',
};
const todasLasZonas = [...zonas, osarioZona];

// Mesa del osario. Los esqueletos se encajaron en un lienzo común de 1400 × 1000 (pipeline/osario.py).
// Las partes van de la cola a la cabeza: es el orden en que se apilan y se dibujan en la lámina guardada.
const LIENZO_OSARIO = [1400, 1000];
const PARTES = [['cola', 'Cola'], ['tronco', 'Tronco'], ['cabeza', 'Cabeza']];
const QUIMERA_INICIAL = { cabeza: 'leon', tronco: 'camel', cola: 'myrmec' };
const inicial = Object.fromEntries(Object.entries(QUIMERA_INICIAL).map(([parte, stem]) => {
  const i = osario.findIndex(o => o.stem === stem);
  if (i < 0) throw Error(`La quimera inicial usa «${stem}», que no está en el osario de laminas.json`);
  return [parte, i];
}));
const zoneName = Object.fromEntries(todasLasZonas.map(z => [z.id, z.nombre]));
const fit = (w, h, max) => { const s = Math.min(1, max / Math.max(w, h)); return [Math.round(w * s), Math.round(h * s)]; };
const src = (l, size) => `${base}/media/laminas/${l.id}-${size}.webp`;
const credit = l => [l.autor && esc(l.autor), l.obra && `<i>${esc(l.obra)}</i>`, l.anio && esc(l.anio)].filter(Boolean).join(', ');
const altOf = l => `${l.titulo}${l.autor ? `, ${l.autor}` : ''}${l.anio ? `, ${l.anio}` : ''}`;
// versión sin papel para el modo oscuro: desactivada por defecto, tema.js la activa al elegir oscuro
const alfaSource = l => l.modo === 'color' ? `<source media="not all" data-alfa srcset="${src(l, 'alfa')}">` : '';

// lo que ficha.js lee para abrir la ficha completa
const fichaData = l => [
  ['id', l.id], ['alt', altOf(l)], ['titulo', l.titulo], ['vulgar', l.vulgar], ['latin', l.latin], ['texto', l.texto],
  ['verdad', l.verdad], ['autor', l.autor], ['obra', l.obra], ['anio', l.anio], ['fuente', l.fuente],
  ['url', l.url], ['w', l.w], ['h', l.h], ['modo', l.modo], ['ampliada', l.ampliada ? '1' : ''],
].filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');

// en las zonas oscuras las láminas de color van directamente sin papel
function picture(l, sizes) {
  const [mw, mh] = fit(l.w, l.h, 1200);
  const lazy = 'loading="lazy" decoding="async"';
  if (darkZones.has(l.zona) && l.modo === 'color') {
    return `<img class="lamina-img" src="${src(l, 'alfa')}" width="${mw}" height="${mh}" alt="${esc(altOf(l))}" ${lazy} sizes="${sizes}">`;
  }
  const set = `${src(l, 'sm')} 480w, ${src(l, 'md')} ${mw}w`;
  return `<picture>${alfaSource(l)}<img class="lamina-img" src="${src(l, 'md')}" srcset="${set}" sizes="${sizes}" width="${mw}" height="${mh}" alt="${esc(altOf(l))}" ${lazy}></picture>`;
}

function figure(l, cls, sizes) {
  return `
        <figure class="${['lamina', cls].filter(Boolean).join(' ')}" data-modo="${l.modo}">
          <button class="lamina-boton" type="button" ${fichaData(l)} aria-label="Abrir la ficha: ${esc(l.vulgar || l.titulo)}">
            ${picture(l, sizes)}
          </button>
          <figcaption class="ficha">
            <span class="ficha-latin" lang="la">${esc(l.latin)}</span>
            <h3>${esc(l.vulgar)}</h3>
            <p>${esc(l.texto)}</p>
            <p class="ficha-verdad"><span>Lo que de verdad es.</span> ${esc(l.verdad)}</p>
            <p class="ficha-fuente">${credit(l)}</p>
          </figcaption>
        </figure>`;
}

const head = ({ title, description, path, preload = [] }) => `<!DOCTYPE html>
<html lang="es" class="no-js">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="theme-color" content="#ecebe4">
    <meta name="color-scheme" content="light">
    <script src="${url('tema.js')}"></script>
    <link rel="icon" type="image/svg+xml" href="${base}/favicon.svg">
    <link rel="canonical" href="https://www.pedrogomez.dev${path}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_ES">
    <meta property="og:site_name" content="Pedro Gómez">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="https://www.pedrogomez.dev${path}">
    <meta property="og:image" content="https://www.pedrogomez.dev${base}/media/og.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preload" href="${base}/fonts/fell.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="${base}/fonts/garamond.woff2" as="font" type="font/woff2" crossorigin>
${preload.map(p => `    <link rel="preload" href="${p}" as="image">`).join('\n')}
    <link rel="stylesheet" href="${url('catabasis.css')}">
</head>
`;

const topbar = current => `
    <header class="cabecera">
        <a class="cabecera-volver" href="/#catabasis" aria-label="Volver al portfolio de Pedro Gómez">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            <span>Pedro Gómez</span>
        </a>
        <a class="cabecera-marca" href="${base}/">Catábasis</a>
        <nav class="cabecera-nav" aria-label="Secciones">
            <a href="${base}/#aire"${current === 'descenso' ? ' aria-current="page"' : ''}>Descenso</a>
            <a href="${base}/#osario">Osario</a>
            <a href="${base}/herbolario"${current === 'herbolario' ? ' aria-current="page"' : ''}>Herbolario</a>
            <button class="cabecera-tema" type="button" data-cambiar-tema aria-pressed="false" aria-label="Modo oscuro" title="Modo oscuro">
                <svg class="tema-luna" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
                <svg class="tema-sol" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
            </button>
        </nav>
    </header>`;

const dialog = `
    <dialog class="visor" aria-labelledby="visor-titulo">
        <div class="visor-cuerpo">
            <div class="visor-lamina"><img alt="" width="1200" height="1200"></div>
            <div class="visor-ficha">
                <button class="visor-cerrar" type="button" aria-label="Cerrar la ficha">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
                <span class="ficha-latin" lang="la"></span>
                <h2 id="visor-titulo"></h2>
                <p class="visor-texto"></p>
                <p class="ficha-verdad"><span>Lo que de verdad es.</span> <em></em></p>
                <dl class="visor-datos">
                    <div><dt>Lámina</dt><dd data-campo="titulo"></dd></div>
                    <div><dt>Autor</dt><dd data-campo="autor"></dd></div>
                    <div><dt>Obra</dt><dd data-campo="obra"></dd></div>
                    <div><dt>Año</dt><dd data-campo="anio"></dd></div>
                    <div><dt>Procedencia</dt><dd data-campo="fuente"></dd></div>
                </dl>
                <p class="visor-nota"></p>
                <div class="visor-acciones">
                    <a class="boton boton-tinta" data-accion="descargar" download>Descargar lámina</a>
                    <a class="boton boton-linea" data-accion="original" target="_blank" rel="noopener noreferrer">Ver en la fuente</a>
                </div>
            </div>
        </div>
    </dialog>`;

const footer = `
    <footer class="colofon">
        <div class="colofon-texto">
            <p class="colofon-titulo">Catábasis</p>
            <p>Las láminas vienen del <a href="https://pdimagearchive.org/" target="_blank" rel="noopener noreferrer">Public Domain Image Archive</a> y de la <a href="https://www.flickr.com/photos/biodivlibrary/" target="_blank" rel="noopener noreferrer">Biodiversity Heritage Library</a>. Todas son de dominio público. Los nombres en latín y las descripciones son inventados; lo que aparece como «lo que de verdad es», no.</p>
            <p>Papel limpiado y recortado a mano por código. Las láminas que no llegaban a 2.000 píxeles se ampliaron con Real-ESRGAN.</p>
        </div>
        <nav class="colofon-enlaces" aria-label="Más">
            <a href="${base}/herbolario">Herbolario</a>
            <a href="/#catabasis">Volver al portfolio</a>
        </nav>
    </footer>`;

const byZone = id => laminas.filter(l => l.zona === id && l.destacada).sort((a, b) => a.orden - b.orden);
const hero = ['pdia-14e6b862', 'pdia-c06c3e6c', 'bhl-48430506496'].map(id => laminas.find(l => l.id === id));

const zoneLayouts = {
  aire: (ls) => ls.map((l, i) => figure(l, `vuelo vuelo-${i + 1}`, '(min-width: 1024px) 30vw, 88vw')).join(''),
  fronda: (ls) => ls.map(l => figure(l, 'pliego', '(min-width: 1024px) 30vw, 92vw')).join(''),
  hojarasca: (ls) => `
        <div class="cajon" style="--n: ${ls.length}">
          <div class="cajon-pista">${ls.map(l => figure(l, 'especimen', '(min-width: 1024px) 34vw, 80vw')).join('')}
          </div>
        </div>`,
  subsuelo: (ls) => ls.map((l, i) => `
        <div class="estrato estrato-${i + 1}">
          <span class="estrato-cota" aria-hidden="true">${-120 - i * 35} m</span>${figure(l, '', '(min-width: 1024px) 34vw, 88vw')}
        </div>`).join(''),
  mar: (ls) => ls.map((l, i) => figure(l, `nado nado-${i + 1}`, '(min-width: 1024px) 40vw, 92vw')).join(''),
  abismo: (ls) => ls.map((l, i) => figure(l, `fondo fondo-${i + 1}`, '(min-width: 1024px) 32vw, 88vw')).join(''),
};

// lo que catabasis.js lee para mover la sonda y el color de la cabecera al entrar en cada zona
const zonaData = z => `data-zona="${z.id}" data-nombre="${esc(z.nombre)}" data-cota="${esc(z.cota)}" data-tono="${tono(z.id)}"`;
const zonaCabecera = z => `
      <header class="zona-cabecera">
        <p class="zona-cota" aria-hidden="true">${esc(z.cota)}</p>
        <h2 id="titulo-${z.id}">${esc(z.nombre)}</h2>
        <p class="zona-intro">${esc(z.intro)}</p>
      </header>`;

const zoneSections = zonas.map(z => `
    <section class="zona zona-${z.id}" id="${z.id}" ${zonaData(z)} aria-labelledby="titulo-${z.id}">${zonaCabecera(z)}
      <div class="zona-laminas-${z.id}">${zoneLayouts[z.id](byZone(z.id))}
      </div>${z.id === 'abismo' ? '\n      <div class="linterna" aria-hidden="true"></div>' : ''}
    </section>`).join('\n');

const osarioJson = JSON.stringify(osario.map(o => ({ f: o.file, a: o.animal, s: o.stem })));

const index = `${head({
  title: 'Catábasis · Bestiario imposible',
  description: 'Un descenso del cielo al abismo por láminas antiguas de dominio público: aves con cara de vecino, flores de Marte, pulpos colosales y un osario donde montar quimeras.',
  path: `${base}/`,
  preload: [src(hero[0], 'md')],
})}
<body data-zona="portada" data-tono="${tono('portada')}">
    <a class="saltar" href="#aire">Saltar al descenso</a>
${topbar('descenso')}

    <aside class="sonda" aria-live="polite" aria-atomic="true">
        <span class="sonda-cota">${portadaZona.cota}</span>
        <span class="sonda-zona">${portadaZona.nombre}</span>
        <span class="sonda-hilo" aria-hidden="true"><span></span></span>
    </aside>

    <main>
    <section class="portada" ${zonaData(portadaZona)} aria-labelledby="titulo-portada">
      <div class="portada-texto">
        <h1 id="titulo-portada">Catábasis</h1>
        <p class="portada-sub">Un bestiario imposible, del cielo al abismo, hecho con láminas antiguas de dominio público.</p>
        <a class="boton boton-tinta" href="#aire">Empezar el descenso</a>
      </div>
      <div class="portada-columna" aria-hidden="true">
        ${hero.map((l, i) => {
          const [w, h] = fit(l.w, l.h, 1200);
          return `<picture class="portada-pieza portada-pieza-${i + 1}" data-modo="${l.modo}">${alfaSource(l)}<img src="${src(l, 'md')}" width="${w}" height="${h}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></picture>`;
        }).join('\n        ')}
      </div>
    </section>
${zoneSections}

    <section class="osario" id="osario" ${zonaData(osarioZona)} aria-labelledby="titulo-osario">${zonaCabecera(osarioZona)}
      <div class="mesa" data-osario='${osarioJson.replace(/'/g, '&#39;')}' data-inicial='${JSON.stringify(inicial)}'>
        <div class="mesa-lamina" style="aspect-ratio: ${LIENZO_OSARIO.join(' / ')}">
${PARTES.map(([p]) => `          <div class="mesa-pieza" data-parte="${p}"><img alt="" width="${LIENZO_OSARIO[0]}" height="${LIENZO_OSARIO[1]}"></div>`).join('\n')}
        </div>
        <div class="mesa-ficha" aria-live="polite">
          <span class="ficha-latin" lang="la" data-quimera="latin"></span>
          <h3 data-quimera="vulgar"></h3>
          <p data-quimera="texto"></p>
        </div>
        <div class="mesa-mandos">
${PARTES.map(([p, P]) => `          <div class="mesa-parte"><span>${P}</span><button type="button" data-mover="${p}" data-paso="-1" aria-label="${P} anterior">‹</button><button type="button" data-mover="${p}" data-paso="1" aria-label="${P} siguiente">›</button></div>`).join('\n')}
          <button class="boton boton-hueso" type="button" data-quimera-nueva>Otra quimera</button>
          <button class="boton boton-linea" type="button" data-quimera-guardar>Guardar lámina</button>
        </div>
        <p class="mesa-nota">Esqueletos de <i>Die vergleichende Osteologie</i>, Eduard Joseph d'Alton, 1821-1838. ${osario.length} esqueletos dan ${new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(osario.length ** 3)} combinaciones.</p>
      </div>
    </section>
    </main>
${footer}
${dialog}
    <script type="module" src="${url('catabasis.js')}"></script>
</body>

</html>
`;

const cards = laminas.map(l => {
  const [w, h] = fit(l.w, l.h, 480);
  const texto = [l.vulgar, l.titulo, l.latin, l.autor, l.obra, zoneName[l.zona]].filter(Boolean).join(' ').toLowerCase();
  return `
        <li class="hoja" data-zona="${l.zona}" data-modo="${l.modo}" data-buscar="${esc(texto)}">
          <button class="hoja-boton" type="button" ${fichaData(l)} aria-label="Abrir la ficha: ${esc(l.vulgar || l.titulo)}">
            <picture>${alfaSource(l)}<img src="${src(l, 'sm')}" width="${w}" height="${h}" alt="${esc(altOf(l))}" loading="lazy" decoding="async"></picture>
          </button>
          <p class="hoja-titulo">${esc(l.vulgar || l.titulo)}</p>
          <p class="hoja-fuente">${[l.autor, l.anio].filter(Boolean).map(esc).join(', ')}</p>
        </li>`;
}).join('');

const herbolario = `${head({
  title: 'Herbolario · Catábasis',
  description: `Las ${laminas.length} láminas de Catábasis, limpias y ampliadas, para descargar. Todas son de dominio público.`,
  path: `${base}/herbolario`,
})}
<body class="pagina-herbolario">
    <a class="saltar" href="#hojas">Saltar a las láminas</a>
${topbar('herbolario')}

    <main>
    <section class="herbolario-cabecera" aria-labelledby="titulo-herbolario">
      <h1 id="titulo-herbolario">Herbolario</h1>
      <p>Las ${laminas.length} láminas del descenso, con el papel limpio y listas para descargar. Todas son de dominio público.</p>
      <div class="filtros">
        <div class="filtros-zonas" role="group" aria-label="Filtrar por zona">
          <button type="button" data-filtro="todas" aria-pressed="true">Todas <span>${laminas.length}</span></button>
          ${todasLasZonas.map(z => `<button type="button" data-filtro="${z.id}" aria-pressed="false">${esc(z.nombre)} <span>${laminas.filter(l => l.zona === z.id).length}</span></button>`).join('\n          ')}
        </div>
        <label class="filtros-buscar">
          <span>Buscar</span>
          <input type="search" placeholder="pulpo, Haeckel, Marte..." autocomplete="off">
        </label>
      </div>
    </section>

    <ul class="hojas" id="hojas">${cards}
    </ul>
    <p class="hojas-vacio" hidden>Ninguna lámina coincide. Prueba con otra palabra o quita el filtro.</p>
    </main>
${footer}
${dialog}
    <script type="module" src="${url('herbolario.js')}"></script>
</body>

</html>
`;

for (const [name, html] of [['index', index], ['herbolario', herbolario]]) {
  if (/[–—]/.test(html)) throw Error(`${name}.html contains an en or em dash`);
}

await rm(resolve(repo, 'dist'), { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ['favicon.svg', 'fonts', 'media']) await cp(resolve(app, f), resolve(out, f), { recursive: true });
for (const [f, { contenido }] of Object.entries(publicado)) await writeFile(resolve(out, f), contenido);
await writeFile(resolve(out, 'index.html'), index);
await writeFile(resolve(out, 'herbolario.html'), herbolario);

await writeFile(resolve(repo, 'dist', '_headers'), `${base}/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'
  Permissions-Policy: camera=(), microphone=(), geolocation=()
${base}/media/*
  Cache-Control: public, max-age=31536000, immutable
${base}/fonts/*
  Cache-Control: public, max-age=31536000, immutable
${base}/
  Cache-Control: no-cache
${base}/herbolario
  Cache-Control: no-cache
`);
// en workers.dev la raíz lleva directamente al bestiario
await writeFile(resolve(repo, 'dist', '_redirects'), `/ ${base}/ 302
`);
console.log(`dist${base}: ${laminas.length} láminas, ${laminas.filter(l => l.destacada).length} en el descenso, ${osario.length} esqueletos`);
