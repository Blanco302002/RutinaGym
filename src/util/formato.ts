const NUMERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** 52.5 → "52,5" */
export function numero(n: number): string {
  return NUMERO.format(n);
}

/** "52,5" o "52.5" → 52.5 (NaN si no es un número). */
export function leerNumero(texto: string): number {
  return Number(texto.trim().replace(',', '.'));
}

/** Plural simple: plural(2, 'serie') → "2 series". */
export function plural(n: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

export function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Para buscar sin importar mayúsculas ni tildes. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
