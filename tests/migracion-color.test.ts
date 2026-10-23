import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLAVE_COLOR, PreferenciasLocalStorage } from '../src/datos/preferencias';
import { localStorageFalso } from './ayudantes';

afterEach(() => vi.unstubAllGlobals());

describe('Migración de temas de color eliminados', () => {
  it.each(['marron', 'verde', 'morado', 'naranja', 'azul'])(
    'si el tema guardado era "%s", pasa a Azul marino y queda guardado así',
    (viejo) => {
      const almacen = localStorageFalso({ [CLAVE_COLOR]: viejo });
      vi.stubGlobal('localStorage', almacen);

      expect(new PreferenciasLocalStorage().obtener().color).toBe('marino');
      expect(almacen.getItem(CLAVE_COLOR)).toBe('marino');
    },
  );

  it('Rojo sigue existiendo: no se toca', () => {
    const almacen = localStorageFalso({ [CLAVE_COLOR]: 'rojo' });
    vi.stubGlobal('localStorage', almacen);

    expect(new PreferenciasLocalStorage().obtener().color).toBe('rojo');
    expect(almacen.getItem(CLAVE_COLOR)).toBe('rojo');
  });

  it('sin nada guardado usa Azul marino', () => {
    vi.stubGlobal('localStorage', localStorageFalso());

    expect(new PreferenciasLocalStorage().obtener().color).toBe('marino');
  });

  it('no deja guardar un tema que no existe', () => {
    const almacen = localStorageFalso({ [CLAVE_COLOR]: 'rojo' });
    vi.stubGlobal('localStorage', almacen);
    new PreferenciasLocalStorage().guardar({ color: 'marron' });

    expect(almacen.getItem(CLAVE_COLOR)).toBe('rojo');
  });
});
