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
const hash = async f => createHash('sha256').update(await readFile(resolve(app, f))).digest('hex').slice(0, 10);
const v = Object.fromEntries(await Promise.all(['catabasis.css', 'catabasis.js', 'herbolario.js', 'ficha.js'].map(async f => [f, await hash(f)])));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const darkZones = new Set(['mar', 'abismo', 'osario']);
const zoneName = Object.fromEntries([...zonas.map(z => [z.id, z.nombre]), ['osario', 'El osario']]);
const fit = (w, h, max) => { const s = Math.min(1, max / Math.max(w, h)); return [Math.round(w * s), Math.round(h * s)]; };
const src = (l, size) => `${base}/media/laminas/${l.id}-${size}.webp`;
const credit = l => [l.autor && esc(l.autor), l.obra && `<i>${esc(l.obra)}</i>`, l.anio && esc(l.anio)].filter(Boolean).join(', ');
const altOf = l => `${l.titulo}${l.autor ? `, ${l.autor}` : ''}${l.anio ? `, ${l.anio}` : ''}`;

// Data attributes the shared dialog reads to build a ficha
const fichaData = l => [
  ['id', l.id], ['titulo', l.titulo], ['vulgar', l.vulgar], ['latin', l.latin], ['texto', l.texto],
  ['verdad', l.verdad], ['autor', l.autor], ['obra', l.obra], ['anio', l.anio], ['fuente', l.fuente],
  ['url', l.url], ['w', l.w], ['h', l.h], ['modo', l.modo], ['ampliada', l.ampliada ? '1' : ''],
].filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');

function picture(l, { size = 'md', sizes = '(min-width: 1024px) 40vw, 92vw', eager = false, dark = false } = {}) {
  const [mw, mh] = fit(l.w, l.h, 1200);
  const lazy = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  const alfa = l.modo === 'color' ? `${base}/media/laminas/${l.id}-alfa.webp` : null;
  const set = `${src(l, 'sm')} 480w, ${src(l, 'md')} ${mw}w`;
  if (dark && alfa) {
    return `<img class="lamina-img" src="${alfa}" width="${mw}" height="${mh}" alt="${esc(altOf(l))}" ${lazy} sizes="${sizes}">`;
  }
  const darkSource = alfa ? `<source media="(prefers-color-scheme: dark)" srcset="${alfa}">` : '';
  return `<picture>${darkSource}<img class="lamina-img" src="${src(l, size)}" srcset="${set}" sizes="${sizes}" width="${mw}" height="${mh}" alt="${esc(altOf(l))}" ${lazy}></picture>`;
}

