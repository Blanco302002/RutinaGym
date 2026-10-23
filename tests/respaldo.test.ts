import { describe, expect, it } from 'vitest';
import type { Repositorios } from '../src/datos/repositorios';
import { crearRespaldo, leerRespaldo, restaurarRespaldo } from '../src/dominio/respaldo';
import { baseVacia, dia } from './ayudantes';

async function cargarDatosDeEjemplo() {
  const base = await baseVacia();
  const { entrenamiento, repos } = base;
  await entrenamiento.registrarAnimo(0, 4, dia(2026, 10, 19));
  await entrenamiento.guardarSerie(0, 'press_plano', 60, 8, dia(2026, 10, 19));
  const { sesion } = await entrenamiento.guardarSerie(0, 'press_plano', 62.5, 6, dia(2026, 10, 19));
  await entrenamiento.calificar(sesion.id, 'press_plano', 'dudosa');
  await entrenamiento.alternarCompletado(0, 'cinta', dia(2026, 10, 19));
  repos.preferencias.guardar({ color: 'rojo' });
  return base;
}

/** Todo lo que guarda la app (sin la fecha de exportación), para comparar dos bases. */
async function contenido(repos: Repositorios) {
  const { exportado: _, ...resto } = await crearRespaldo(repos);
  return resto;
}

describe('Exportar e importar', () => {
  it('ida y vuelta: importar en una base vacía deja todo idéntico', async () => {
    const { repos: origen } = await cargarDatosDeEjemplo();
    const texto = JSON.stringify(await crearRespaldo(origen));

    const { repos: destino } = await baseVacia();
    const respaldo = leerRespaldo(texto);
    if (typeof respaldo === 'string') throw new Error(respaldo);
    await restaurarRespaldo(destino, respaldo);

    expect(await contenido(destino)).toEqual(await contenido(origen));
    const [sesion] = await destino.sesiones.listar();
    expect(sesion.animo).toBe(4);
    expect(sesion.tecnica).toEqual({ press_plano: 'dudosa' });
    expect(sesion.completados).toEqual(['press_plano', 'cinta']);
    expect(destino.preferencias.obtener().color).toBe('rojo');
  });

  it('importar reemplaza los datos que había', async () => {
    const { repos: origen } = await cargarDatosDeEjemplo();
    const respaldo = await crearRespaldo(origen);

    const { repos: destino, entrenamiento } = await baseVacia();
    await entrenamiento.guardarSerie(1, 'jalon_pecho', 40, 12, dia(2026, 10, 20));
    await restaurarRespaldo(destino, respaldo);

    expect(await destino.series.obtenerHistorial('jalon_pecho')).toEqual([]);
    expect(await destino.respaldo.contar()).toEqual({ sesiones: 1, series: 2 });
  });

  it('un JSON roto devuelve un error y no toca los datos', async () => {
    const { repos } = await cargarDatosDeEjemplo();
    const antes = await contenido(repos);

    expect(leerRespaldo('{ esto no es json')).toBe('No se pudo leer el archivo: no es un JSON válido.');
    expect(await contenido(repos)).toEqual(antes);
  });

  it('un archivo de otra app o incompleto se rechaza', () => {
    expect(leerRespaldo(JSON.stringify({ hola: 'mundo' }))).toBe('El archivo no es un respaldo de esta app.');
    expect(leerRespaldo(JSON.stringify({ app: 'rutina-gym', version: 1, sesiones: [] }))).toBe(
      'Al respaldo le faltan datos.',
    );
  });

  it('una sola serie con datos faltantes hace rechazar todo el archivo', async () => {
    const { repos } = await cargarDatosDeEjemplo();
    const respaldo = await crearRespaldo(repos);
    const roto = { ...respaldo, series: [...respaldo.series, { id: 'x', sesionId: 's', ejercicioId: 'e', peso: 50 }] };

    expect(leerRespaldo(JSON.stringify(roto))).toBe('Hay series inválidas.');
  });

  it('si la base falla a mitad de la importación, no se borra nada', async () => {
    const { repos } = await cargarDatosDeEjemplo();
    const antes = await contenido(repos);
    const datos = await repos.respaldo.exportar();
    // Saltea la validación a propósito: una serie sin id hace fallar la escritura.
    const conError = { ...datos, series: [...datos.series, { peso: 1 } as never] };

    await expect(repos.respaldo.importar(conError)).rejects.toThrow();
    expect(await contenido(repos)).toEqual(antes);
  });

  it('un respaldo sin preferencias (versión anterior) mantiene el color actual', async () => {
    const { repos: origen } = await cargarDatosDeEjemplo();
    const { preferencias: _, ...sinPreferencias } = await crearRespaldo(origen);

    const { repos: destino } = await baseVacia(); // en Azul marino; el origen estaba en Rojo
    await restaurarRespaldo(destino, sinPreferencias);

    expect(destino.preferencias.obtener().color).toBe('marino');
  });

  it('un color que ya no existe en el respaldo (ej. marrón) se ignora', async () => {
    const { repos: origen } = await cargarDatosDeEjemplo();
    const respaldo = { ...(await crearRespaldo(origen)), preferencias: { color: 'marron' } };

    const { repos: destino } = await baseVacia();
    await restaurarRespaldo(destino, respaldo);

    expect(destino.preferencias.obtener().color).toBe('marino');
  });
});
