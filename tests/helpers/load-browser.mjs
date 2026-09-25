/*
 * Carga los scripts de public/js en un contexto vm con un window falso, en el
 * mismo orden que index.html. Así se prueban tal cual se sirven al navegador.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function loadBrowserScripts(files) {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  for (const f of files) {
    const src = readFileSync(new URL('../../public/js/' + f, import.meta.url), 'utf-8');
    vm.runInContext(src, sandbox, { filename: f });
  }
  return sandbox;
}

/* Los objetos creados dentro del vm llevan el prototipo de ese realm y
   deepEqual los rechazaría. wire() los pasa por JSON. */
export const wire = (v) => JSON.parse(JSON.stringify(v));
