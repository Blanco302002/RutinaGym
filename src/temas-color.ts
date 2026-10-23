// ─────────────────────────────────────────────────────────────
//  COLORES DE LA APP
//  Único lugar donde se definen los temas de color. Para agregar uno,
//  sumá un objeto a la lista: aparece solo en Ajustes (y en index.html,
//  que valida el color guardado antes de pintar).
//
//  claro.acento   → color principal en modo claro
//  claro.oscuro   → estado presionado (y texto acentuado en modo claro)
//  claro.suave    → fondo suave (ícono activo, chips)
//  oscuro.acento  → versión luminosa para modo oscuro (texto y estados
//                   activos; su "suave" es este color al 15%)
//
//  Los rellenos con contenido blanco (botón Guardar, muestras de color) usan
//  siempre claro.acento, también en modo oscuro: la versión luminosa con
//  blanco encima no tiene contraste suficiente.
//
//  vite.config.ts convierte esta lista en CSS al compilar
//  (módulo "virtual:temas-color.css"): no hay estilos armados en runtime.
// ─────────────────────────────────────────────────────────────

export interface TemaColor {
  id: string;
  nombre: string;
  claro: { acento: string; oscuro: string; suave: string };
  oscuro: { acento: string };
}

export const TEMAS_COLOR: TemaColor[] = [
  {
    id: 'marino',
    nombre: 'Azul marino',
    claro: { acento: '#1E3A8A', oscuro: '#172554', suave: '#DBEAFE' },
    oscuro: { acento: '#5B8DEF' },
  },
  {
    id: 'rojo',
    nombre: 'Rojo',
    claro: { acento: '#B91C1C', oscuro: '#991B1B', suave: '#FEE2E2' },
    oscuro: { acento: '#F87171' },
  },
];

/** El primero de la lista. Si el guardado ya no existe (ej. "marron"), se usa este. */
export const COLOR_POR_DEFECTO = 'marino';

export function esColorValido(id: unknown): id is string {
  return typeof id === 'string' && TEMAS_COLOR.some((t) => t.id === id);
}

/** "#2563EB" + 0.15 → "rgba(37, 99, 235, 0.15)" */
export function conOpacidad(hex: string, alfa: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

/**
 * CSS de todos los temas. Se aplica con data-tema="id" en <html>; también
 * sirve en cualquier elemento (las muestras de Ajustes lo usan así).
 */
export function cssDeTemas(temas = TEMAS_COLOR): string {
  return temas
    .map(({ id, claro, oscuro }) => {
      const sel = `[data-tema='${id}']`;
      const selOscuro = `[data-bs-theme='dark']${sel}, [data-bs-theme='dark'] ${sel}`;
      return `${sel} {
  --acento: ${claro.acento};
  --acento-oscuro: ${claro.oscuro};
  --acento-suave: ${claro.suave};
  --acento-suave-fuerte: ${conOpacidad(claro.acento, 0.35)};
  --acento-texto: ${claro.oscuro};
  --acento-relleno: ${claro.acento};
  --acento-cabecera: ${oscuro.acento};
}
${selOscuro} {
  --acento: ${oscuro.acento};
  --acento-suave: ${conOpacidad(oscuro.acento, 0.15)};
  --acento-suave-fuerte: ${conOpacidad(oscuro.acento, 0.35)};
  --acento-texto: ${oscuro.acento};
}`;
    })
    .join('\n');
}
