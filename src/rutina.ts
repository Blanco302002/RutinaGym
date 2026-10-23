// ─────────────────────────────────────────────────────────────
//  RUTINA SEMILLA
//  Ya no es la rutina que usa la app: las rutinas se editan desde la app
//  (Ajustes → Rutinas) y se guardan en la base. Este archivo solo se usa:
//    - la primera vez que se abre esta versión con datos de antes, para
//      armar la "Rutina principal" con los mismos ids (historial conectado);
//    - en un teléfono nuevo, como "Rutina de ejemplo";
//    - al importar un respaldo viejo que no tenía rutinas.
//  Cambiarlo no modifica las rutinas que ya están guardadas.
//
//  Cada ejercicio:
//    id      → identificador fijo (minúsculas y guiones bajos). El historial
//              se guarda con este id: podés cambiar el nombre o moverlo de
//              día sin perder nada. Si cambiás el id, empieza de cero.
//              Dos ejercicios con el mismo id comparten historial.
//    nombre  → lo que se lee en grande
//    series  → cantidad de series (número). Si no está, el ejercicio no
//              lleva carga de series: se tacha con un toque (ej. cinta).
//    reps    → repeticiones objetivo, texto libre ("6-10", "15", "máx")
//    texto   → opcional, reemplaza el "4×6-10" que se muestra
//    nota    → opcional, texto chico debajo del nombre
// ─────────────────────────────────────────────────────────────

export interface EjercicioDeRutina {
  id: string;
  nombre: string;
  series?: number;
  reps?: string;
  texto?: string;
  nota?: string;
}

export interface DiaDeRutina {
  nombre: string;
  grupo: string;
  nota?: string;
  ejercicios: EjercicioDeRutina[];
  /** Si está, el día se muestra como descanso (con este texto). */
  descanso?: string;
}

// Bloque de abdominales que se repite miércoles y sábado.
// Si lo cambiás acá, cambia en los dos días.
const ABS: EjercicioDeRutina[] = [
  {
    id: 'elevacion_piernas_silla_romana',
    nombre: 'Elevación de piernas en silla romana',
    series: 3,
    reps: '10-15',
    nota: 'Apoyado como hacés. Subí la pelvis al final, no solo las piernas.',
  },
  {
    id: 'crunch_polea_alta',
    nombre: 'Crunch en polea alta de rodillas',
    series: 3,
    reps: '10-15',
    nota: 'Con peso. Acá va la progresión.',
  },
  { id: 'rueda_abdominal', nombre: 'Rueda abdominal', series: 3, reps: '8-12' },
  { id: 'pallof_press', nombre: 'Pallof press', series: 3, reps: '10-12', nota: 'Por lado, subiendo peso.' },
];

const CINTA: EjercicioDeRutina = { id: 'cinta', nombre: 'Cinta', texto: '10 min' };

const DOMINADAS: EjercicioDeRutina = {
  id: 'dominadas',
  nombre: 'Dominadas',
  series: 3,
  reps: 'máx',
  texto: '2-3 series',
  nota: 'Calentamiento. Las que pueda.',
};

