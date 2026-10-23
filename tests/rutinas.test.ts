import { describe, expect, it } from 'vitest';
import type { Sesion } from '../src/datos/modelos';
import { filtrarPorRutina, agruparPorSesion, resumenEjercicio, rutinasParaFiltrar } from '../src/dominio/estadisticas';
import { leerRespaldo, restaurarRespaldo } from '../src/dominio/respaldo';
import { validarEjercicio } from '../src/dominio/rutinas';
import { baseVacia, dia, telefonoNuevo } from './ayudantes';

const LUNES = 0;
const lunes = dia(2026, 10, 19);

/** Datos como los guardaba la versión anterior: sin rutinas y con sesiones sin rutinaId. */
async function telefonoConDatosViejos() {
  const base = await telefonoNuevo();
  const { repos } = base;
  await repos.ejercicios.guardar({ id: 'press_plano', nombre: 'Press plano con barra o mancuernas' });
  const sesion: Sesion = {
    id: '2026-10-12_0',
    fecha: '2026-10-12',
    dia: LUNES,
    rutina: 'Pecho + tríceps',
    tecnica: { press_plano: 'bien' },
    completados: ['press_plano'],
    animo: 4,
    creada: 1,
  };
  await repos.sesiones.guardar(sesion);
  await repos.series.guardarSerie({ sesionId: sesion.id, ejercicioId: 'press_plano', numero: 1, peso: 60, reps: 8, fecha: sesion.fecha });
  return base;
}

describe('Primer uso y migración', () => {
  it('teléfono nuevo sin datos: pide bienvenida y no crea nada solo', async () => {
    const { rutinas } = await telefonoNuevo();

    expect(await rutinas.inicializar()).toBe('nueva');
    expect(await rutinas.listar()).toEqual([]);
  });

  it('bienvenida → "Usar rutina de ejemplo": carga la del código, activa y editable', async () => {
    const { rutinas } = await telefonoNuevo();
    await rutinas.inicializar();
    await rutinas.usarEjemplo();

    const activa = await rutinas.activaCompleta();
    expect(activa?.rutina.nombre).toBe('Rutina de ejemplo');
    expect(activa?.dias).toHaveLength(7);
    expect(activa?.dias[LUNES].ejercicios[0].ejercicio.id).toBe('press_plano');
    expect(activa?.dias[6].dia.tipo).toBe('descanso');
  });

  it('bienvenida → "Crear mi rutina desde cero": "Mi rutina", activa, 7 días en descanso', async () => {
    const { rutinas } = await telefonoNuevo();
    await rutinas.inicializar();
    await rutinas.crearDesdeCero('Mi rutina', true);

    const activa = await rutinas.activaCompleta();
    expect(activa?.rutina.nombre).toBe('Mi rutina');
    expect(activa?.dias.map((d) => d.dia.tipo)).toEqual(Array(7).fill('descanso'));
    expect(activa?.dias.every((d) => d.ejercicios.length === 0)).toBe(true);
  });

  it('teléfono con datos de antes: migra a "Rutina principal" con los mismos ids e historial conectado', async () => {
    const { repos, rutinas } = await telefonoConDatosViejos();

    expect(await rutinas.inicializar()).toBe('migrada');

    const activa = await rutinas.activaCompleta();
    expect(activa?.rutina.nombre).toBe('Rutina principal');
    const lunesRutina = activa!.dias[LUNES];
    expect(lunesRutina.ejercicios[0].ejercicio).toEqual({ id: 'press_plano', nombre: 'Press plano con barra o mancuernas' });
    expect(lunesRutina.ejercicios[0].item).toMatchObject({ series: 4, reps: '6-10' });

    const [sesion] = await repos.sesiones.listar();
    expect(sesion.rutinaId).toBe(activa!.rutina.id);
    expect(sesion.animo).toBe(4);
    const historial = await repos.series.obtenerHistorial('press_plano');
    expect(resumenEjercicio(historial).maximo).toMatchObject({ peso: 60, reps: 8 });
  });

  it('la migración pasa una sola vez: al volver a abrir no duplica la rutina', async () => {
    const { rutinas } = await telefonoConDatosViejos();
    await rutinas.inicializar();

    expect(await rutinas.inicializar()).toBe('lista');
    expect(await rutinas.listar()).toHaveLength(1);
  });

  it('la nota del día de la rutina vieja pasa al nombre del día', async () => {
    const { rutinas } = await baseVacia();
    const activa = await rutinas.activaCompleta();

    expect(activa?.dias[3].dia.nombre).toBe('Espalda + pecho · Más aislamiento, menos peso.');
  });
});

