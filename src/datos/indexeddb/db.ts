// Conexión y helpers mínimos de IndexedDB (promesas sobre la API nativa).

export const STORES = {
  ejercicios: 'ejercicios',
  sesiones: 'sesiones',
  series: 'series',
  rutinas: 'rutinas',
  dias: 'dias',
  ejerciciosEnRutina: 'ejerciciosEnRutina',
} as const;
export type Store = (typeof STORES)[keyof typeof STORES];

const NOMBRE_DB = 'rutina-gym';
const VERSION = 2;

export function abrirDB(nombre = NOMBRE_DB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(nombre, VERSION);
    pedido.onupgradeneeded = (evento) => {
      const db = pedido.result;
      // Cada versión agrega lo suyo; una base vieja pasa por todas las que le faltan.
      if (evento.oldVersion < 1) {
        db.createObjectStore(STORES.ejercicios, { keyPath: 'id' });
        const sesiones = db.createObjectStore(STORES.sesiones, { keyPath: 'id' });
        sesiones.createIndex('fecha', 'fecha');
        const series = db.createObjectStore(STORES.series, { keyPath: 'id' });
        series.createIndex('ejercicioId', 'ejercicioId');
        series.createIndex('sesionId', 'sesionId');
      }
      if (evento.oldVersion < 2) {
        // v2: rutinas editables (antes estaban en el código).
        db.createObjectStore(STORES.rutinas, { keyPath: 'id' });
        const dias = db.createObjectStore(STORES.dias, { keyPath: 'id' });
        dias.createIndex('rutinaId', 'rutinaId');
        const items = db.createObjectStore(STORES.ejerciciosEnRutina, { keyPath: 'id' });
        items.createIndex('diaId', 'diaId');
        items.createIndex('rutinaId', 'rutinaId');
        items.createIndex('ejercicioId', 'ejercicioId');
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export function resultado<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

/** Resuelve cuando la transacción termina de escribir (o falla). */
export function terminada(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
  });
}

export function leer(db: IDBDatabase, store: Store): IDBObjectStore {
  return db.transaction(store, 'readonly').objectStore(store);
}

export function obtener<T>(db: IDBDatabase, store: Store, id: string): Promise<T | undefined> {
  return resultado(leer(db, store).get(id));
}

export function todos<T>(db: IDBDatabase, store: Store): Promise<T[]> {
  return resultado(leer(db, store).getAll());
}

export function porIndice<T>(db: IDBDatabase, store: Store, indice: string, valor: string): Promise<T[]> {
  return resultado(leer(db, store).index(indice).getAll(valor));
}

/** Guarda uno o varios registros en una sola transacción. */
export async function poner(db: IDBDatabase, store: Store, items: unknown[]): Promise<void> {
  const tx = db.transaction(store, 'readwrite');
  const destino = tx.objectStore(store);
  for (const item of items) destino.put(item);
  await terminada(tx);
}

export async function borrar(db: IDBDatabase, store: Store, id: string): Promise<void> {
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await terminada(tx);
}