function figure(l, cls = '', opts = {}) {
  const dark = darkZones.has(l.zona);
  return `
        <figure class="lamina ${cls}" data-modo="${l.modo}">
          <button class="lamina-boton" type="button" ${fichaData(l)} aria-label="Abrir la ficha: ${esc(l.vulgar || l.titulo)}">
            ${picture(l, { ...opts, dark })}
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
    <meta name="theme-color" content="#ecebe4" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#151512" media="(prefers-color-scheme: dark)">
    <meta name="color-scheme" content="light dark">
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
    <link rel="stylesheet" href="${base}/catabasis.css?v=${v['catabasis.css']}">
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

// ---------- index.html
const byZone = id => laminas.filter(l => l.zona === id && l.destacada).sort((a, b) => a.orden - b.orden);
const hero = ['pdia-14e6b862', 'pdia-c06c3e6c', 'bhl-48430506496'].map(id => laminas.find(l => l.id === id));

const zoneLayouts = {
  aire: (ls) => ls.map((l, i) => figure(l, `vuelo vuelo-${i + 1}`, { sizes: '(min-width: 1024px) 30vw, 88vw' })).join(''),
  fronda: (ls) => ls.map((l, i) => figure(l, `pliego pliego-${i + 1}`, { sizes: '(min-width: 1024px) 30vw, 92vw' })).join(''),
  hojarasca: (ls) => `
        <div class="cajon" data-cajon style="--n: ${ls.length}">
          <div class="cajon-pista">${ls.map((l, i) => figure(l, `especimen especimen-${i + 1}`, { sizes: '(min-width: 1024px) 34vw, 80vw' })).join('')}
          </div>
        </div>`,
  subsuelo: (ls) => ls.map((l, i) => `
        <div class="estrato estrato-${i + 1}">
          <span class="estrato-cota" aria-hidden="true">${-120 - i * 35} m</span>${figure(l, 'enterrada', { sizes: '(min-width: 1024px) 34vw, 88vw' })}
        </div>`).join(''),
  mar: (ls) => ls.map((l, i) => figure(l, `nado nado-${i + 1}`, { sizes: '(min-width: 1024px) 40vw, 92vw' })).join(''),
  abismo: (ls) => ls.map((l, i) => figure(l, `fondo fondo-${i + 1}`, { sizes: '(min-width: 1024px) 32vw, 88vw' })).join(''),
};

const zoneSections = zonas.map(z => `
    <section class="zona zona-${z.id}" id="${z.id}" data-zona="${z.id}" data-cota="${esc(z.cota)}" aria-labelledby="titulo-${z.id}">
      <header class="zona-cabecera">
        <p class="zona-cota" aria-hidden="true">${esc(z.cota)}</p>
        <h2 id="titulo-${z.id}">${esc(z.nombre)}</h2>
        <p class="zona-intro">${esc(z.intro)}</p>
      </header>
      <div class="zona-laminas zona-laminas-${z.id}">${zoneLayouts[z.id](byZone(z.id))}
      </div>${z.id === 'abismo' ? '\n      <div class="linterna" aria-hidden="true"></div>' : ''}
    </section>`).join('\n');

const osarioJson = JSON.stringify(osario.map(o => ({ f: o.file, a: o.animal, s: o.stem })));

const index = `${head({
  title: 'Catábasis · Bestiario imposible',
  description: 'Un descenso del cielo al abismo por láminas antiguas de dominio público: aves con cara de vecino, flores de Marte, pulpos colosales y un osario donde montar quimeras.',
  path: `${base}/`,
  preload: [src(hero[0], 'md')],
})}
<body data-zona="portada" data-tono="claro">
    <a class="saltar" href="#aire">Saltar al descenso</a>
${topbar('descenso')}

    <aside class="sonda" aria-live="polite" aria-atomic="true">
        <span class="sonda-cota">+2.400 m</span>
        <span class="sonda-zona">Portada</span>
        <span class="sonda-hilo" aria-hidden="true"><span></span></span>
    </aside>

    <main>
    <section class="portada" aria-labelledby="titulo-portada">
      <div class="portada-texto">
        <h1 id="titulo-portada">Catábasis</h1>
        <p class="portada-sub">Un bestiario imposible, del cielo al abismo, hecho con láminas antiguas de dominio público.</p>
        <a class="boton boton-tinta" href="#aire">Empezar el descenso</a>
      </div>
      <div class="portada-columna" aria-hidden="true">
        ${hero.map((l, i) => {
          const [w, h] = fit(l.w, l.h, 1200);
          const alfa = l.modo === 'color' ? `<source media="(prefers-color-scheme: dark)" srcset="${base}/media/laminas/${l.id}-alfa.webp">` : '';
          return `<picture class="portada-pieza portada-pieza-${i + 1}" data-modo="${l.modo}">${alfa}<img src="${src(l, 'md')}" width="${w}" height="${h}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></picture>`;
        }).join('\n        ')}
      </div>
    </section>
${zoneSections}

    <section class="osario" id="osario" data-zona="osario" data-cota="-6.000 m" aria-labelledby="titulo-osario">
      <header class="zona-cabecera">
        <p class="zona-cota" aria-hidden="true">-6.000 m</p>
        <h2 id="titulo-osario">El osario</h2>
        <p class="zona-intro">En el fondo se acumulan los huesos de todo lo que cayó. Con ellos se arman las criaturas que nadie dibujó: cabeza, tronco y cola de animales distintos.</p>
      </header>
      <div class="mesa" data-osario='${osarioJson.replace(/'/g, '&#39;')}'>
        <div class="mesa-lamina">
          <div class="mesa-pieza" data-parte="cola"><img alt="" width="1400" height="1000"></div>
          <div class="mesa-pieza" data-parte="tronco"><img alt="" width="1400" height="1000"></div>
          <div class="mesa-pieza" data-parte="cabeza"><img alt="" width="1400" height="1000"></div>
        </div>
        <div class="mesa-ficha" aria-live="polite">
          <span class="ficha-latin" lang="la" data-quimera="latin"></span>
          <h3 data-quimera="vulgar"></h3>
          <p data-quimera="texto"></p>
        </div>
        <div class="mesa-mandos">
          <div class="mesa-parte"><span>Cola</span><button type="button" data-mover="cola" data-paso="-1" aria-label="Cola anterior">‹</button><button type="button" data-mover="cola" data-paso="1" aria-label="Cola siguiente">›</button></div>
          <div class="mesa-parte"><span>Tronco</span><button type="button" data-mover="tronco" data-paso="-1" aria-label="Tronco anterior">‹</button><button type="button" data-mover="tronco" data-paso="1" aria-label="Tronco siguiente">›</button></div>
          <div class="mesa-parte"><span>Cabeza</span><button type="button" data-mover="cabeza" data-paso="-1" aria-label="Cabeza anterior">‹</button><button type="button" data-mover="cabeza" data-paso="1" aria-label="Cabeza siguiente">›</button></div>
          <button class="boton boton-hueso" type="button" data-quimera-nueva>Otra quimera</button>
          <button class="boton boton-linea" type="button" data-quimera-guardar>Guardar lámina</button>
        </div>
        <p class="mesa-nota">Esqueletos de <i>Die vergleichende Osteologie</i>, Eduard Joseph d'Alton, 1821-1838. ${osario.length} esqueletos dan ${new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(osario.length ** 3)} combinaciones.</p>
      </div>
    </section>
    </main>
