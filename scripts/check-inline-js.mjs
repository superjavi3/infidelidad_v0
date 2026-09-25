// Comprueba la sintaxis de cada <script> en línea de un HTML (por defecto public/index.html).
// Uso: npm run check:html
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'public/index.html';
const src = readFileSync(file, 'utf8');
const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
let m, count = 0, errors = 0;

while ((m = re.exec(src))) {
  const attrs = m[1] || '';
  if (/src=|application\/ld\+json/.test(attrs)) continue;
  count++;
  try {
    new Function(m[2]);
  } catch (e) {
    errors++;
    const line = src.slice(0, m.index).split('\n').length;
    console.error(`Script #${count} (línea ${line}): ${e.message}`);
  }
}

console.log(`${count} scripts revisados, ${errors} con errores`);
process.exit(errors ? 1 : 0);