// El orden es fijo: lunes primero, domingo último.
export const RUTINA: DiaDeRutina[] = [
  {
    nombre: 'Lunes',
    grupo: 'Pecho + tríceps',
    ejercicios: [
      { id: 'press_plano', nombre: 'Press plano con barra o mancuernas', series: 4, reps: '6-10' },
      { id: 'press_inclinado_mancuernas', nombre: 'Press inclinado con mancuernas', series: 3, reps: '8-12' },
      {
        id: 'aperturas',
        nombre: 'Aperturas en polea, mancuerna o máquina',
        series: 3,
        reps: '12-15',
        nota: 'Lo que haya libre.',
      },
      { id: 'fondos_press_cerrado', nombre: 'Fondos o press cerrado', series: 3, reps: '8-12' },
      { id: 'extension_polea_soga', nombre: 'Extensión en polea con soga', series: 3, reps: '12-15' },
      { id: 'mancuerna_tras_nuca', nombre: 'Mancuerna por atrás de la cabeza', series: 3, reps: '12-15' },
      CINTA,
    ],
  },
  {
    nombre: 'Martes',
    grupo: 'Espalda + bíceps',
    ejercicios: [
      DOMINADAS,
      { id: 'jalon_pecho', nombre: 'Jalón al pecho', series: 4, reps: '6-12' },
      { id: 'remo_barra_t', nombre: 'Remo con barra o T', series: 4, reps: '8-12' },
      { id: 'remo_polea_baja', nombre: 'Remo en polea baja', series: 3, reps: '10-12' },
      { id: 'pullover_polea', nombre: 'Pullover en polea', series: 2, reps: '12-15' },
      { id: 'curl_barra', nombre: 'Curl con barra', series: 3, reps: '8-12' },
      { id: 'curl_martillo', nombre: 'Curl martillo', series: 3, reps: '10-12' },
      { id: 'curl_concentrado', nombre: 'Curl concentrado', series: 3, reps: '8-12' },
      CINTA,
    ],
  },
  {
    nombre: 'Miércoles',
    grupo: 'Piernas: cuádriceps + abs',
    ejercicios: [
      { id: 'sentadilla', nombre: 'Sentadilla', series: 4, reps: '6-10' },
      { id: 'prensa', nombre: 'Prensa', series: 3, reps: '10-12' },
      {
        id: 'bulgara_cuadriceps',
        nombre: 'Bulgarian split squat',
        series: 3,
        reps: '10-12',
        nota: 'Por pierna.',
      },
      { id: 'extension_cuadriceps', nombre: 'Extensión de cuádriceps', series: 3, reps: '12-15' },
      { id: 'gemelos_pie', nombre: 'Gemelos de pie', series: 3, reps: '10-15' },
      ...ABS,
    ],
  },
  {
    nombre: 'Jueves',
    grupo: 'Espalda + pecho',
    nota: 'Más aislamiento, menos peso.',
    ejercicios: [
      DOMINADAS,
      { id: 'remo_mancuerna_una_mano', nombre: 'Remo con mancuerna a una mano', series: 3, reps: '10-12' },
      { id: 'jalon_agarre_neutro', nombre: 'Jalón agarre neutro', series: 3, reps: '10-12' },
      { id: 'pullover', nombre: 'Pullover', series: 3, reps: '12-15' },
      { id: 'press_inclinado_maquina', nombre: 'Press inclinado en máquina', series: 3, reps: '10-12' },
      { id: 'cruces_polea', nombre: 'Cruces en polea', series: 3, reps: '12-15' },
      { id: 'press_pecho_bajo', nombre: 'Press para pecho bajo', series: 3, reps: '12-15' },
      CINTA,
    ],
  },
  {
    nombre: 'Viernes',
    grupo: 'Hombros + brazos',
    ejercicios: [
      { id: 'press_militar', nombre: 'Press militar', series: 4, reps: '6-10' },
      { id: 'elevaciones_laterales', nombre: 'Elevaciones laterales', series: 4, reps: '12-20' },
      { id: 'posterior_maquina_pajaros', nombre: 'Posterior en máquina o pájaros', series: 3, reps: '15-20' },
      { id: 'encogimientos', nombre: 'Encogimiento de hombros', series: 3, reps: '12' },
      { id: 'face_pull', nombre: 'Face pull', series: 3, reps: '15-20' },
      { id: 'curl_inclinado', nombre: 'Curl inclinado', series: 3, reps: '10-12' },
      { id: 'triceps_polea', nombre: 'Tríceps en polea', series: 3, reps: '12-15' },
      { id: 'curl_muneca', nombre: 'Curl de muñeca o antebrazo', series: 2, reps: '15-20' },
      CINTA,
    ],
  },
  {
    nombre: 'Sábado',
    grupo: 'Piernas: glúteo + abs',
    ejercicios: [
      {
        id: 'bulgara_gluteo',
        nombre: 'Bulgarian split squat',
        series: 2,
        reps: '15',
        nota: 'Para glúteo. Lo detesto tanto que lo tengo que hacer.',
      },
      { id: 'peso_muerto_rumano', nombre: 'Peso muerto rumano', series: 3, reps: '8-12' },
      { id: 'hip_thrust', nombre: 'Hip thrust', series: 4, reps: '8-12' },
      { id: 'abductora', nombre: 'Máquina abductora', series: 4, reps: '15-20', nota: 'Abriendo piernas.' },
      { id: 'patada_gluteo_polea', nombre: 'Patada de glúteo en polea', series: 3, reps: '12-15', nota: 'Por pierna.' },
      { id: 'curl_femoral', nombre: 'Curl femoral', series: 3, reps: '12-15' },
      {
        id: 'abduccion_banda',
        nombre: 'Abducción con banda caminando de costado',
        series: 2,
        reps: '15',
        nota: 'Por lado.',
      },
      ...ABS,
    ],
  },
  {
    nombre: 'Domingo',
    grupo: 'Descanso',
    ejercicios: [],
    descanso: 'Hoy no se entrena. Caminá, estirá, movete suave y recuperate para el lunes.',
  },
];
