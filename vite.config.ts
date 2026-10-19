import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const PUBLIC_DIR = resolve(import.meta.dirname, 'public');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Genera dist/sw.js con la lista de todos los archivos del build para
 * precachearlos. El nombre del caché lleva un hash del contenido, así que
 * cada build nuevo reemplaza al anterior en el teléfono.
 */
function serviceWorker(): Plugin {
  return {
    name: 'rutina-service-worker',
    apply: 'build',
    enforce: 'post',
    writeBundle(options, bundle) {
      const hash = createHash('sha256');
      const files = new Set<string>();

      for (const [fileName, item] of Object.entries(bundle)) {
        files.add(fileName);
        hash.update(fileName);
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const full of listFiles(PUBLIC_DIR)) {
        const fileName = relative(PUBLIC_DIR, full).replaceAll('\\', '/');
        files.add(fileName);
        hash.update(fileName);
        hash.update(readFileSync(full));
      }

      const assets = ['./', ...[...files].sort().map((f) => `./${f}`)];
      const version = hash.digest('hex').slice(0, 10);
      const template = readFileSync(resolve(import.meta.dirname, 'src/sw.template.js'), 'utf8');
      const sw = template
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(assets, null, 2));

      writeFileSync(join(options.dir!, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  // Rutas relativas: funciona igual en la raíz de un dominio o en una subcarpeta.
  base: './',
  plugins: [serviceWorker()],
});
