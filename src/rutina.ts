// ─────────────────────────────────────────────────────────────
//  TU RUTINA
//  Editá este archivo para cambiar ejercicios, series o repeticiones.
//  Después corré `npm run build` y volvé a subir la carpeta dist/.
//
//  Cada ejercicio:
//    nombre  → lo que se lee en grande
//    series  → series × repeticiones (texto libre: "4×6-10", "10 min"…)
//    nota    → opcional, texto chico debajo del nombre
// ─────────────────────────────────────────────────────────────

export interface Ejercicio {
  nombre: string;
  series: string;
  nota?: string;
}

export interface Dia {
  nombre: string;
  grupo: string;
  nota?: string;
  ejercicios: Ejercicio[];
  /** Si está, el día se muestra como descanso (con este texto). */
  descanso?: string;
}

// Bloque de abdominales que se repite miércoles y sábado.
// Si lo cambiás acá, cambia en los dos días.
const ABS: Ejercicio[] = [
  {
    nombre: 'Elevación de piernas en silla romana',
    series: '3×10-15',
    nota: 'Apoyado como hacés. Subí la pelvis al final, no solo las piernas.',
  },
  { nombre: 'Crunch en polea alta de rodillas', series: '3×10-15', nota: 'Con peso. Acá va la progresión.' },
  { nombre: 'Rueda abdominal', series: '3×8-12' },
  { nombre: 'Pallof press', series: '3×10-12', nota: 'Por lado, subiendo peso.' },
];

const CINTA: Ejercicio = { nombre: 'Cinta', series: '10 min' };

// El orden es fijo: lunes primero, domingo último.
export const RUTINA: Dia[] = [
  {
    nombre: 'Lunes',
    grupo: 'Pecho + tríceps',
    ejercicios: [
      { nombre: 'Press plano con barra o mancuernas', series: '4×6-10' },
      { nombre: 'Press inclinado con mancuernas', series: '3×8-12' },
      { nombre: 'Aperturas en polea, mancuerna o máquina', series: '3×12-15', nota: 'Lo que haya libre.' },
      { nombre: 'Fondos o press cerrado', series: '3×8-12' },
      { nombre: 'Extensión en polea con soga', series: '3×12-15' },
      { nombre: 'Mancuerna por atrás de la cabeza', series: '3×12-15' },
      CINTA,
    ],
  },
  {
    nombre: 'Martes',
    grupo: 'Espalda + bíceps',
    ejercicios: [
      { nombre: 'Dominadas', series: '2-3 series', nota: 'Calentamiento. Las que pueda.' },
      { nombre: 'Jalón al pecho', series: '4×6-12' },
      { nombre: 'Remo con barra o T', series: '4×8-12' },
      { nombre: 'Remo en polea baja', series: '3×10-12' },
      { nombre: 'Pullover en polea', series: '2×12-15' },
      { nombre: 'Curl con barra', series: '3×8-12' },
      { nombre: 'Curl martillo', series: '3×10-12' },
      { nombre: 'Curl concentrado', series: '3×8-12' },
      CINTA,
    ],
  },
  {
    nombre: 'Miércoles',
    grupo: 'Piernas: cuádriceps + abs',
    ejercicios: [
      { nombre: 'Sentadilla', series: '4×6-10' },
      { nombre: 'Prensa', series: '3×10-12' },
      { nombre: 'Bulgarian split squat', series: '3×10-12', nota: 'Por pierna.' },
      { nombre: 'Extensión de cuádriceps', series: '3×12-15' },
      { nombre: 'Gemelos de pie', series: '3×10-15' },
      ...ABS,
    ],
  },
  {
    nombre: 'Jueves',
    grupo: 'Espalda + pecho',
    nota: 'Más aislamiento, menos peso.',
    ejercicios: [
      { nombre: 'Dominadas', series: '2-3 series', nota: 'Calentamiento. Las que pueda.' },
      { nombre: 'Remo con mancuerna a una mano', series: '3×10-12' },
      { nombre: 'Jalón agarre neutro', series: '3×10-12' },
      { nombre: 'Pullover', series: '3×12-15' },
      { nombre: 'Press inclinado en máquina', series: '3×10-12' },
      { nombre: 'Cruces en polea', series: '3×12-15' },
      { nombre: 'Press para pecho bajo', series: '3×12-15' },
      CINTA,
    ],
  },
  {
    nombre: 'Viernes',
    grupo: 'Hombros + brazos',
    ejercicios: [
      { nombre: 'Press militar', series: '4×6-10' },
      { nombre: 'Elevaciones laterales', series: '4×12-20' },
      { nombre: 'Posterior en máquina o pájaros', series: '3×15-20' },
      { nombre: 'Encogimiento de hombros', series: '3×12' },
      { nombre: 'Face pull', series: '3×15-20' },
      { nombre: 'Curl inclinado', series: '3×10-12' },
      { nombre: 'Tríceps en polea', series: '3×12-15' },
      { nombre: 'Curl de muñeca o antebrazo', series: '2×15-20' },
      CINTA,
    ],
  },
  {
    nombre: 'Sábado',
    grupo: 'Piernas: glúteo + abs',
    ejercicios: [
      {
        nombre: 'Bulgarian split squat',
        series: '2×15',
        nota: 'Para glúteo. Lo detesto tanto que lo tengo que hacer.',
      },
      { nombre: 'Peso muerto rumano', series: '3×8-12' },
      { nombre: 'Hip thrust', series: '4×8-12' },
      { nombre: 'Máquina abductora', series: '4×15-20', nota: 'Abriendo piernas.' },
      { nombre: 'Patada de glúteo en polea', series: '3×12-15', nota: 'Por pierna.' },
      { nombre: 'Curl femoral', series: '3×12-15' },
      { nombre: 'Abducción con banda caminando de costado', series: '2×15', nota: 'Por lado.' },
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
