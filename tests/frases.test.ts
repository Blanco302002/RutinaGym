import { describe, expect, it } from 'vitest';
import { frasesDeProgreso } from '../src/dominio/frases';
import { dia, serie } from './ayudantes';

describe('Frases de progreso', () => {
  it('sin datos no dice nada', () => {
    expect(frasesDeProgreso([], dia(2026, 10, 19))).toEqual([]);
  });

  it('con una sola sesión avisa que todavía no se puede comparar', () => {
    const frases = frasesDeProgreso([serie('a', '2026-10-19', 1, 50, 10)], dia(2026, 10, 19));

    expect(frases).toEqual(['Primera vez registrada el 19 oct: 50 kg × 10. La próxima ya podés comparar.']);
  });

  it('si subió el peso dice de cuánto a cuánto, en cuántas semanas y el porcentaje', () => {
    const historial = [serie('a', '2026-09-21', 1, 48, 8), serie('b', '2026-10-19', 1, 55, 8)];

    // (55 − 48) / 48 = 14,6% → 15%
    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe(
      'En 4 semanas subiste de 48 a 55 kg en tu serie más pesada, un 15%.',
    );
  });

  it('el porcentaje se redondea al entero más cercano', () => {
    const historial = [serie('a', '2026-09-21', 1, 60, 8), serie('b', '2026-10-19', 1, 62.5, 8)];

    // 2,5 / 60 = 4,17% → 4%
    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe(
      'En 4 semanas subiste de 60 a 62,5 kg en tu serie más pesada, un 4%.',
    );
  });

  it('compara contra hace 4 semanas, no contra la sesión anterior', () => {
    const historial = [
      serie('a', '2026-09-21', 1, 50, 8), // hace 4 semanas: la referencia
      serie('b', '2026-10-12', 1, 57.5, 8),
      serie('c', '2026-10-19', 1, 55, 8),
    ];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe(
      'En 4 semanas subiste de 50 a 55 kg en tu serie más pesada, un 10%.',
    );
  });

  it('mismo peso que hace un mes pero con más repeticiones', () => {
    const historial = [serie('a', '2026-09-21', 1, 60, 6), serie('b', '2026-10-19', 1, 60, 8)];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe(
      'Mismo peso que hace un mes (60 kg), pero 2 repeticiones más.',
    );
  });

  it('si bajó el peso también lo dice', () => {
    const historial = [serie('a', '2026-09-21', 1, 60, 8), serie('b', '2026-10-19', 1, 55, 8)];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe(
      'Tu serie más pesada bajó de 60 a 55 kg respecto de hace un mes.',
    );
  });

  it('avisa cuando hace 3 semanas o más que está igual', () => {
    const historial = [
      serie('a', '2026-09-28', 1, 60, 8), // última mejora
      serie('b', '2026-10-05', 1, 60, 8),
      serie('c', '2026-10-12', 1, 57.5, 8),
      serie('d', '2026-10-19', 1, 60, 7),
    ];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))).toContain(
      'Hace 3 semanas que estás igual en este ejercicio (mejor: 60 kg × 8).',
    );
  });

  it('no habla de estancamiento si mejoró hace poco', () => {
    const historial = [serie('a', '2026-09-21', 1, 60, 8), serie('b', '2026-10-19', 1, 62.5, 8)];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19)).some((f) => f.includes('igual'))).toBe(false);
  });

  it('marca el récord personal de la última sesión', () => {
    const historial = [serie('a', '2026-10-12', 1, 60, 8), serie('b', '2026-10-19', 1, 62.5, 6)];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))).toContain('Récord personal en la última sesión: 62,5 kg × 6.');
  });

  it('en peso corporal compara repeticiones', () => {
    const historial = [serie('a', '2026-09-21', 1, 0, 6), serie('b', '2026-10-19', 1, 0, 9)];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe(
      'En 4 semanas pasaste de 6 a 9 repeticiones en tu mejor serie.',
    );
  });

  it('avisa si hace más de 10 días que no lo hacés', () => {
    const historial = [serie('a', '2026-09-21', 1, 60, 8), serie('b', '2026-10-05', 1, 60, 8)];

    expect(frasesDeProgreso(historial, dia(2026, 10, 19))[0]).toBe('Hace 14 días que no lo hacés.');
  });
});
