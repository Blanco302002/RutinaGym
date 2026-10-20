// Conexión y helpers mínimos de IndexedDB (promesas sobre la API nativa).

export const STORES = { ejercicios: 'ejercicios', sesiones: 'sesiones', series: 'series' } as const;
type Store = (typeof STORES)[keyof typeof STORES];

const NOMBRE_DB = 'rutina-gym';
const VERSION = 1;

export function abrirDB(nombre = NOMBRE_DB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(nombre, VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      // v1: estructura inicial. Para cambios futuros, subir VERSION y migrar acá.
      db.createObjectStore(STORES.ejercicios, { keyPath: 'id' });
      const sesiones = db.createObjectStore(STORES.sesiones, { keyPath: 'id' });
      sesiones.createIndex('fecha', 'fecha');
      const series = db.createObjectStore(STORES.series, { keyPath: 'id' });
      series.createIndex('ejercicioId', 'ejercicioId');
      series.createIndex('sesionId', 'sesionId');
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
