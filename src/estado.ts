// Estado guardado en localStorage: qué ejercicios están tachados esta semana.
// Si la semana guardada no es la actual, se descarta todo (reinicio semanal).

const CLAVE = 'rutina:estado:v1';

interface Estado {
  /** Lunes de la semana a la que pertenecen los tachados (AAAA-MM-DD, hora local). */
  semana: string;
  /** Índice de día (0 = lunes) → ids de ejercicios completados. */
  hechos: Record<number, string[]>;
}

/** 0 = lunes … 6 = domingo. */
export function indiceDia(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

/** AAAA-MM-DD en hora local (toISOString usaría UTC y cambiaría de día a la noche). */
export function fechaTexto(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

export function lunesDe(fecha: Date): string {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - indiceDia(fecha));
  return fechaTexto(lunes);
}

function leer(): Estado | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const estado = JSON.parse(crudo) as Estado;
    return typeof estado.semana === 'string' && estado.hechos ? estado : null;
  } catch {
    return null;
  }
}

function guardar(estado: Estado): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue andando en memoria.
  }
}

let estado: Estado = { semana: lunesDe(new Date()), hechos: {} };

/**
 * Carga el estado y lo reinicia si cambió la semana.
 * Se llama al abrir la app y cada vez que vuelve al frente.
 */
export function sincronizarSemana(hoy = new Date()): void {
  const semanaActual = lunesDe(hoy);
  const guardado = leer();
  if (guardado && guardado.semana === semanaActual) {
    estado = guardado;
  } else {
    estado = { semana: semanaActual, hechos: {} };
    guardar(estado);
  }
}

export function estaHecho(dia: number, id: string): boolean {
  return estado.hechos[dia]?.includes(id) ?? false;
}

export function alternar(dia: number, id: string): void {
  // Por si la app quedó abierta mientras arrancaba la semana nueva.
  if (lunesDe(new Date()) !== estado.semana) sincronizarSemana();
  const lista = new Set(estado.hechos[dia] ?? []);
  if (lista.has(id)) lista.delete(id);
  else lista.add(id);
  estado.hechos[dia] = [...lista];
  guardar(estado);
}

export function limpiarDia(dia: number): void {
  delete estado.hechos[dia];
  guardar(estado);
}
