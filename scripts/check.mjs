// Comprobaciones rápidas sin dependencias: sintaxis, datos completos y que cada lámina tenga sus archivos.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// package.json declara "type": "module", así que node --check los trata como módulos ES
for (const f of ['catabasis.js', 'herbolario.js', 'ficha.js', 'tema.js', 'scripts/build.mjs']) {
  execFileSync(process.execPath, ['--check', f.includes('/') ? f : `app/${f}`], { stdio: 'inherit' });
}

const { zonas, laminas, osario } = JSON.parse(readFileSync('app/data/laminas.json', 'utf8'));
const errores = [];
const zonaIds = new Set([...zonas.map(z => z.id), 'osario']);
for (const l of laminas) {
  for (const campo of ['id', 'zona', 'titulo', 'fuente', 'url', 'modo']) if (!l[campo]) errores.push(`${l.id}: falta ${campo}`);
  if (!zonaIds.has(l.zona)) errores.push(`${l.id}: zona desconocida ${l.zona}`);
  if (l.destacada) for (const campo of ['latin', 'vulgar', 'texto', 'verdad']) if (!l[campo]) errores.push(`${l.id}: ficha sin ${campo}`);
  const tamaños = ['sm', 'md', 'lg', ...(l.modo === 'color' ? ['alfa'] : [])];
  for (const t of tamaños) if (!existsSync(`app/media/laminas/${l.id}-${t}.webp`)) errores.push(`${l.id}: falta ${t}.webp`);
  for (const [k, val] of Object.entries(l)) if (typeof val === 'string' && /[–—]/.test(val)) errores.push(`${l.id}.${k}: raya larga`);
}
for (const o of osario) if (!existsSync(`app/media/osario/${o.file}`)) errores.push(`osario: falta ${o.file}`);
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }
console.log(`OK · ${laminas.length} láminas, ${laminas.filter(l => l.destacada).length} con ficha, ${osario.length} esqueletos`);
