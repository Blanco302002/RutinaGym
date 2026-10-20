// Aplica el tema de color: solo cambia data-tema en <html>; los colores
// salen del CSS generado desde src/temas-color.ts.

import { COLOR_POR_DEFECTO, esColorValido } from '../temas-color';

export function aplicarColor(id: string): void {
  document.documentElement.dataset.tema = esColorValido(id) ? id : COLOR_POR_DEFECTO;
}
