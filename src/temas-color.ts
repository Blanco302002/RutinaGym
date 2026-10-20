// ─────────────────────────────────────────────────────────────
//  COLORES DE LA APP
//  Único lugar donde se definen los temas de color. Para agregar uno,
//  sumá un objeto a la lista: aparece solo en Ajustes.
//
//  claro.acento   → color principal en modo claro
//  claro.oscuro   → estado presionado (y texto acentuado en modo claro)
//  claro.suave    → fondo suave (ícono activo, chips)
//  oscuro.acento  → versión luminosa para modo oscuro (texto y estados
//                   activos; su "suave" es este color al 15%)
//
//  Los rellenos con contenido blanco (botón central, botón Guardar) usan
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
    id: 'azul',
    nombre: 'Azul',
    claro: { acento: '#2563EB', oscuro: '#1D4ED8', suave: '#DBEAFE' },
    oscuro: { acento: '#60A5FA' },
  },
  {
    id: 'verde',
    nombre: 'Verde',
    claro: { acento: '#15803D', oscuro: '#166534', suave: '#DCFCE7' },
    oscuro: { acento: '#4ADE80' },
  },
  {
    id: 'morado',
    nombre: 'Morado',
    claro: { acento: '#7C3AED', oscuro: '#6D28D9', suave: '#EDE9FE' },
    oscuro: { acento: '#A78BFA' },
  },
  {
    id: 'rojo',
    nombre: 'Rojo',
    claro: { acento: '#DC2626', oscuro: '#B91C1C', suave: '#FEE2E2' },
    oscuro: { acento: '#F87171' },
  },
  {
    id: 'naranja',
    nombre: 'Naranja',
    claro: { acento: '#C2410C', oscuro: '#9A3412', suave: '#FFEDD5' },
    oscuro: { acento: '#FB923C' },
  },
  {
    id: 'marron',
    nombre: 'Marrón',
    claro: { acento: '#92400E', oscuro: '#78350F', suave: '#FEF3C7' },
    oscuro: { acento: '#D6A77A' },
  },
];

export const COLOR_POR_DEFECTO = 'azul';

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