${footer}
${dialog}
    <script type="module" src="${base}/catabasis.js?v=${v['catabasis.js']}"></script>
</body>

</html>
`;

// ---------- herbolario.html
const zoneOrder = [...zonas.map(z => z.id), 'osario'];
const cards = laminas.map(l => {
  const [w, h] = fit(l.w, l.h, 480);
  const alfa = l.modo === 'color' ? `<source media="(prefers-color-scheme: dark)" srcset="${base}/media/laminas/${l.id}-alfa.webp">` : '';
  const texto = [l.vulgar, l.titulo, l.latin, l.autor, l.obra, zoneName[l.zona]].filter(Boolean).join(' ').toLowerCase();
  return `
        <li class="hoja" data-zona="${l.zona}" data-modo="${l.modo}" data-buscar="${esc(texto)}">
          <button class="hoja-boton" type="button" ${fichaData(l)} aria-label="Abrir la ficha: ${esc(l.vulgar || l.titulo)}">
            <picture>${alfa}<img src="${src(l, 'sm')}" width="${w}" height="${h}" alt="${esc(altOf(l))}" loading="lazy" decoding="async"></picture>
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
<body class="pagina-herbolario" data-tono="claro">
    <a class="saltar" href="#hojas">Saltar a las láminas</a>
${topbar('herbolario')}

    <main>
    <section class="herbolario-cabecera" aria-labelledby="titulo-herbolario">
      <h1 id="titulo-herbolario">Herbolario</h1>
      <p>Las ${laminas.length} láminas del descenso, con el papel limpio y listas para descargar. Todas son de dominio público.</p>
      <div class="filtros">
        <div class="filtros-zonas" role="group" aria-label="Filtrar por zona">
          <button type="button" data-filtro="todas" aria-pressed="true">Todas <span>${laminas.length}</span></button>
          ${zoneOrder.map(z => `<button type="button" data-filtro="${z}" aria-pressed="false">${esc(zoneName[z])} <span>${laminas.filter(l => l.zona === z).length}</span></button>`).join('\n          ')}
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
    <script type="module" src="${base}/herbolario.js?v=${v['herbolario.js']}"></script>
</body>

</html>
`;

for (const [name, html] of [['index', index], ['herbolario', herbolario]]) {
  if (/[–—]/.test(html)) throw Error(`${name}.html contains an en or em dash`);
}

await rm(resolve(repo, 'dist'), { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ['catabasis.css', 'herbolario.js', 'favicon.svg', 'fonts', 'media']) await cp(resolve(app, f), resolve(out, f), { recursive: true });
// los módulos importan ficha.js: se versiona también para que nunca se mezclen versiones
const conFicha = async f => (await readFile(resolve(app, f), 'utf8')).replace("from './ficha.js'", `from './ficha.js?v=${v['ficha.js']}'`);
await writeFile(resolve(out, 'catabasis.js'), await conFicha('catabasis.js'));
await writeFile(resolve(out, 'herbolario.js'), await conFicha('herbolario.js'));
await cp(resolve(app, 'ficha.js'), resolve(out, 'ficha.js'));
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
