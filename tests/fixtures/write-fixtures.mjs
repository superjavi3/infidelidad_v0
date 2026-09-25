/*
 * Escribe los tres chats sintéticos como exports de WhatsApp para probar la
 * web a mano: `npm run fixtures` y sube cualquiera de tests/fixtures/chats/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateChat, toWhatsAppTxt } from './synthetic-chats.mjs';

const dir = new URL('./chats/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const kind of ['sano', 'enfriandose', 'terminado']) {
  const file = new URL(`chat-${kind}.txt`, dir);
  writeFileSync(file, toWhatsAppTxt(generateChat(kind)));
  console.log('escrito', file.pathname);
}
