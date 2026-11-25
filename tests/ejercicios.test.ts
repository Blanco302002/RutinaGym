import { describe, expect, it } from 'vitest';
import { resumenEjercicio } from '../src/dominio/estadisticas';
import { desplazamientoActual, pantallaMasCercana } from '../src/ui/carrusel';
import { fechaConDia } from '../src/util/fechas';
import { baseVacia, dia } from './ayudantes';

const LUNES = 0;
const lunes = dia(2026, 10, 19);

describe('Ejercicios desde Historial', () => {
  it('"+ Nuevo ejercicio" lo crea solo en la lista, con id sacado del nombre', async () => {
    const { repos, rutinas, rutina } = await baseVacia();

    const { ejercicio, error } = await rutinas.crearEjercicio('  Remo Gironda ');

    expect(error).toBeUndefined();
    expect(ejercicio).toEqual({ id: 'remo_gironda', nombre: 'Remo Gironda' });
    expect(await repos.ejercicios.obtener('remo_gironda')).toBeDefined();
    expect(await repos.ejerciciosEnRutina.listarPorEjercicio('remo_gironda')).toEqual([]);
    expect(await rutinas.rutinasDeEjercicio('remo_gironda')).toEqual([]);
    expect((await rutinas.completa(rutina.id))!.dias.flatMap((d) => d.ejercicios)).not.toContainEqual(
      expect.objectContaining({ ejercicio: ejercicio }),
    );
  });

  it('no deja crear uno con nombre vacío o repetido (sin importar mayúsculas ni tildes)', async () => {
    const { rutinas } = await baseVacia();

    expect((await rutinas.crearEjercicio('   ')).error).toBe('El nombre es obligatorio.');
    expect((await rutinas.crearEjercicio('SENTADILLA')).error).toBe('Ya existe un ejercicio con ese nombre.');
    expect((await rutinas.crearEjercicio('Extension de cuadriceps')).error).toBe('Ya existe un ejercicio con ese nombre.');
  });

  it('el creado desde Historial sobrevive a crear y a eliminar otras rutinas', async () => {
    const { repos, rutinas, rutina } = await baseVacia();
    await rutinas.crearEjercicio('Remo Gironda');

    await rutinas.crearDesdeCero('Nueva rutina');
    const copia = await rutinas.duplicar(rutina.id);
    await rutinas.eliminar(copia.id);

    expect(await repos.ejercicios.obtener('remo_gironda')).toBeDefined();
  });

  it('después se agrega a un día y su historial queda conectado', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    const { ejercicio } = await rutinas.crearEjercicio('Remo Gironda');
    const lunesRutina = (await rutinas.completa(rutina.id))!.dias[LUNES].dia;

    const { item } = await rutinas.agregarEjercicio(lunesRutina.id, {
      ejercicioId: ejercicio!.id,
      nombre: 'Remo Gironda',
      series: 3,
      reps: '10',
      notas: '',
    });
    await entrenamiento.guardarSerie(LUNES, item!.ejercicioId, 50, 10, lunes);

    expect(await repos.series.obtenerHistorial('remo_gironda')).toHaveLength(1);
  });

  it('eliminar con historial: se saca de todas las rutinas y sigue en la lista', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await rutinas.duplicar(rutina.id); // press_plano queda en dos rutinas
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, lunes);

    expect(await rutinas.eliminarEjercicio('press_plano')).toBe('conservado');
    expect(await repos.ejerciciosEnRutina.listarPorEjercicio('press_plano')).toEqual([]);
    expect(await repos.ejercicios.obtener('press_plano')).toBeDefined();
    expect(await repos.series.obtenerHistorial('press_plano')).toHaveLength(1);
  });

  it('eliminar sin historial: se borra del todo', async () => {
    const { repos, rutinas, rutina } = await baseVacia();
    await rutinas.duplicar(rutina.id);

    expect(await rutinas.eliminarEjercicio('press_plano')).toBe('borrado');
    expect(await repos.ejercicios.obtener('press_plano')).toBeUndefined();
    expect(await repos.ejerciciosEnRutina.listarPorEjercicio('press_plano')).toEqual([]);
  });
});

describe('Peso inicial y máximo', () => {
  it('el inicial es la 1.ª serie con esa rutina, aunque haya series antes con otra', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 40, 12, lunes); // rutina principal
    const otra = await rutinas.duplicar(rutina.id);
    await rutinas.activar(otra.id);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 55, 9, dia(2026, 10, 26)); // 1.ª con la otra
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 6, dia(2026, 10, 26));
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 62.5, 8, dia(2026, 11, 2));

    const historial = await repos.series.obtenerHistorial('press_plano');
    const sesiones = new Map((await repos.sesiones.listar()).map((s) => [s.id, s]));

    const conOtra = resumenEjercicio(historial, undefined, { sesiones, rutinaId: otra.id });
    expect(conOtra.inicial?.serie).toMatchObject({ peso: 55, reps: 9 });
    expect(conOtra.inicial?.fecha).toBe('2026-10-26');

    const conPrincipal = resumenEjercicio(historial, undefined, { sesiones, rutinaId: rutina.id });
    expect(conPrincipal.inicial?.serie).toMatchObject({ peso: 40, reps: 12 });

    // El máximo es de todos los tiempos, de todas las rutinas.
    expect(conPrincipal.maximo).toMatchObject({ peso: 62.5, reps: 8 });
  });

  it('sin series con esa rutina, no hay inicial (y el máximo sigue estando)', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 40, 12, lunes);
    const otra = await rutinas.duplicar(rutina.id);

    const historial = await repos.series.obtenerHistorial('press_plano');
    const sesiones = new Map((await repos.sesiones.listar()).map((s) => [s.id, s]));
    const resumen = resumenEjercicio(historial, undefined, { sesiones, rutinaId: otra.id });

    expect(resumen.inicial).toBeUndefined();
    expect(resumen.maximo).toMatchObject({ peso: 40, reps: 12 });
  });

  it('el inicial y el máximo ya no salen iguales cuando hubo progreso en el mismo día', async () => {
    const { repos, entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 6, lunes);

    const resumen = resumenEjercicio(await repos.series.obtenerHistorial('press_plano'));

    expect(resumen.inicial?.serie.peso).toBe(50);
    expect(resumen.maximo?.peso).toBe(60);
  });
});

describe('Fechas y carrusel', () => {
  it('"Última vez" muestra el día de la semana: miércoles 18 nov', () => {
    expect(fechaConDia('2026-11-18')).toBe('miércoles 18 nov');
    expect(fechaConDia('2026-11-22')).toBe('domingo 22 nov');
  });

  it('agarrar el carrusel en movimiento sigue desde la pantalla que más se ve', () => {
    // Yendo de Ajustes (3) a Cronómetro (2) con 390 de ancho: el carril iba por -1100.
    const base = pantallaMasCercana(-1100, 390, 4);
    expect(base).toBe(3); // todavía se ve más Ajustes
    expect(desplazamientoActual(-1100, base, 390)).toBe(70);
    expect(pantallaMasCercana(-850, 390, 4)).toBe(2);
    expect(pantallaMasCercana(120, 390, 4)).toBe(0); // efecto elástico: no sale del rango
    expect(pantallaMasCercana(-2000, 390, 4)).toBe(3);
  });
});
