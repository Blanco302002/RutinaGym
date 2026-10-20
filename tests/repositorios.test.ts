import { describe, expect, it } from 'vitest';
import { precarga, resumenEjercicio } from '../src/dominio/estadisticas';
import { baseVacia, dia } from './ayudantes';

const LUNES = 0;
const lunes = dia(2026, 10, 19);

describe('Repositorios y carga de series', () => {
  it('una serie guardada se recupera con todos sus datos', async () => {
    const { repos, entrenamiento } = await baseVacia();
    const { serie, sesion } = await entrenamiento.guardarSerie(LUNES, 'press_plano', 52.5, 8, lunes);

    expect(await repos.series.obtenerPorSesion(sesion.id)).toEqual([serie]);
    expect(serie).toMatchObject({
      sesionId: '2026-10-19_0',
      ejercicioId: 'press_plano',
      numero: 1,
      peso: 52.5,
      reps: 8,
      fecha: '2026-10-19',
    });
  });

  it('el historial trae solo ese ejercicio, de la sesión más vieja a la más nueva', async () => {
    const { repos, entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, dia(2026, 10, 26));
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 55, 8, lunes);
    await entrenamiento.guardarSerie(LUNES, 'aperturas', 14, 12, lunes);

    const historial = await repos.series.obtenerHistorial('press_plano');
    expect(historial.map((s) => [s.fecha, s.peso])).toEqual([
      ['2026-10-19', 55],
      ['2026-10-26', 60],
    ]);
  });

  it('calcula el peso inicial y el máximo con sus repeticiones', async () => {
    const { repos, entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 40, 10, lunes);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 45, 8, lunes);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 6, dia(2026, 11, 2));
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, dia(2026, 11, 2));

    const resumen = resumenEjercicio(await repos.series.obtenerHistorial('press_plano'));
    expect(resumen.inicial?.serie).toMatchObject({ peso: 45, reps: 8 }); // la más pesada del primer día
    expect(resumen.maximo).toMatchObject({ peso: 60, reps: 8 }); // a igual peso, gana la de más reps
  });

  it('el modal propone la serie 1, y después de guardar propone la 2', async () => {
    const { entrenamiento } = await baseVacia();

    expect((await entrenamiento.estadoDeCarga(LUNES, 'press_plano', lunes)).numero).toBe(1);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    expect((await entrenamiento.estadoDeCarga(LUNES, 'press_plano', lunes)).numero).toBe(2);
  });

  it('la numeración es por ejercicio: otro ejercicio arranca en la serie 1', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);

    expect((await entrenamiento.estadoDeCarga(LUNES, 'aperturas', lunes)).numero).toBe(1);
  });

  it('al borrar la última serie vuelve a proponer ese número y reabre el ejercicio', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    const { sesion } = await entrenamiento.guardarSerie(LUNES, 'press_plano', 55, 8, lunes);
    await entrenamiento.calificar(sesion.id, 'press_plano', 'mala');

    await entrenamiento.borrarUltimaSerie(sesion.id, 'press_plano');
    const estado = await entrenamiento.estadoDeCarga(LUNES, 'press_plano', lunes);

    expect(estado.numero).toBe(2);
    expect(estado.completado).toBe(false);
  });

  it('precarga lo que hice en esa misma serie la vez anterior', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 55, 8, lunes);

    const semanaQueViene = dia(2026, 10, 26);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 52.5, 10, semanaQueViene);
    const estado = await entrenamiento.estadoDeCarga(LUNES, 'press_plano', semanaQueViene);

    expect(estado.numero).toBe(2);
    expect(precarga(estado.historial, estado.sesionId, estado.numero)).toEqual({ peso: 55, reps: 8 });
  });

  it('el mismo día de rutina en la misma semana usa una sola sesión', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    const { sesion, serie } = await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, dia(2026, 10, 20));

    expect(sesion.id).toBe('2026-10-19_0');
    expect(serie.numero).toBe(2);
  });

  it('el resumen por sesión cuenta series y ejercicios distintos', async () => {
    const { repos, entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    await entrenamiento.guardarSerie(LUNES, 'aperturas', 14, 12, lunes);

    expect(await repos.series.resumenPorSesion()).toEqual({
      '2026-10-19_0': { series: 3, ejercicios: ['press_plano', 'aperturas'] },
    });
  });

  it('el ánimo de hoy se hereda en otra sesión del mismo día', async () => {
    const { entrenamiento } = await baseVacia();
    await entrenamiento.registrarAnimo(LUNES, 4, lunes);

    expect((await entrenamiento.asegurarSesion(2, lunes)).animo).toBe(4);
  });
});
