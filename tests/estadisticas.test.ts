import { describe, expect, it } from 'vitest';
import type { Serie } from '../src/datos/modelos';
import { precarga, resumenEjercicio } from '../src/dominio/estadisticas';
import { frasesDeProgreso } from '../src/dominio/frases';

let n = 0;
function serie(sesionId: string, fecha: string, numero: number, peso: number, reps: number): Serie {
  return { id: `s${n++}`, sesionId, ejercicioId: 'press_plano', numero, peso, reps, fecha, creada: n };
}

const historial = [
  serie('a', '2026-09-01', 1, 40, 10),
  serie('a', '2026-09-01', 2, 45, 8),
  serie('b', '2026-09-08', 1, 47.5, 8),
  serie('b', '2026-09-08', 2, 50, 6),
  serie('c', '2026-10-06', 1, 50, 10),
  serie('c', '2026-10-06', 2, 55, 8),
];

describe('resumenEjercicio', () => {
  it('calcula inicial, máximo y última vez sin contar la sesión actual', () => {
    const hoy = [...historial, serie('d', '2026-10-13', 1, 52.5, 9)];
    const r = resumenEjercicio(hoy, 'd');
    expect(r.inicial?.serie.peso).toBe(45);
    expect(r.maximo).toMatchObject({ peso: 55, reps: 8 });
    expect(r.ultimaVez?.sesionId).toBe('c');
  });
});

describe('precarga', () => {
  it('usa la misma serie de la vez anterior', () => {
    expect(precarga(historial, 'nueva', 2)).toEqual({ peso: 55, reps: 8 });
  });
  it('si la vez anterior hubo menos series, usa la última de hoy', () => {
    const conHoy = [...historial, serie('d', '2026-10-13', 1, 52.5, 9), serie('d', '2026-10-13', 2, 55, 7)];
    expect(precarga(conHoy, 'd', 3)).toEqual({ peso: 55, reps: 7 });
  });
  it('sin historial, peso 0 y las reps por defecto', () => {
    expect(precarga([], undefined, 1, 6)).toEqual({ peso: 0, reps: 6 });
  });
});

describe('frasesDeProgreso', () => {
  it('compara la serie más pesada contra hace 4 semanas', () => {
    const frases = frasesDeProgreso(historial, new Date(2026, 9, 7));
    expect(frases[0]).toBe('En 4 semanas subiste de 50 a 55 kg en tu serie más pesada, un 10%.');
    expect(frases).toContain('Récord personal en la última sesión: 55 kg × 8.');
  });

  it('mismo peso con más repeticiones', () => {
    const h = [serie('a', '2026-09-01', 1, 60, 6), serie('b', '2026-10-01', 1, 60, 8)];
    expect(frasesDeProgreso(h, new Date(2026, 9, 1))[0]).toBe(
      'Mismo peso que hace un mes (60 kg), pero 2 repeticiones más.',
    );
  });

  it('detecta estancamiento', () => {
    const h = [
      serie('a', '2026-09-01', 1, 60, 8),
      serie('b', '2026-09-08', 1, 60, 8),
      serie('c', '2026-09-15', 1, 57.5, 8),
      serie('d', '2026-09-29', 1, 60, 7),
    ];
    expect(frasesDeProgreso(h, new Date(2026, 8, 29))).toContain(
      'Hace 4 semanas que estás igual en este ejercicio (mejor: 60 kg × 8).',
    );
  });

  it('avisa si hace mucho que no lo hacés', () => {
    expect(frasesDeProgreso(historial, new Date(2026, 9, 20))[0]).toBe('Hace 14 días que no lo hacés.');
  });
});
