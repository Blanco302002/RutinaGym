// Fechas como texto AAAA-MM-DD en hora local. Nunca toISOString(): usa UTC
// y a la noche cambiaría de día.

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA_MS = 24 * 60 * 60 * 1000;

/** 0 = lunes … 6 = domingo. */
export function indiceDia(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

export function fechaTexto(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

export function deTexto(texto: string): Date {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(texto: string, dias: number): string {
  const f = deTexto(texto);
  return fechaTexto(new Date(f.getFullYear(), f.getMonth(), f.getDate() + dias));
}

/** Lunes de la semana de `fecha` (la semana arranca el lunes). */
export function lunesDe(fecha: Date): string {
  return fechaTexto(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - indiceDia(fecha)));
}

/** Días enteros entre dos fechas AAAA-MM-DD (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((deTexto(b).getTime() - deTexto(a).getTime()) / DIA_MS);
}

/** "19 oct" */
export function fechaCorta(texto: string): string {
  const f = deTexto(texto);
  return `${f.getDate()} ${MESES[f.getMonth()]}`;
}

/** "Lunes 19 oct" (agrega el año si no es el actual). */
export function fechaLarga(texto: string, hoy = new Date()): string {
  const f = deTexto(texto);
  const anio = f.getFullYear() === hoy.getFullYear() ? '' : ` ${f.getFullYear()}`;
  return `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}${anio}`;
}
