import { describe, expect, it } from 'vitest';
import { COLOR_POR_DEFECTO, TEMAS_COLOR, conOpacidad, cssDeTemas, esColorValido } from '../src/temas-color';

/** Contraste WCAG entre dos colores hex. */
function contraste(a: string, b: string): number {
  const luminancia = (hex: string) => {
    const n = Number.parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

const FONDO_CLARO = '#f1f1ef';
const TARJETA_OSCURA = '#1a1a1a';
const FONDO_OSCURO = '#0d0d0d';
const PILDORA_CLARA = '#ebebef';
const PILDORA_OSCURA = '#3a3a3c';

describe('Temas de color', () => {
  it.each(TEMAS_COLOR)('$nombre: el contenido blanco sobre el acento se lee bien', (tema) => {
    expect(contraste('#ffffff', tema.claro.acento)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS_COLOR)('$nombre: el texto acentuado se lee bien en modo claro', (tema) => {
    expect(contraste(tema.claro.oscuro, FONDO_CLARO)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS_COLOR)('$nombre: el texto acentuado y las agujas se leen bien en modo oscuro', (tema) => {
    expect(contraste(tema.oscuro.acento, TARJETA_OSCURA)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(tema.oscuro.acento, FONDO_OSCURO)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS_COLOR)('$nombre: las agujas se leen bien sobre el fondo claro', (tema) => {
    expect(contraste(tema.claro.acento, FONDO_CLARO)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS_COLOR)('$nombre: el ícono activo se distingue sobre la píldora de la barra', (tema) => {
    expect(contraste(tema.claro.oscuro, PILDORA_CLARA)).toBeGreaterThanOrEqual(3);
    expect(contraste(tema.oscuro.acento, PILDORA_OSCURA)).toBeGreaterThanOrEqual(3);
  });

  it('hay dos temas: Azul marino (por defecto) y Rojo', () => {
    expect(TEMAS_COLOR.map((t) => t.id)).toEqual(['marino', 'rojo']);
    expect(COLOR_POR_DEFECTO).toBe('marino');
  });

  it('el CSS generado tiene una regla clara y una oscura por tema', () => {
    const css = cssDeTemas();
    for (const { id, claro, oscuro } of TEMAS_COLOR) {
      expect(css).toContain(`[data-tema='${id}'] {`);
      expect(css).toContain(`--acento: ${claro.acento};`);
      expect(css).toContain(`[data-bs-theme='dark'][data-tema='${id}']`);
      expect(css).toContain(`--acento-suave: ${conOpacidad(oscuro.acento, 0.15)};`);
    }
  });

  it('el suave de modo oscuro es el acento luminoso al 15%', () => {
    expect(conOpacidad('#5B8DEF', 0.15)).toBe('rgba(91, 141, 239, 0.15)');
  });

  it('solo acepta ids de temas que existen', () => {
    expect(esColorValido('marino')).toBe(true);
    expect(esColorValido('rojo')).toBe(true);
    expect(esColorValido('marron')).toBe(false); // tema eliminado
    expect(esColorValido('fucsia')).toBe(false);
    expect(esColorValido(undefined)).toBe(false);
  });
});
