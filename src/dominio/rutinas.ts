// Gestión de rutinas: crear, duplicar, editar, eliminar, y las reglas que
// conectan las rutinas con el historial. Usa solo las interfaces de
// repositorios (no sabe que abajo hay IndexedDB).

import type { DiaRutina, Ejercicio, EjercicioEnRutina, Repositorios, Rutina, TipoDia } from '../datos';
import { RUTINA } from '../rutina';
import { normalizar } from '../util/formato';

export const NOMBRES_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const LIMITES = { nombre: 60, seriesMin: 1, seriesMax: 10, reps: 15, notas: 100 } as const;

export interface EjercicioDelDia {
  item: EjercicioEnRutina;
  ejercicio: Ejercicio;
}

export interface DiaCompleto {
  dia: DiaRutina;
  ejercicios: EjercicioDelDia[];
}

/** Una rutina con sus 7 días (lunes a domingo) y los ejercicios de cada uno. */
export interface RutinaCompleta {
  rutina: Rutina;
  dias: DiaCompleto[];
}

export type EstadoInicial = 'lista' | 'migrada' | 'nueva';

// ── Formato y validación ─────────────────────────────────────

/** "4×6-10" */
export function objetivo(item: Pick<EjercicioEnRutina, 'series' | 'reps'>): string {
  return `${item.series}×${item.reps}`;
}