describe('Rutinas', () => {
  it('duplicar copia días y ejercicios con "Copia de …", sin activarla', async () => {
    const { rutinas, rutina } = await baseVacia();
    const copia = await rutinas.duplicar(rutina.id);

    expect(copia).toMatchObject({ nombre: 'Copia de Rutina principal', activa: false });
    const original = (await rutinas.completa(rutina.id))!;
    const duplicada = (await rutinas.completa(copia.id))!;
    expect(duplicada.dias.map((d) => d.ejercicios.map((e) => e.ejercicio.id))).toEqual(
      original.dias.map((d) => d.ejercicios.map((e) => e.ejercicio.id)),
    );
    // Son copias: cambiar la copia no toca la original.
    const item = duplicada.dias[LUNES].ejercicios[0].item;
    expect(item.id).not.toBe(original.dias[LUNES].ejercicios[0].item.id);
    await rutinas.actualizarEjercicio(item.id, { nombre: 'Press plano con barra o mancuernas', series: 5, reps: '5', notas: '' });
    expect((await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios[0].item.series).toBe(4);
  });

  it('no se puede eliminar la única rutina', async () => {
    const { rutinas, rutina } = await baseVacia();
    await rutinas.activar('otra-que-no-existe'); // ninguna activa: igual es la única

    expect(await rutinas.eliminar(rutina.id)).toBe('No se puede eliminar la única rutina.');
  });

  it('no se puede eliminar la rutina activa', async () => {
    const { rutinas, rutina } = await baseVacia();
    await rutinas.duplicar(rutina.id);

    expect(await rutinas.eliminar(rutina.id)).toMatch(/rutina activa/);
    expect(await rutinas.listar()).toHaveLength(2);
  });

  it('eliminar otra rutina borra sus días y ejercicios, pero no el historial', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, lunes);
    const copia = await rutinas.duplicar(rutina.id);
    await rutinas.activar(copia.id);

    expect(await rutinas.eliminar(rutina.id)).toBeUndefined();
    expect(await repos.dias.listarPorRutina(rutina.id)).toEqual([]);
    expect(await repos.ejerciciosEnRutina.listarPorRutina(rutina.id)).toEqual([]);
    expect(await repos.series.obtenerHistorial('press_plano')).toHaveLength(1);
    expect(await repos.sesiones.listar()).toHaveLength(1);
  });

  it('cambiar la rutina activa: los tildes de la semana arrancan de cero y el historial queda', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.alternarCompletado(LUNES, 'cinta', lunes);
    const copia = await rutinas.duplicar(rutina.id);

    await rutinas.activar(copia.id);

    const semana = await entrenamiento.semana(lunes);
    expect(entrenamiento.sesionDelDia(semana, LUNES)).toBeUndefined();
    expect((await rutinas.listar()).filter((r) => r.activa).map((r) => r.id)).toEqual([copia.id]);
    expect(await repos.sesiones.listar()).toHaveLength(1);

    // Una sesión nueva con la otra rutina no pisa la anterior.
    const { sesion } = await entrenamiento.guardarSerie(LUNES, 'press_plano', 50, 10, lunes);
    expect(sesion.rutinaId).toBe(copia.id);
    expect(await repos.sesiones.listar()).toHaveLength(2);
  });
});

