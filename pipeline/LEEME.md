# Catábasis: cómo se prepararon las láminas

Scripts de Python de una sola vez con los que se prepararon las láminas de `app/media`. Todos reciben como primer
argumento una carpeta de trabajo (fuera del repo) donde guardan descargas e intermedios.
Las páginas se generan con `npm run build` a partir de
`app/data/laminas.json`, que es la fuente de verdad: para corregir una ficha
basta con editar ese JSON y volver a generar.

1. `pdia_fetch.py`, `pdia_candidates.py`, `metrics_sheets.py`: metadatos del Public Domain
   Image Archive, filtro por tema, técnica y tamaño, y hojas de contacto para elegir a ojo.
2. `selection.py`: la selección por zonas. `download.py` y `bhl_fetch.py` descargan.
3. `process.py`: Real-ESRGAN x4plus para lo que no llega a 2.000 px, papel a blanco, recorte
   y WebP en tres tamaños. Necesita `realesrgan-ncnn-vulkan` en `<trabajo>/esrgan/bin`.
4. `alpha.py`: versión sin papel (color a alfa) de las láminas de color.
5. `osario.py`: aísla los esqueletos de d'Alton, los orienta y los encaja en un lienzo común.
6. `content.py` + `build_data.py`: fichas del bestiario y créditos, escritos en `laminas.json`.
