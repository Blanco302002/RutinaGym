import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CronometroLocalStorage } from '../src/datos/preferencias';
import {
  EN_CERO,
  angulos,
  empezar,
  fase,
  formatear,
  pausar,
  reiniciar,
  transcurrido,
} from '../src/dominio/cronometro';
import { localStorageFalso } from './ayudantes';

const INICIO = new Date(2026, 9, 23, 18, 0, 0);

/** Adelanta el reloj del sistema (falso) unos milisegundos. */
function pasan(ms: number): void {
  vi.setSystemTime(Date.now() + ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(INICIO);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Cronómetro', () => {
  it('arranca en cero, sin correr', () => {
    expect(fase(EN_CERO)).toBe('cero');
    expect(transcurrido(EN_CERO)).toBe(0);
  });

  it('al empezar, cuenta el tiempo desde la marca de inicio', () => {
    const corriendo = empezar(EN_CERO);
    pasan(12_340);

    expect(fase(corriendo)).toBe('corriendo');
    expect(transcurrido(corriendo)).toBe(12_340);
  });

  it('al pausar se congela: el tiempo no avanza mientras está pausado', () => {
    let estado = empezar(EN_CERO);
    pasan(5_000);
    estado = pausar(estado);
    pasan(60_000);

    expect(fase(estado)).toBe('pausado');
    expect(transcurrido(estado)).toBe(5_000);
  });

  it('al reanudar suma lo de antes de la pausa más lo nuevo', () => {
    let estado = empezar(EN_CERO);
    pasan(5_000);
    estado = pausar(estado);
    pasan(30_000); // pausado: no cuenta
    estado = empezar(estado);
    pasan(2_500);

    expect(transcurrido(estado)).toBe(7_500);
  });

  it('reiniciar vuelve a cero (y a mostrar solo Empezar)', () => {
    let estado = empezar(EN_CERO);
    pasan(9_000);
    estado = reiniciar();

    expect(estado).toEqual(EN_CERO);
    expect(fase(estado)).toBe('cero');
  });

  it('después de un rato en segundo plano marca el tiempo correcto', () => {
    const estado = empezar(EN_CERO);
    // El teléfono se bloquea 7 minutos: no corre ningún intervalo, pero el reloj sí avanza.
    pasan(7 * 60_000 + 1_230);

    expect(transcurrido(estado)).toBe(421_230);
    expect(formatear(transcurrido(estado))).toBe('07:01,23');
  });

  it('si el reloj del sistema va para atrás, no da tiempo negativo', () => {
    const estado = empezar(EN_CERO);
    pasan(-5_000);

    expect(transcurrido(estado)).toBe(0);
  });

  it('apretar Empezar dos veces o Parar estando pausado no cambia nada', () => {
    const corriendo = empezar(EN_CERO);
    pasan(1_000);
    expect(empezar(corriendo)).toBe(corriendo);

    const pausado = pausar(corriendo);
    expect(pausar(pausado)).toBe(pausado);
  });

  it('formatea como mm:ss,cc y los minutos siguen de largo', () => {
    expect(formatear(0)).toBe('00:00,00');
    expect(formatear(83_456)).toBe('01:23,45');
    expect(formatear(75 * 60_000 + 3_120)).toBe('75:03,12');
  });

  it('la aguja de segundos da una vuelta por minuto y la de minutos una cada 30', () => {
    expect(angulos(15_000).segundos).toBe(90);
    expect(angulos(60_000).segundos).toBe(0);
    expect(angulos(15 * 60_000).minutos).toBe(180);
    expect(angulos(30 * 60_000).minutos).toBe(0);
  });
});

describe('Cronómetro guardado en el teléfono', () => {
  it('si cierro la app corriendo, al abrirla sigue corriendo con el tiempo correcto', () => {
    vi.stubGlobal('localStorage', localStorageFalso());
    new CronometroLocalStorage().guardar(empezar(EN_CERO));

    pasan(3 * 60_000); // app cerrada 3 minutos
    const reabierto = new CronometroLocalStorage().obtener();

    expect(fase(reabierto)).toBe('corriendo');
    expect(transcurrido(reabierto)).toBe(180_000);
  });

  it('si cierro la app pausado, al abrirla sigue pausado en el mismo tiempo', () => {
    vi.stubGlobal('localStorage', localStorageFalso());
    let estado = empezar(EN_CERO);
    pasan(42_000);
    estado = pausar(estado);
    new CronometroLocalStorage().guardar(estado);

    pasan(10 * 60_000);
    const reabierto = new CronometroLocalStorage().obtener();

    expect(fase(reabierto)).toBe('pausado');
    expect(transcurrido(reabierto)).toBe(42_000);
  });

  it('un estado guardado roto arranca en cero', () => {
    vi.stubGlobal('localStorage', localStorageFalso({ 'rutina:cronometro': '{"corriendo":"si"' }));

    expect(new CronometroLocalStorage().obtener()).toEqual(EN_CERO);
  });
});
