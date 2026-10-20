import { describe, expect, it } from 'vitest';
import type { Entrenamiento } from '../src/dominio/entrenamiento';
import { lunesDe } from '../src/util/fechas';
import { baseVacia, dia } from './ayudantes';

const LUNES = 0;

async function tachados(ent: Entrenamiento, diaRutina: number, cuando: Date): Promise<string[]> {
  return ent.sesionDelDia(await ent.semana(cuando), diaRutina)?.completados ?? [];
}

describe('Reinicio semanal', () => {
  it('lo tachado el lunes sigue tachado hasta el domingo a las 23:59:59', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.alternarCompletado(LUNES, 'cinta', dia(2026, 10, 19));

    expect(await tachados(entrenamiento, LUNES, dia(2026, 10, 21))).toEqual(['cinta']);
    expect(await tachados(entrenamiento, LUNES, dia(2026, 10, 25, 23, 59, 59))).toEqual(['cinta']);
  });

  it('el lunes siguiente a las 00:00 en punto aparece todo destildado', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.alternarCompletado(LUNES, 'cinta', dia(2026, 10, 19));

    expect(await tachados(entrenamiento, LUNES, dia(2026, 10, 26, 0, 0, 0))).toEqual([]);
  });

  it('la semana arranca el lunes aunque cambie el año', async () => {
    expect(lunesDe(dia(2027, 1, 3))).toBe('2026-12-28'); // domingo 3/1 → lunes 28/12
    expect(lunesDe(dia(2027, 1, 4, 0, 0, 0))).toBe('2027-01-04');

    const { entrenamiento } = await baseVacia();
    await entrenamiento.alternarCompletado(LUNES, 'cinta', dia(2026, 12, 28));

    expect(await tachados(entrenamiento, LUNES, dia(2027, 1, 1))).toEqual(['cinta']);
    expect(await tachados(entrenamiento, LUNES, dia(2027, 1, 4, 0, 0, 0))).toEqual([]);
  });

  it('si no abro la app por varias semanas, al volver está destildado y el historial sigue', async () => {
    const { repos, entrenamiento } = await baseVacia();
    const { sesion } = await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, dia(2026, 10, 19));
    await entrenamiento.calificar(sesion.id, 'press_plano', 'bien');

    expect(await tachados(entrenamiento, LUNES, dia(2026, 11, 30))).toEqual([]);
    expect(await repos.series.obtenerHistorial('press_plano')).toHaveLength(1);
    expect(await repos.sesiones.listar()).toHaveLength(1);
  });

  it('lo que cargo en la semana nueva no se mezcla con la anterior', async () => {
    const { entrenamiento } = await baseVacia();
    const anterior = await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, dia(2026, 10, 19));
    const nueva = await entrenamiento.guardarSerie(LUNES, 'press_plano', 62.5, 8, dia(2026, 10, 26));

    expect(nueva.sesion.id).not.toBe(anterior.sesion.id);
    expect(nueva.serie.numero).toBe(1);
  });
});
