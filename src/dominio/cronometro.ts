// Lógica del cronómetro. Funciones puras: reciben el estado y la hora
// actual y devuelven el estado nuevo.
//
// El tiempo sale siempre de la marca de inicio (Date.now) más lo acumulado
// en pausas, nunca de sumar intervalos: si el teléfono se bloquea o la app
// queda en segundo plano, al volver marca lo correcto.

export interface EstadoCronometro {
  corriendo: boolean;
  /** Date.now() del último arranque (null si no está corriendo). */
  inicio: number | null;
  /** Milisegundos acumulados antes del último arranque. */
  acumulado: number;
}

export type Fase = 'cero' | 'corriendo' | 'pausado';

export const EN_CERO: EstadoCronometro = { corriendo: false, inicio: null, acumulado: 0 };

export function fase(estado: EstadoCronometro): Fase {
  if (estado.corriendo) return 'corriendo';
  return estado.acumulado > 0 ? 'pausado' : 'cero';
}

export function transcurrido(estado: EstadoCronometro, ahora = Date.now()): number {
  const enCurso = estado.corriendo && estado.inicio !== null ? Math.max(0, ahora - estado.inicio) : 0;
  return estado.acumulado + enCurso;
}

/** Empezar desde cero o reanudar después de una pausa. */
export function empezar(estado: EstadoCronometro, ahora = Date.now()): EstadoCronometro {
  if (estado.corriendo) return estado;
  return { corriendo: true, inicio: ahora, acumulado: estado.acumulado };
}

export function pausar(estado: EstadoCronometro, ahora = Date.now()): EstadoCronometro {
  if (!estado.corriendo) return estado;
  return { corriendo: false, inicio: null, acumulado: transcurrido(estado, ahora) };
}

export function reiniciar(): EstadoCronometro {
  return { ...EN_CERO };
}

/** 83 456 ms → "01:23,45" (los minutos siguen de largo: "75:03,12"). */
export function formatear(ms: number): string {
  const centesimas = Math.floor(ms / 10);
  const cc = centesimas % 100;
  const ss = Math.floor(centesimas / 100) % 60;
  const mm = Math.floor(centesimas / 6000);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(mm)}:${dos(ss)},${dos(cc)}`;
}

/** Ángulo de las agujas (grados): segundos, 1 vuelta por minuto; minutos, 1 vuelta cada 30. */
export function angulos(ms: number): { segundos: number; minutos: number } {
  return {
    segundos: ((ms % 60_000) / 60_000) * 360,
    minutos: ((ms % 1_800_000) / 1_800_000) * 360,
  };
}

/** Para leer un estado guardado sin confiar en lo que haya. */
export function esEstadoValido(datos: unknown): datos is EstadoCronometro {
  if (!datos || typeof datos !== 'object') return false;
  const e = datos as Partial<EstadoCronometro>;
  const numeroOk = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  return (
    typeof e.corriendo === 'boolean' &&
    numeroOk(e.acumulado) &&
    (e.corriendo ? numeroOk(e.inicio) : e.inicio === null)
  );
}
