import { describe, expect, it } from 'vitest';
import { destinoAlSoltar, elastico } from '../src/ui/carrusel';

const ANCHO = 390;
const HISTORIAL = 0;
const RUTINA = 1;
const AJUSTES = 3;
const PANTALLAS = 4;

describe('Deslizar entre pantallas: al soltar', () => {
  it('pasando un tercio del ancho completa el cambio', () => {
    expect(destinoAlSoltar(-140, 0, ANCHO, RUTINA, PANTALLAS)).toBe(2); // izquierda → Cronómetro
    expect(destinoAlSoltar(140, 0, ANCHO, RUTINA, PANTALLAS)).toBe(HISTORIAL); // derecha → Historial
  });

  it('sin llegar al tercio y despacio, vuelve a donde estaba', () => {
    expect(destinoAlSoltar(-120, -0.1, ANCHO, RUTINA, PANTALLAS)).toBe(RUTINA);
  });

  it('un gesto rápido cambia aunque la distancia sea corta', () => {
    expect(destinoAlSoltar(-40, -0.9, ANCHO, RUTINA, PANTALLAS)).toBe(2);
  });

  it('si al final el dedo volvía para atrás rápido, no cambia', () => {
    expect(destinoAlSoltar(-60, 0.9, ANCHO, RUTINA, PANTALLAS)).toBe(RUTINA);
  });

  it('en los extremos nunca pasa de largo', () => {
    expect(destinoAlSoltar(200, 2, ANCHO, HISTORIAL, PANTALLAS)).toBe(HISTORIAL);
    expect(destinoAlSoltar(-200, -2, ANCHO, AJUSTES, PANTALLAS)).toBe(AJUSTES);
  });
});

describe('Efecto elástico en los extremos', () => {
  it('en Historial hacia la derecha se mueve un tercio de lo que movés el dedo', () => {
    expect(elastico(150, HISTORIAL, PANTALLAS)).toBe(50);
  });

  it('tiene un tope', () => {
    expect(elastico(900, HISTORIAL, PANTALLAS)).toBe(90);
    expect(elastico(-900, AJUSTES, PANTALLAS)).toBe(-90);
  });

  it('en el medio, o hacia el lado que sí hay pantalla, sigue al dedo 1 a 1', () => {
    expect(elastico(150, RUTINA, PANTALLAS)).toBe(150);
    expect(elastico(-150, HISTORIAL, PANTALLAS)).toBe(-150);
  });
});
