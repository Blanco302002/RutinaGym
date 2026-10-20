// Reglas del entrenamiento sobre los repositorios: qué sesión corresponde a
// cada día de la semana, numeración de series, técnica, ánimo.
//
// Reinicio semanal: lo que se ve tachado sale de las sesiones de la semana
// actual (lunes a domingo). Al empezar otra semana no hay sesiones nuevas,
// así que todo aparece destildado, y el historial queda intacto.

import type { Animo, Repositorios, Serie, Sesion, Tecnica } from '../datos';
import { RUTINA } from '../rutina';
import { fechaTexto, lunesDe, sumarDias } from '../util/fechas';
import { siguienteNumero } from './estadisticas';

export interface Semana {
  lunes: string;
  sesiones: Sesion[];
}

/** La sesión tiene algo registrado (si no, no cuenta como entrenamiento). */
export function tieneActividad(sesion: Sesion, cantidadSeries = 0): boolean {
  return cantidadSeries > 0 || sesion.completados.length > 0;
}

/** Lo que necesita el modal para cargar una serie. */
export interface EstadoDeCarga {
  sesionId?: string;
  /** Todas las series del ejercicio (incluidas las de hoy). */
  historial: Serie[];
  /** Las de la sesión de esta semana, en orden. */
  deHoy: Serie[];
  /** Serie que corresponde cargar ahora. */
  numero: number;
  completado: boolean;
}

export class Entrenamiento {
  constructor(private readonly repos: Repositorios) {}

  async semana(hoy = new Date()): Promise<Semana> {
    const lunes = lunesDe(hoy);
    return { lunes, sesiones: await this.repos.sesiones.listarEntre(lunes, sumarDias(lunes, 6)) };
  }

  /** Sesión de esta semana para un día de la rutina (la más reciente si hay varias). */
  sesionDelDia(semana: Semana, dia: number): Sesion | undefined {
    return semana.sesiones.find((s) => s.dia === dia);
  }

  /** Devuelve la sesión de esta semana para ese día, o la crea con fecha de hoy. */
  async asegurarSesion(dia: number, hoy = new Date()): Promise<Sesion> {
    const semana = await this.semana(hoy);
    const existente = this.sesionDelDia(semana, dia);
    if (existente) return existente;

    const fecha = fechaTexto(hoy);
    const sesion: Sesion = {
      id: `${fecha}_${dia}`,
      fecha,
      dia,
      rutina: RUTINA[dia].grupo,
      // El ánimo es del día: si ya lo contesté en otra sesión de hoy, se hereda.
      animo: semana.sesiones.find((s) => s.fecha === fecha && s.animo)?.animo,
      tecnica: {},
      completados: [],
      creada: Date.now(),
    };
    await this.repos.sesiones.guardar(sesion);
    return sesion;
  }

  async seriesDe(sesionId: string, ejercicioId: string): Promise<Serie[]> {
    const series = await this.repos.series.obtenerPorSesion(sesionId);
    return series.filter((s) => s.ejercicioId === ejercicioId);
  }

  async estadoDeCarga(dia: number, ejercicioId: string, hoy = new Date()): Promise<EstadoDeCarga> {
    const sesion = this.sesionDelDia(await this.semana(hoy), dia);
    const historial = await this.repos.series.obtenerHistorial(ejercicioId);
    const deHoy = historial.filter((s) => s.sesionId === sesion?.id).sort((a, b) => a.numero - b.numero);
    return {
      sesionId: sesion?.id,
      historial,
      deHoy,
      numero: siguienteNumero(deHoy),
      completado: sesion?.completados.includes(ejercicioId) ?? false,
    };
  }

  async guardarSerie(dia: number, ejercicioId: string, peso: number, reps: number, hoy = new Date()) {
    const sesion = await this.asegurarSesion(dia, hoy);
    const numero = siguienteNumero(await this.seriesDe(sesion.id, ejercicioId));
    const serie = await this.repos.series.guardarSerie({
      sesionId: sesion.id,
      ejercicioId,
      numero,
      peso,
      reps,
      fecha: fechaTexto(hoy),
    });
    return { serie, sesion, cantidad: numero };
  }

  /** Borra la última serie cargada de un ejercicio. Si estaba terminado, vuelve a abrirse. */
  async borrarUltimaSerie(sesionId: string, ejercicioId: string): Promise<void> {
    const ultima = (await this.seriesDe(sesionId, ejercicioId)).at(-1);
    if (!ultima) return;
    await this.repos.series.eliminarSerie(ultima.id);
    await this.modificar(sesionId, (s) => {
      s.completados = s.completados.filter((id) => id !== ejercicioId);
      delete s.tecnica[ejercicioId];
    });
  }

  /** Califica la técnica y da el ejercicio por terminado. */
  async calificar(sesionId: string, ejercicioId: string, tecnica: Tecnica): Promise<void> {
    await this.modificar(sesionId, (s) => {
      s.tecnica[ejercicioId] = tecnica;
      if (!s.completados.includes(ejercicioId)) s.completados.push(ejercicioId);
    });
  }

  async alternarCompletado(dia: number, ejercicioId: string, hoy = new Date()): Promise<void> {
    const sesion = await this.asegurarSesion(dia, hoy);
    await this.modificar(sesion.id, (s) => {
      s.completados = s.completados.includes(ejercicioId)
        ? s.completados.filter((id) => id !== ejercicioId)
        : [...s.completados, ejercicioId];
    });
  }

  /** Ánimo contestado hoy en cualquier sesión. */
  animoDeHoy(semana: Semana, hoy = new Date()): Animo | undefined {
    const fecha = fechaTexto(hoy);
    return semana.sesiones.find((s) => s.fecha === fecha && s.animo)?.animo;
  }

  async registrarAnimo(dia: number, animo: Animo, hoy = new Date()): Promise<void> {
    const sesion = await this.asegurarSesion(dia, hoy);
    await this.modificar(sesion.id, (s) => {
      s.animo = animo;
    });
  }

  private async modificar(sesionId: string, cambio: (s: Sesion) => void): Promise<void> {
    const sesion = await this.repos.sesiones.obtener(sesionId);
    if (!sesion) return;
    cambio(sesion);
    await this.repos.sesiones.guardar(sesion);
  }
}
