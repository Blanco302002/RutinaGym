// Genera los íconos de la app (mancuerna negra sobre fondo blanco).
// Uso: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join(import.meta.dirname, '..', 'public', 'icons');
const COLOR = '#111111';

// Mancuerna centrada en un lienzo de 512×512. `escala` deja margen para
// los íconos "maskable" de Android, que recortan en círculo.
function svg(escala = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffffff"/>
  <g fill="${COLOR}" transform="translate(256 256) scale(${escala}) translate(-256 -256)">
    <rect x="148" y="241" width="216" height="30" rx="6"/>
    <rect x="108" y="150" width="44" height="212" rx="12"/>
    <rect x="360" y="150" width="44" height="212" rx="12"/>
    <rect x="66" y="190" width="34" height="132" rx="10"/>
    <rect x="412" y="190" width="34" height="132" rx="10"/>
  </g>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon.svg'), svg(0.9));

const salidas = [
  ['apple-touch-icon.png', 180, 0.9],
  ['icon-192.png', 192, 0.9],
  ['icon-512.png', 512, 0.9],
  ['icon-maskable-512.png', 512, 0.72],
];

for (const [nombre, tamano, escala] of salidas) {
  await sharp(Buffer.from(svg(escala)))
    .resize(tamano, tamano)
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(join(OUT, nombre));
  console.log(`✓ ${nombre}`);
}