/** Primer número de las reps ("8-12" → 8), para precargar. */
export function repsMinimas(reps?: string): number | undefined {
  const n = Number.parseInt(reps ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
}

export interface DatosEjercicio {
  nombre: string;
  series: number;
  reps: string;
  notas: string;
}

export type ErroresEjercicio = Partial<Record<keyof DatosEjercicio, string>>;

export function validarNombre(nombre: string): string | undefined {
  const n = nombre.trim();
  if (!n) return 'El nombre es obligatorio.';
  if (n.length > LIMITES.nombre) return `Máximo ${LIMITES.nombre} caracteres.`;
  return undefined;
}

/** Errores por campo; vacío si está todo bien. */
export function validarEjercicio(datos: DatosEjercicio): ErroresEjercicio {
  const errores: ErroresEjercicio = {};
  const nombre = validarNombre(datos.nombre);
  if (nombre) errores.nombre = nombre;
  if (!Number.isInteger(datos.series) || datos.series < LIMITES.seriesMin || datos.series > LIMITES.seriesMax) {
    errores.series = `Las series van de ${LIMITES.seriesMin} a ${LIMITES.seriesMax}.`;
  }
  if (!datos.reps.trim()) errores.reps = 'Poné las repeticiones (ej. 8-12).';
  else if (datos.reps.trim().length > LIMITES.reps) errores.reps = `Máximo ${LIMITES.reps} caracteres.`;
  if (datos.notas.length > LIMITES.notas) errores.notas = `Máximo ${LIMITES.notas} caracteres.`;
  return errores;
}

function hayErrores(errores: object): boolean {
  return Object.keys(errores).length > 0;
}

/** "Press inclinado (máquina)" → "press_inclinado_maquina" */
export function idDesdeNombre(nombre: string): string {
  return (
    normalizar(nombre)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'ejercicio'
  );
}

function nuevoId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`;
}

// ── Servicio ─────────────────────────────────────────────────

export class GestorRutinas {
  constructor(private readonly repos: Repositorios) {}

  /**
   * Al abrir la app:
   * - 'lista': ya hay rutinas.
   * - 'migrada': hay datos de antes (cuando la rutina estaba en el código): se
   *   carga esa rutina como "Rutina principal", con los mismos ids de ejercicio,
   *   y las sesiones viejas quedan asignadas a ella.
   * - 'nueva': teléfono sin nada: la app muestra la bienvenida.
   */
  async inicializar(): Promise<EstadoInicial> {
    const { rutinas, sesiones, series } = await this.repos.respaldo.contar();
    if (rutinas > 0) {
      await this.asegurarActiva();
      await this.asignarSesionesSueltas();
      return 'lista';
    }
    if (sesiones + series > 0) {
      await this.crearDesdeSemilla('Rutina principal', true);
      await this.asignarSesionesSueltas();
      return 'migrada';
    }
    return 'nueva';
  }

  /** Bienvenida → "Usar rutina de ejemplo". */
  async usarEjemplo(): Promise<Rutina> {
    return this.crearDesdeSemilla('Rutina de ejemplo', true);
  }

  /** Bienvenida → "Crear mi rutina desde cero" (y también "+ Nueva rutina → Empezar de cero"). */
  async crearDesdeCero(nombre = 'Mi rutina', activa = false): Promise<Rutina> {
    const rutina: Rutina = { id: nuevoId('rutina'), nombre, activa: false, creada: Date.now() };
    await this.repos.rutinas.guardar(rutina);
    for (let d = 0; d < 7; d++) {
      await this.repos.dias.guardar({ id: `${rutina.id}_${d}`, rutinaId: rutina.id, dia: d, tipo: 'descanso', nombre: 'Descanso' });
    }
    if (activa) await this.activar(rutina.id);
    await this.limpiarHuerfanos();
    return (await this.repos.rutinas.obtener(rutina.id))!;
  }

  /** Carga la rutina de src/rutina.ts (la semilla) con los mismos ids de ejercicio. */
  async crearDesdeSemilla(nombre: string, activa: boolean): Promise<Rutina> {
    const rutina: Rutina = { id: nuevoId('rutina'), nombre, activa: false, creada: Date.now() };
    await this.repos.rutinas.guardar(rutina);
    for (const [d, dia] of RUTINA.entries()) {
      const diaId = `${rutina.id}_${d}`;
      await this.repos.dias.guardar({
        id: diaId,
        rutinaId: rutina.id,
        dia: d,
        tipo: dia.descanso ? 'descanso' : 'entrenamiento',
        // La nota del día (ej. "Más aislamiento, menos peso.") pasa a ser parte del nombre.
        nombre: dia.nota ? `${dia.grupo} · ${dia.nota}` : dia.grupo,
      });
      const items: EjercicioEnRutina[] = [];
      for (const [orden, e] of dia.ejercicios.entries()) {
        // No pisa el nombre si el ejercicio ya existía (historial de antes).
        if (!(await this.repos.ejercicios.obtener(e.id))) await this.repos.ejercicios.guardar({ id: e.id, nombre: e.nombre });
        items.push({
          id: nuevoId('item'),
          diaId,
          rutinaId: rutina.id,
          ejercicioId: e.id,
          orden,
          series: Math.min(LIMITES.seriesMax, Math.max(LIMITES.seriesMin, e.series ?? 1)),
          reps: (e.reps ?? e.texto ?? '—').slice(0, LIMITES.reps),
          notas: (e.nota ?? '').slice(0, LIMITES.notas),
        });
      }
      if (items.length) await this.repos.ejerciciosEnRutina.guardar(...items);
    }
    if (activa) await this.activar(rutina.id);
    return (await this.repos.rutinas.obtener(rutina.id))!;
  }

  /** Si no hay ninguna activa (ej. después de importar), activa la primera. */
  private async asegurarActiva(): Promise<void> {
    const rutinas = await this.repos.rutinas.listar();
    const activas = rutinas.filter((r) => r.activa);
    if (rutinas.length && activas.length !== 1) await this.repos.rutinas.activar((activas[0] ?? rutinas[0]).id);
  }

  /** Las sesiones sin rutina (anteriores a las rutinas editables) pasan a la activa. */
  private async asignarSesionesSueltas(): Promise<void> {
    const activa = await this.activa();
    if (!activa) return;
    const sueltas = (await this.repos.sesiones.listar()).filter((s) => !s.rutinaId);
    if (sueltas.length) await this.repos.sesiones.guardar(...sueltas.map((s) => ({ ...s, rutinaId: activa.id })));
  }

  // ── Consultas ──

  listar(): Promise<Rutina[]> {
    return this.repos.rutinas.listar();
  }

  async activa(): Promise<Rutina | undefined> {
    return (await this.repos.rutinas.listar()).find((r) => r.activa);
  }

  async completa(rutinaId: string): Promise<RutinaCompleta | undefined> {
    const rutina = await this.repos.rutinas.obtener(rutinaId);
    if (!rutina) return undefined;
    const [dias, items, ejercicios] = await Promise.all([
      this.repos.dias.listarPorRutina(rutinaId),
      this.repos.ejerciciosEnRutina.listarPorRutina(rutinaId),
      this.repos.ejercicios.listar(),
    ]);
    const porId = new Map(ejercicios.map((e) => [e.id, e]));
    return {
      rutina,
      dias: dias.map((dia) => ({
        dia,
        ejercicios: items
          .filter((i) => i.diaId === dia.id)
          .map((item) => ({ item, ejercicio: porId.get(item.ejercicioId) ?? { id: item.ejercicioId, nombre: item.ejercicioId } })),
      })),
    };
  }

  async activaCompleta(): Promise<RutinaCompleta | undefined> {
    const activa = await this.activa();
    return activa ? this.completa(activa.id) : undefined;
  }

  /** Rutinas en las que está un ejercicio (sin repetir). */
  async rutinasDeEjercicio(ejercicioId: string): Promise<string[]> {
    const items = await this.repos.ejerciciosEnRutina.listarPorEjercicio(ejercicioId);
    return [...new Set(items.map((i) => i.rutinaId))];
  }

  // ── Rutinas ──

  async renombrar(rutinaId: string, nombre: string): Promise<string | undefined> {
    const error = validarNombre(nombre);
    if (error) return error;
    const rutina = await this.repos.rutinas.obtener(rutinaId);
    if (rutina) await this.repos.rutinas.guardar({ ...rutina, nombre: nombre.trim() });
    return undefined;
  }

  /**
   * Cambia la rutina activa. Los tildes de la semana se toman de las sesiones
   * de la rutina activa, así que con la nueva arrancan de cero. El historial no se toca.
   */
  activar(rutinaId: string): Promise<void> {
    return this.repos.rutinas.activar(rutinaId);
  }

  /** Copia días y ejercicios (mismos ejercicios → mismo historial), con nombre "Copia de …". */
  async duplicar(rutinaId: string): Promise<Rutina> {
    const original = await this.completa(rutinaId);
    if (!original) throw new Error('La rutina no existe');
    const copia: Rutina = {
      id: nuevoId('rutina'),
      nombre: `Copia de ${original.rutina.nombre}`.slice(0, LIMITES.nombre),
      activa: false,
      creada: Date.now(),
    };
    await this.repos.rutinas.guardar(copia);
    for (const { dia, ejercicios } of original.dias) {
      const diaId = `${copia.id}_${dia.dia}`;
      await this.repos.dias.guardar({ ...dia, id: diaId, rutinaId: copia.id });
      const items = ejercicios.map(({ item }) => ({ ...item, id: nuevoId('item'), diaId, rutinaId: copia.id }));
      if (items.length) await this.repos.ejerciciosEnRutina.guardar(...items);
    }
    return copia;
  }

  /** Devuelve un mensaje si no se puede (la activa o la única). Nunca borra historial. */
  async eliminar(rutinaId: string): Promise<string | undefined> {
    const rutinas = await this.repos.rutinas.listar();
    const rutina = rutinas.find((r) => r.id === rutinaId);
    if (!rutina) return undefined;
    if (rutinas.length === 1) return 'No se puede eliminar la única rutina.';
    if (rutina.activa) return 'No se puede eliminar la rutina activa. Activá otra primero.';
    await this.repos.rutinas.eliminar(rutinaId);
    await this.limpiarHuerfanos();
    return undefined;
  }

  // ── Días ──

  async guardarDia(diaId: string, cambios: { tipo: TipoDia; nombre: string }): Promise<string | undefined> {
    const dia = await this.repos.dias.obtener(diaId);
    if (!dia) return undefined;
    const nombre = cambios.nombre.trim() || (cambios.tipo === 'descanso' ? 'Descanso' : '');
    if (cambios.tipo === 'entrenamiento') {
      const error = validarNombre(nombre);
      if (error) return error;
    }
    await this.repos.dias.guardar({ ...dia, tipo: cambios.tipo, nombre });
    return undefined;
  }

  /** Mueve un ejercicio un lugar arriba (-1) o abajo (+1). Devuelve false si ya está en el borde. */
  async mover(itemId: string, delta: -1 | 1): Promise<boolean> {
    const item = await this.repos.ejerciciosEnRutina.obtener(itemId);
    if (!item) return false;
    const lista = await this.repos.ejerciciosEnRutina.listarPorDia(item.diaId);
    const i = lista.findIndex((x) => x.id === itemId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= lista.length) return false;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    // Se renumeran todos: quedan 0, 1, 2… aunque antes hubiera huecos.
    await this.repos.ejerciciosEnRutina.guardar(...lista.map((x, orden) => ({ ...x, orden })));
    return true;
  }

  // ── Ejercicios ──

  /** Busca un ejercicio por nombre (sin importar mayúsculas ni tildes). */
  async buscarPorNombre(nombre: string): Promise<Ejercicio | undefined> {
    const buscado = normalizar(nombre.trim());
    return (await this.repos.ejercicios.listar()).find((e) => normalizar(e.nombre) === buscado);
  }

  /**
   * Agrega un ejercicio a un día. Con `ejercicioId` usa uno existente (su
   * historial se conecta solo); si no, crea uno nuevo con ese nombre (o reusa
   * el que ya se llame igual).
   */
  async agregarEjercicio(
    diaId: string,
    datos: DatosEjercicio & { ejercicioId?: string },
  ): Promise<{ errores: ErroresEjercicio; item?: EjercicioEnRutina }> {
    const errores = validarEjercicio(datos);
    if (hayErrores(errores)) return { errores };
    const dia = await this.repos.dias.obtener(diaId);
    if (!dia) return { errores: { nombre: 'El día no existe.' } };

    let ejercicio = datos.ejercicioId ? await this.repos.ejercicios.obtener(datos.ejercicioId) : undefined;
    if (!ejercicio) ejercicio = await this.buscarPorNombre(datos.nombre);
    if (!ejercicio) {
      ejercicio = { id: await this.idLibre(idDesdeNombre(datos.nombre)), nombre: datos.nombre.trim() };
      await this.repos.ejercicios.guardar(ejercicio);
    } else if (ejercicio.nombre !== datos.nombre.trim()) {
      await this.repos.ejercicios.guardar({ ...ejercicio, nombre: datos.nombre.trim() });
    }

    const actuales = await this.repos.ejerciciosEnRutina.listarPorDia(diaId);
    const item: EjercicioEnRutina = {
      id: nuevoId('item'),
      diaId,
      rutinaId: dia.rutinaId,
      ejercicioId: ejercicio.id,
      orden: actuales.reduce((max, x) => Math.max(max, x.orden + 1), 0),
      series: datos.series,
      reps: datos.reps.trim(),
      notas: datos.notas.trim(),
    };
    await this.repos.ejerciciosEnRutina.guardar(item);
    return { errores: {}, item };
  }

  /** Cambia series, reps y notas en esta rutina; el nombre cambia en todas las rutinas y en el historial. */
  async actualizarEjercicio(itemId: string, datos: DatosEjercicio): Promise<ErroresEjercicio> {
    const errores = validarEjercicio(datos);
    if (hayErrores(errores)) return errores;
    const item = await this.repos.ejerciciosEnRutina.obtener(itemId);
    if (!item) return { nombre: 'El ejercicio ya no está en la rutina.' };
    await this.repos.ejerciciosEnRutina.guardar({
      ...item,
      series: datos.series,
      reps: datos.reps.trim(),
      notas: datos.notas.trim(),
    });
    const errorNombre = await this.renombrarEjercicio(item.ejercicioId, datos.nombre);
    return errorNombre ? { nombre: errorNombre } : {};
  }

  async renombrarEjercicio(ejercicioId: string, nombre: string): Promise<string | undefined> {
    const error = validarNombre(nombre);
    if (error) return error;
    const ejercicio = await this.repos.ejercicios.obtener(ejercicioId);
    if (ejercicio && ejercicio.nombre !== nombre.trim()) {
      await this.repos.ejercicios.guardar({ ...ejercicio, nombre: nombre.trim() });
    }
    return undefined;
  }

  /**
   * Saca el ejercicio de ese día de la rutina. Si tiene series registradas se
   * conserva (con todo su historial). Si no tiene historial y no está en
   * ninguna otra rutina, se borra del todo.
   */
  async quitarEjercicio(itemId: string): Promise<'quitado' | 'borrado'> {
    const item = await this.repos.ejerciciosEnRutina.obtener(itemId);
    if (!item) return 'quitado';
    await this.repos.ejerciciosEnRutina.eliminar(itemId);
    return (await this.borrarSiSobra(item.ejercicioId)) ? 'borrado' : 'quitado';
  }

  /** Borra un ejercicio que no tiene historial ni está en ninguna rutina. */
  private async borrarSiSobra(ejercicioId: string): Promise<boolean> {
    const [series, usos] = await Promise.all([
      this.repos.series.obtenerHistorial(ejercicioId),
      this.repos.ejerciciosEnRutina.listarPorEjercicio(ejercicioId),
    ]);
    if (series.length || usos.length) return false;
    await this.repos.ejercicios.eliminar(ejercicioId);
    return true;
  }

  /** Limpia los ejercicios que quedaron sin uso (ej. al borrar una rutina). */
  async limpiarHuerfanos(): Promise<void> {
    for (const e of await this.repos.ejercicios.listar()) await this.borrarSiSobra(e.id);
  }

  private async idLibre(base: string): Promise<string> {
    let id = base;
    for (let n = 2; await this.repos.ejercicios.obtener(id); n++) id = `${base}_${n}`;
    return id;
  }
}
