import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Repositorios } from '../src/datos/repositorios';
import { crearRepositoriosIDB } from '../src/datos/indexeddb/repositorios';
import { Entrenamiento } from '../src/dominio/entrenamiento';

let repos: Repositorios;
let ent: Entrenamiento;
let db = 0;

beforeEach(async () => {
  repos = await crearRepositoriosIDB(`test-${db++}`);
  ent = new Entrenamiento(repos);
});

const lunes = new Date(2026, 9, 19, 18);
const martes = new Date(2026, 9, 20, 18);
const lunesQueViene = new Date(2026, 9, 26, 18);

describe('Entrenamiento + IndexedDB', () => {
  it('numera las series y las guarda en la sesión de la semana', async () => {
    await ent.guardarSerie(0, 'press_plano', 50, 10, lunes);
    const { cantidad, sesion } = await ent.guardarSerie(0, 'press_plano', 52.5, 8, lunes);
    expect(cantidad).toBe(2);
    expect(sesion).toMatchObject({ id: '2026-10-19_0', fecha: '2026-10-19', dia: 0, rutina: 'Pecho + tríceps' });

    const historial = await repos.series.obtenerHistorial('press_plano');
    expect(historial.map((s) => [s.numero, s.peso, s.reps])).toEqual([
      [1, 50, 10],
      [2, 52.5, 8],
    ]);
    expect(await repos.series.resumenPorSesion()).toEqual({
      '2026-10-19_0': { series: 2, ejercicios: ['press_plano'] },
    });
  });

  it('el mismo día de rutina en la misma semana usa la misma sesión', async () => {
    await ent.guardarSerie(0, 'press_plano', 50, 10, lunes);
    const { sesion } = await ent.guardarSerie(0, 'press_plano', 50, 10, martes);
    expect(sesion.id).toBe('2026-10-19_0');
  });

  it('la semana nueva arranca destildada y el historial queda', async () => {
    const { sesion } = await ent.guardarSerie(0, 'press_plano', 50, 10, lunes);
    await ent.calificar(sesion.id, 'press_plano', 'bien');
    expect(ent.sesionDelDia(await ent.semana(lunes), 0)?.completados).toEqual(['press_plano']);

    expect(ent.sesionDelDia(await ent.semana(lunesQueViene), 0)).toBeUndefined();
    expect(await repos.series.obtenerHistorial('press_plano')).toHaveLength(1);
  });

  it('borrar la última serie reabre el ejercicio', async () => {
    await ent.guardarSerie(0, 'press_plano', 50, 10, lunes);
    const { sesion } = await ent.guardarSerie(0, 'press_plano', 55, 8, lunes);
    await ent.calificar(sesion.id, 'press_plano', 'dudosa');
    await ent.borrarUltimaSerie(sesion.id, 'press_plano');

    const actual = await repos.sesiones.obtener(sesion.id);
    expect(actual?.completados).toEqual([]);
    expect(actual?.tecnica).toEqual({});
    expect((await ent.seriesDe(sesion.id, 'press_plano')).map((s) => s.peso)).toEqual([50]);
  });

  it('el ánimo de hoy se hereda en otra sesión del mismo día', async () => {
    await ent.registrarAnimo(0, 4, lunes);
    const otra = await ent.asegurarSesion(2, lunes);
    expect(otra.animo).toBe(4);
    expect(ent.animoDeHoy(await ent.semana(lunes), lunes)).toBe(4);
  });

  it('exportar e importar reemplaza todo', async () => {
    await ent.guardarSerie(0, 'press_plano', 50, 10, lunes);
    const respaldo = await repos.respaldo.exportar();

    const otros = await crearRepositoriosIDB(`test-${db++}`);
    await new Entrenamiento(otros).guardarSerie(1, 'jalon_pecho', 40, 12, martes);
    await otros.respaldo.importar(respaldo);

    expect(await otros.respaldo.contar()).toEqual({ sesiones: 1, series: 1 });
    expect(await otros.series.obtenerHistorial('jalon_pecho')).toEqual([]);
  });
});
