// Implementación de los repositorios sobre IndexedDB.

import type { Ejercicio, NuevaSerie, Respaldo, ResumenSesion, Serie, Sesion } from '../modelos';
import type {
  EjercicioRepository,
  Repositorios,
  RespaldoRepository,
  SerieRepository,
  SesionRepository,
} from '../repositorios';
import { STORES, abrirDB, leer, resultado, terminada } from './db';

class EjercicioRepositoryIDB implements EjercicioRepository {
  constructor(private readonly db: IDBDatabase) {}

  async sincronizar(ejercicios: Ejercicio[]): Promise<void> {
    const tx = this.db.transaction(STORES.ejercicios, 'readwrite');
    const store = tx.objectStore(STORES.ejercicios);
    for (const e of ejercicios) store.put({ id: e.id, nombre: e.nombre });
    await terminada(tx);
  }

  listar(): Promise<Ejercicio[]> {
    return resultado(leer(this.db, STORES.ejercicios).getAll());
  }
}

function porFechaDesc(a: Sesion, b: Sesion): number {
  return b.fecha.localeCompare(a.fecha) || b.creada - a.creada;
}

class SesionRepositoryIDB implements SesionRepository {
  constructor(private readonly db: IDBDatabase) {}

  obtener(id: string): Promise<Sesion | undefined> {
    return resultado(leer(this.db, STORES.sesiones).get(id));
  }

  async guardar(sesion: Sesion): Promise<void> {
    const tx = this.db.transaction(STORES.sesiones, 'readwrite');
    tx.objectStore(STORES.sesiones).put(sesion);
    await terminada(tx);
  }

  async listar(): Promise<Sesion[]> {
    const todas: Sesion[] = await resultado(leer(this.db, STORES.sesiones).getAll());
    return todas.sort(porFechaDesc);
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

class SerieRepositoryIDB implements SerieRepository {
  constructor(private readonly db: IDBDatabase) {}

  async guardarSerie(nueva: NuevaSerie): Promise<Serie> {
    const serie: Serie = { ...nueva, id: crypto.randomUUID(), creada: Date.now() };
    const tx = this.db.transaction(STORES.series, 'readwrite');
    tx.objectStore(STORES.series).put(serie);
    await terminada(tx);
    return serie;
  }

  async eliminarSerie(id: string): Promise<void> {
    const tx = this.db.transaction(STORES.series, 'readwrite');
    tx.objectStore(STORES.series).delete(id);
    await terminada(tx);
  }

  async obtenerHistorial(ejercicioId: string): Promise<Serie[]> {
    const indice = leer(this.db, STORES.series).index('ejercicioId');
    const series: Serie[] = await resultado(indice.getAll(ejercicioId));
    return series.sort(porOrden);
  }

  async obtenerPorSesion(sesionId: string): Promise<Serie[]> {
    const indice = leer(this.db, STORES.series).index('sesionId');
    const series: Serie[] = await resultado(indice.getAll(sesionId));
    return series.sort(porOrden);
  }

  async resumenPorSesion(): Promise<Record<string, ResumenSesion>> {
    const series: Serie[] = await resultado(leer(this.db, STORES.series).getAll());
    const resumen: Record<string, ResumenSesion> = {};
    for (const s of series) {
      const r = (resumen[s.sesionId] ??= { series: 0, ejercicios: [] });
      r.series++;
      if (!r.ejercicios.includes(s.ejercicioId)) r.ejercicios.push(s.ejercicioId);
    }
    return resumen;
  }
}

class RespaldoRepositoryIDB implements RespaldoRepository {
  constructor(private readonly db: IDBDatabase) {}

  async exportar(): Promise<Respaldo> {
    const tx = this.db.transaction(Object.values(STORES), 'readonly');
    const [ejercicios, sesiones, series] = await Promise.all([
      resultado(tx.objectStore(STORES.ejercicios).getAll()),
      resultado(tx.objectStore(STORES.sesiones).getAll()),
      resultado(tx.objectStore(STORES.series).getAll()),
    ]);
    return { app: 'rutina-gym', version: 1, exportado: new Date().toISOString(), ejercicios, sesiones, series };
  }

  async importar(respaldo: Respaldo): Promise<void> {
    // Una sola transacción: o se reemplaza todo, o no cambia nada.
    const tx = this.db.transaction(Object.values(STORES), 'readwrite');
    const grupos: [string, unknown[]][] = [
      [STORES.ejercicios, respaldo.ejercicios],
      [STORES.sesiones, respaldo.sesiones],
      [STORES.series, respaldo.series],
    ];
    for (const [nombre, items] of grupos) {
      const store = tx.objectStore(nombre);
      store.clear();
      for (const item of items) store.put(item);
    }
    await terminada(tx);
  }

  async contar(): Promise<{ sesiones: number; series: number }> {
    const tx = this.db.transaction([STORES.sesiones, STORES.series], 'readonly');
    const [sesiones, series] = await Promise.all([
      resultado(tx.objectStore(STORES.sesiones).count()),
      resultado(tx.objectStore(STORES.series).count()),
    ]);
    return { sesiones, series };
  }
}

export async function crearRepositoriosIDB(nombreDB?: string): Promise<Repositorios> {
  const db = await abrirDB(nombreDB);
  return {
    ejercicios: new EjercicioRepositoryIDB(db),
    sesiones: new SesionRepositoryIDB(db),
    series: new SerieRepositoryIDB(db),
    respaldo: new RespaldoRepositoryIDB(db),
  };
}
