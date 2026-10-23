// Implementación de los repositorios sobre IndexedDB.

import type {
  DatosGuardados,
  DiaRutina,
  Ejercicio,
  EjercicioEnRutina,
  NuevaSerie,
  ResumenSesion,
  Rutina,
  Serie,
  Sesion,
} from '../modelos';
import type {
  CronometroRepository,
  DiaRutinaRepository,
  EjercicioEnRutinaRepository,
  EjercicioRepository,
  PreferenciasRepository,
  Repositorios,
  RespaldoRepository,
  RutinaRepository,
  SerieRepository,
  SesionRepository,
} from '../repositorios';
import { STORES, abrirDB, borrar, leer, obtener, poner, porIndice, resultado, terminada, todos } from './db';

class EjercicioRepositoryIDB implements EjercicioRepository {
  constructor(private readonly db: IDBDatabase) {}

  obtener(id: string): Promise<Ejercicio | undefined> {
    return obtener(this.db, STORES.ejercicios, id);
  }

  listar(): Promise<Ejercicio[]> {
    return todos(this.db, STORES.ejercicios);
  }

  guardar(ejercicio: Ejercicio): Promise<void> {
    return poner(this.db, STORES.ejercicios, [{ id: ejercicio.id, nombre: ejercicio.nombre }]);
  }

  eliminar(id: string): Promise<void> {
    return borrar(this.db, STORES.ejercicios, id);
  }
}

class RutinaRepositoryIDB implements RutinaRepository {
  constructor(private readonly db: IDBDatabase) {}

  obtener(id: string): Promise<Rutina | undefined> {
    return obtener(this.db, STORES.rutinas, id);
  }

  async listar(): Promise<Rutina[]> {
    const rutinas = await todos<Rutina>(this.db, STORES.rutinas);
    return rutinas.sort((a, b) => a.creada - b.creada);
  }

  guardar(rutina: Rutina): Promise<void> {
    return poner(this.db, STORES.rutinas, [rutina]);
  }

  async activar(id: string): Promise<void> {
    const rutinas = await this.listar();
    await poner(
      this.db,
      STORES.rutinas,
      rutinas.map((r) => ({ ...r, activa: r.id === id })),
    );
  }

  async eliminar(id: string): Promise<void> {
    // Todo junto: la rutina, sus días y sus ejercicios. Las sesiones y series quedan.
    const [dias, items] = await Promise.all([
      porIndice<DiaRutina>(this.db, STORES.dias, 'rutinaId', id),
      porIndice<EjercicioEnRutina>(this.db, STORES.ejerciciosEnRutina, 'rutinaId', id),
    ]);
    const tx = this.db.transaction([STORES.rutinas, STORES.dias, STORES.ejerciciosEnRutina], 'readwrite');
    tx.objectStore(STORES.rutinas).delete(id);
    for (const d of dias) tx.objectStore(STORES.dias).delete(d.id);
    for (const i of items) tx.objectStore(STORES.ejerciciosEnRutina).delete(i.id);
    await terminada(tx);
  }
}

class DiaRutinaRepositoryIDB implements DiaRutinaRepository {
  constructor(private readonly db: IDBDatabase) {}

  obtener(id: string): Promise<DiaRutina | undefined> {
    return obtener(this.db, STORES.dias, id);
  }

  async listarPorRutina(rutinaId: string): Promise<DiaRutina[]> {
    const dias = await porIndice<DiaRutina>(this.db, STORES.dias, 'rutinaId', rutinaId);
    return dias.sort((a, b) => a.dia - b.dia);
  }

  guardar(dia: DiaRutina): Promise<void> {
    return poner(this.db, STORES.dias, [dia]);
  }
}

function porPosicion(a: EjercicioEnRutina, b: EjercicioEnRutina): number {
  return a.orden - b.orden;
}

class EjercicioEnRutinaRepositoryIDB implements EjercicioEnRutinaRepository {
  constructor(private readonly db: IDBDatabase) {}

  obtener(id: string): Promise<EjercicioEnRutina | undefined> {
    return obtener(this.db, STORES.ejerciciosEnRutina, id);
  }

  async listarPorDia(diaId: string): Promise<EjercicioEnRutina[]> {
    return (await porIndice<EjercicioEnRutina>(this.db, STORES.ejerciciosEnRutina, 'diaId', diaId)).sort(porPosicion);
  }

  async listarPorRutina(rutinaId: string): Promise<EjercicioEnRutina[]> {
    const items = await porIndice<EjercicioEnRutina>(this.db, STORES.ejerciciosEnRutina, 'rutinaId', rutinaId);
    return items.sort(porPosicion);
  }

  listarPorEjercicio(ejercicioId: string): Promise<EjercicioEnRutina[]> {
    return porIndice(this.db, STORES.ejerciciosEnRutina, 'ejercicioId', ejercicioId);
  }

  guardar(...items: EjercicioEnRutina[]): Promise<void> {
    return poner(this.db, STORES.ejerciciosEnRutina, items);
  }

  eliminar(id: string): Promise<void> {
    return borrar(this.db, STORES.ejerciciosEnRutina, id);
  }
}

function porFechaDesc(a: Sesion, b: Sesion): number {
  return b.fecha.localeCompare(a.fecha) || b.creada - a.creada;
}

class SesionRepositoryIDB implements SesionRepository {
  constructor(private readonly db: IDBDatabase) {}

  obtener(id: string): Promise<Sesion | undefined> {
    return obtener(this.db, STORES.sesiones, id);
  }

  guardar(...sesiones: Sesion[]): Promise<void> {
    return poner(this.db, STORES.sesiones, sesiones);
  }

