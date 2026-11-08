// Tema claro por defecto, aunque el sistema esté en oscuro. El oscuro solo se activa con el botón
// de la cabecera y se recuerda en localStorage. Se carga en <head> sin defer para pintar ya con el tema.
(() => {
  const doc = document.documentElement;
  const CLAVE = 'catabasis-tema';
  const meta = document.querySelector('meta[name="theme-color"]');
  const barraClara = meta.content;   // la escribe build.mjs; es el papel del aire (--z-aire)
  let guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch {}

  const aplica = tema => {
    doc.dataset.tema = tema;
    meta.content = tema === 'oscuro' ? '#151512' : barraClara;
    // las versiones sin papel (alfa) de las láminas de color solo se usan en oscuro
    for (const s of document.querySelectorAll('source[data-alfa]')) s.media = tema === 'oscuro' ? 'all' : 'not all';
    for (const b of document.querySelectorAll('[data-cambiar-tema]')) b.setAttribute('aria-pressed', String(tema === 'oscuro'));
  };

  aplica(guardado === 'oscuro' ? 'oscuro' : 'claro');

  document.addEventListener('DOMContentLoaded', () => {
    aplica(doc.dataset.tema);
    for (const b of document.querySelectorAll('[data-cambiar-tema]')) {
      b.addEventListener('click', () => {
        const tema = doc.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
        aplica(tema);
        try { localStorage.setItem(CLAVE, tema); } catch {}
      });
    }
  });
})();
