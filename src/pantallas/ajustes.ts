// Ajustes: tema y respaldo de datos (exportar / importar JSON).

import { catalogoDeRutina } from '../dominio/catalogo';
import { validarRespaldo } from '../dominio/respaldo';
import { elegirTema, temaActual, type Tema } from '../tema';
import { fechaTexto } from '../util/fechas';
import { plural } from '../util/formato';
import { cabecera } from '../ui/componentes';
import type { Contexto, Pantalla } from '../ui/contexto';
import { icono, type NombreIcono } from '../ui/iconos';

const TEMAS: [Tema, string, NombreIcono][] = [
  ['auto', 'Auto', 'auto'],
  ['claro', 'Claro', 'sun'],
  ['oscuro', 'Oscuro', 'moon'],
];

let mensaje: { texto: string; error?: boolean } | undefined;

async function crearArchivoRespaldo(ctx: Contexto): Promise<File> {
  const respaldo = await ctx.repos.respaldo.exportar();
  const nombre = `rutina-respaldo-${fechaTexto(new Date())}.json`;
  return new File([JSON.stringify(respaldo, null, 2)], nombre, { type: 'application/json' });
}

/**
 * En el iPhone abre la hoja de compartir ("Guardar en Archivos", AirDrop…).
 * El archivo ya viene armado: Safari solo deja compartir si se llama
 * directo desde el toque, sin esperas de por medio.
 */
function exportar(archivo: File): void {
  const descargar = () => {
    const url = URL.createObjectURL(archivo);
    Object.assign(document.createElement('a'), { href: url, download: archivo.name }).click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  if (navigator.canShare?.({ files: [archivo] })) {
    navigator.share({ files: [archivo], title: 'Respaldo de Rutina' }).catch((e: DOMException) => {
      if (e.name !== 'AbortError') descargar();
    });
  } else {
    descargar();
  }
}

async function importar(ctx: Contexto, archivo: File): Promise<void> {
  let datos: unknown;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    mensaje = { texto: 'No se pudo leer el archivo: no es un JSON válido.', error: true };
    return;
  }
  const respaldo = validarRespaldo(datos);
  if (typeof respaldo === 'string') {
    mensaje = { texto: respaldo, error: true };
    return;
  }

  const actuales = await ctx.repos.respaldo.contar();
  if (actuales.sesiones + actuales.series > 0) {
    const ok = confirm(
      `Esto reemplaza TODOS tus datos actuales (${plural(actuales.sesiones, 'sesión', 'sesiones')}, ` +
        `${plural(actuales.series, 'serie')}) por los del archivo ` +
        `(${plural(respaldo.sesiones.length, 'sesión', 'sesiones')}, ${plural(respaldo.series.length, 'serie')}).\n\n¿Seguir?`,
    );
    if (!ok) return;
  }
  await ctx.repos.respaldo.importar(respaldo);
  await ctx.repos.ejercicios.sincronizar(catalogoDeRutina());
  mensaje = {
    texto: `Listo: importadas ${plural(respaldo.sesiones.length, 'sesión', 'sesiones')} y ${plural(respaldo.series.length, 'serie')}.`,
  };
}

export const pantallaAjustes: Pantalla = async (contenedor, ctx) => {
  const [{ sesiones, series }, archivo] = await Promise.all([ctx.repos.respaldo.contar(), crearArchivoRespaldo(ctx)]);
  const tema = temaActual();

  contenedor.innerHTML = `
    ${cabecera({ titulo: 'Ajustes', etiqueta: 'Rutina' })}
    <main class="container contenido">
      <section class="ajuste">
        <h2 class="seccion-titulo">Tema</h2>
        <div class="segmentado" role="radiogroup" aria-label="Tema">
          ${TEMAS.map(
            ([valor, texto, ic]) => `
            <button type="button" role="radio" class="segmento ${tema === valor ? 'activo' : ''}"
                    aria-checked="${tema === valor}" data-tema="${valor}">${icono(ic)}<span>${texto}</span></button>`,
          ).join('')}
        </div>
      </section>

      <section class="ajuste">
        <h2 class="seccion-titulo">Tus datos</h2>
        <p class="ajuste-texto">${plural(sesiones, 'sesión', 'sesiones')} y ${plural(series, 'serie')} guardadas en este teléfono.
          Exportá un respaldo cada tanto y guardalo en Archivos.</p>
        ${mensaje ? `<p class="mensaje ${mensaje.error ? 'mensaje--error' : ''}" role="status">${mensaje.texto}</p>` : ''}
        <div class="ajuste-botones">
          <button type="button" class="btn-grande" data-accion="exportar">${icono('download')}<span>Exportar</span></button>
          <button type="button" class="btn-grande" data-accion="importar">${icono('upload')}<span>Importar</span></button>
        </div>
        <input type="file" accept="application/json,.json" class="d-none" data-archivo>
      </section>
    </main>`;
  mensaje = undefined;

  const input = contenedor.querySelector<HTMLInputElement>('[data-archivo]')!;
  input.addEventListener('change', async () => {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    await importar(ctx, archivo);
    ctx.refrescar();
  });

  contenedor.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-tema]');
    if (!el) return;
    if (el.dataset.tema) {
      elegirTema(el.dataset.tema as Tema);
      ctx.refrescar();
    } else if (el.dataset.accion === 'exportar') {
      exportar(archivo);
    } else if (el.dataset.accion === 'importar') {
      input.click();
    }
  });
};