  async listar(): Promise<Sesion[]> {
    return (await todos<Sesion>(this.db, STORES.sesiones)).sort(porFechaDesc);
  }

  async listarEntre(desde: string, hasta: string): Promise<Sesion[]> {
    const indice = leer(this.db, STORES.sesiones).index('fecha');
    const sesiones: Sesion[] = await resultado(indice.getAll(IDBKeyRange.bound(desde, hasta)));
    return sesiones.sort(porFechaDesc);
  }
}

function porOrden(a: Serie, b: Serie): number {
  return a.fecha.localeCompare(b.fecha) || a.creada - b.creada || a.numero - b.numero;
}

let ultimaCreada = 0;

class SerieRepositoryIDB implements SerieRepository {
  constructor(private readonly db: IDBDatabase) {}

  async guardarSerie(nueva: NuevaSerie): Promise<Serie> {
    // Siempre creciente, aunque se guarden dos en el mismo milisegundo: define el orden.
    ultimaCreada = Math.max(Date.now(), ultimaCreada + 1);
    const serie: Serie = { ...nueva, id: crypto.randomUUID(), creada: ultimaCreada };
    await poner(this.db, STORES.series, [serie]);
    return serie;
  }

  eliminarSerie(id: string): Promise<void> {
    return borrar(this.db, STORES.series, id);
  }

  async obtenerHistorial(ejercicioId: string): Promise<Serie[]> {
    return (await porIndice<Serie>(this.db, STORES.series, 'ejercicioId', ejercicioId)).sort(porOrden);
  }

  async obtenerPorSesion(sesionId: string): Promise<Serie[]> {
    return (await porIndice<Serie>(this.db, STORES.series, 'sesionId', sesionId)).sort(porOrden);
  }

  async resumenPorSesion(): Promise<Record<string, ResumenSesion>> {
    const series = await todos<Serie>(this.db, STORES.series);
    series.sort(porOrden); // ejercicios en el orden en que se cargaron (no el de los ids)
    const resumen: Record<string, ResumenSesion> = {};
    for (const s of series) {
      const r = (resumen[s.sesionId] ??= { series: 0, ejercicios: [] });
      r.series++;
      if (!r.ejercicios.includes(s.ejercicioId)) r.ejercicios.push(s.ejercicioId);
    }
    return resumen;
  }
}

const TODOS_LOS_STORES = Object.values(STORES);

class RespaldoRepositoryIDB implements RespaldoRepository {
  constructor(private readonly db: IDBDatabase) {}

  async exportar(): Promise<DatosGuardados> {
    const tx = this.db.transaction(TODOS_LOS_STORES, 'readonly');
    const leerTodo = (store: string) => resultado(tx.objectStore(store).getAll());
    const [ejercicios, sesiones, series, rutinas, dias, ejerciciosEnRutina] = await Promise.all([
      leerTodo(STORES.ejercicios),
      leerTodo(STORES.sesiones),
      leerTodo(STORES.series),
      leerTodo(STORES.rutinas),
      leerTodo(STORES.dias),
      leerTodo(STORES.ejerciciosEnRutina),
    ]);
    return { ejercicios, sesiones, series, rutinas, dias, ejerciciosEnRutina };
  }

  async importar(datos: DatosGuardados): Promise<void> {
    // Una sola transacción: o se reemplaza todo, o no cambia nada.
    const tx = this.db.transaction(TODOS_LOS_STORES, 'readwrite');
    const fin = terminada(tx);
    try {
      const grupos: [string, unknown[]][] = [
        [STORES.ejercicios, datos.ejercicios],
        [STORES.sesiones, datos.sesiones],
        [STORES.series, datos.series],
        [STORES.rutinas, datos.rutinas],
        [STORES.dias, datos.dias],
        [STORES.ejerciciosEnRutina, datos.ejerciciosEnRutina],
      ];
      for (const [nombre, items] of grupos) {
        const store = tx.objectStore(nombre);
        store.clear();
        for (const item of items) store.put(item);
      }
    } catch (error) {
      // Un registro inválido tira acá: se cancela todo, incluido el clear().
      tx.abort();
      await fin.catch(() => undefined);
      throw error;
    }
    await fin;
  }

  async contar(): Promise<{ sesiones: number; series: number; rutinas: number }> {
    const tx = this.db.transaction([STORES.sesiones, STORES.series, STORES.rutinas], 'readonly');
    const [sesiones, series, rutinas] = await Promise.all([
      resultado(tx.objectStore(STORES.sesiones).count()),
      resultado(tx.objectStore(STORES.series).count()),
      resultado(tx.objectStore(STORES.rutinas).count()),
    ]);
    return { sesiones, series, rutinas };
  }
}

/** Lo que no va en IndexedDB porque se lee de forma síncrona (localStorage). */
export interface DatosDelTelefono {
  preferencias: PreferenciasRepository;
  cronometro: CronometroRepository;
}

export async function crearRepositoriosIDB(telefono: DatosDelTelefono, nombreDB?: string): Promise<Repositorios> {
  const db = await abrirDB(nombreDB);
  return {
    ejercicios: new EjercicioRepositoryIDB(db),
    rutinas: new RutinaRepositoryIDB(db),
    dias: new DiaRutinaRepositoryIDB(db),
    ejerciciosEnRutina: new EjercicioEnRutinaRepositoryIDB(db),
    sesiones: new SesionRepositoryIDB(db),
    series: new SerieRepositoryIDB(db),
    respaldo: new RespaldoRepositoryIDB(db),
    ...telefono,
  };
}