describe('Ejercicios en la rutina', () => {
  it('las flechas mueven un lugar; en los bordes no hacen nada', async () => {
    const { rutinas, rutina } = await baseVacia();
    const ids = async () => (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios.map((e) => e.ejercicio.id);
    const items = (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios.map((e) => e.item.id);
    const antes = await ids();

    expect(await rutinas.mover(items[0], -1)).toBe(false); // primero: no sube
    expect(await rutinas.mover(items.at(-1)!, 1)).toBe(false); // último: no baja
    expect(await rutinas.mover(items[0], 1)).toBe(true);

    expect(await ids()).toEqual([antes[1], antes[0], ...antes.slice(2)]);
    const ordenes = (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios.map((e) => e.item.orden);
    expect(ordenes).toEqual(ordenes.map((_, i) => i));
  });

  it('eliminar un ejercicio con historial lo saca de la rutina pero lo conserva', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, lunes);
    const item = (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios[0].item;

    expect(await rutinas.quitarEjercicio(item.id)).toBe('quitado');
    expect(await repos.ejerciciosEnRutina.listarPorEjercicio('press_plano')).toEqual([]);
    expect(await repos.ejercicios.obtener('press_plano')).toBeDefined(); // sigue en Historial → Ejercicios
    expect(await repos.series.obtenerHistorial('press_plano')).toHaveLength(1);
  });

  it('eliminar un ejercicio sin historial y que no está en otra rutina lo borra del todo', async () => {
    const { repos, rutinas, rutina } = await baseVacia();
    const item = (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios[0].item;

    expect(await rutinas.quitarEjercicio(item.id)).toBe('borrado');
    expect(await repos.ejercicios.obtener('press_plano')).toBeUndefined();
  });

  it('eliminar un ejercicio sin historial que está en otra rutina no lo borra', async () => {
    const { repos, rutinas, rutina } = await baseVacia();
    await rutinas.duplicar(rutina.id);
    const item = (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios[0].item;

    expect(await rutinas.quitarEjercicio(item.id)).toBe('quitado');
    expect(await repos.ejercicios.obtener('press_plano')).toBeDefined();
  });

  it('agregar uno que ya existe conecta su historial; con el mismo nombre se reusa', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, lunes);
    const martes = (await rutinas.completa(rutina.id))!.dias[1].dia;

    const { item } = await rutinas.agregarEjercicio(martes.id, {
      nombre: 'PRESS PLANO con barra o mancuernas', // otras mayúsculas: es el mismo
      series: 3,
      reps: '8',
      notas: '',
    });
    expect(item?.ejercicioId).toBe('press_plano');
    expect(await repos.series.obtenerHistorial(item!.ejercicioId)).toHaveLength(1);

    const nuevo = await rutinas.agregarEjercicio(martes.id, { nombre: 'Remo Gironda', series: 3, reps: '10', notas: '' });
    expect(nuevo.item?.ejercicioId).toBe('remo_gironda');
  });

  it('cambiar el nombre lo cambia en todas las rutinas', async () => {
    const { rutinas, rutina } = await baseVacia();
    const copia = await rutinas.duplicar(rutina.id);
    const item = (await rutinas.completa(rutina.id))!.dias[LUNES].ejercicios[0].item;

    await rutinas.actualizarEjercicio(item.id, { nombre: 'Press banca', series: 4, reps: '6-10', notas: '' });

    expect((await rutinas.completa(copia.id))!.dias[LUNES].ejercicios[0].ejercicio.nombre).toBe('Press banca');
  });

  it('valida nombre, series de 1 a 10, repeticiones y notas de hasta 100', () => {
    const bien = { nombre: 'Sentadilla', series: 4, reps: '6-10', notas: '' };
    expect(validarEjercicio(bien)).toEqual({});
    expect(validarEjercicio({ ...bien, nombre: '  ' }).nombre).toBe('El nombre es obligatorio.');
    expect(validarEjercicio({ ...bien, series: 0 }).series).toBeDefined();
    expect(validarEjercicio({ ...bien, series: 11 }).series).toBeDefined();
    expect(validarEjercicio({ ...bien, series: 2.5 }).series).toBeDefined();
    expect(validarEjercicio({ ...bien, reps: '' }).reps).toBeDefined();
    expect(validarEjercicio({ ...bien, reps: 'las que pueda y más' }).reps).toBeDefined(); // > 15
    expect(validarEjercicio({ ...bien, notas: 'x'.repeat(100) })).toEqual({});
    expect(validarEjercicio({ ...bien, notas: 'x'.repeat(101) }).notas).toBeDefined();
  });
});

describe('Historial por rutina', () => {
  it('el historial es único; el filtro muestra solo las sesiones de cada rutina', async () => {
    const { repos, rutinas, entrenamiento, rutina } = await baseVacia();
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 60, 8, lunes);
    const otra = await rutinas.duplicar(rutina.id);
    await rutinas.activar(otra.id);
    await entrenamiento.guardarSerie(LUNES, 'press_plano', 62.5, 8, dia(2026, 10, 26));

    const historial = await repos.series.obtenerHistorial('press_plano');
    const sesiones = new Map((await repos.sesiones.listar()).map((s) => [s.id, s]));
    const grupos = agruparPorSesion(historial);

    expect(rutinasParaFiltrar(grupos, sesiones)).toEqual([rutina.id, otra.id]);
    expect(filtrarPorRutina(grupos, sesiones)).toHaveLength(2); // Todas
    expect(filtrarPorRutina(grupos, sesiones, rutina.id).map((g) => g.fecha)).toEqual(['2026-10-19']);
    expect(filtrarPorRutina(grupos, sesiones, otra.id).map((g) => g.fecha)).toEqual(['2026-10-26']);
    // El máximo sale de todas las rutinas juntas.
    expect(resumenEjercicio(historial).maximo?.peso).toBe(62.5);
  });
});

describe('Importar un respaldo del formato viejo', () => {
  it('un archivo sin rutinas se importa: arma "Rutina principal" y le asigna las sesiones', async () => {
    const archivoViejo = {
      app: 'rutina-gym',
      version: 1,
      exportado: '2026-10-20T10:00:00.000Z',
      ejercicios: [{ id: 'sentadilla', nombre: 'Sentadilla' }],
      sesiones: [
        { id: '2026-10-14_2', fecha: '2026-10-14', dia: 2, rutina: 'Piernas', tecnica: {}, completados: [], creada: 1 },
      ],
      series: [
        { id: 'x1', sesionId: '2026-10-14_2', ejercicioId: 'sentadilla', numero: 1, peso: 80, reps: 8, fecha: '2026-10-14', creada: 1 },
      ],
      preferencias: { color: 'rojo' },
    };
    const respaldo = leerRespaldo(JSON.stringify(archivoViejo));
    if (typeof respaldo === 'string') throw new Error(respaldo);

    const { repos, rutinas } = await telefonoNuevo();
    await restaurarRespaldo(repos, respaldo);

    const activa = await rutinas.activa();
    expect(activa?.nombre).toBe('Rutina principal');
    expect((await repos.sesiones.listar())[0].rutinaId).toBe(activa!.id);
    expect(await repos.series.obtenerHistorial('sentadilla')).toHaveLength(1);
    expect(repos.preferencias.obtener().color).toBe('rojo');
  });

  it('un archivo con rutinas dañadas se rechaza sin tocar nada', () => {
    const roto = {
      app: 'rutina-gym',
      version: 2,
      ejercicios: [],
      sesiones: [],
      series: [],
      rutinas: [{ id: 'r1', nombre: 'X', activa: true }],
      dias: [],
      ejerciciosEnRutina: [{ id: 'i1', diaId: 'd', rutinaId: 'r1', ejercicioId: 'e', orden: 0, series: 20, reps: '8', notas: '' }],
    };
    expect(leerRespaldo(JSON.stringify(roto))).toBe('Hay ejercicios de rutina inválidos.');
  });
});
