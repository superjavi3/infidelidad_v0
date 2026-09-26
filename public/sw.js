// Service worker de YaLoSabía. Solo sirve para una cosa: recibir el chat que se comparte
// desde WhatsApp (Exportar chat › Compartir › YaLoSabía) cuando la web está instalada en Android.
// El archivo se guarda un momento en la caché del propio teléfono y la página lo abre y lo borra.
// No cachea nada más: la web siempre se carga de la red.
const SHARE_CACHE = 'yls-share';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return;
  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const file = form.getAll('chat').find(f => f && typeof f !== 'string');
      if (!file) return Response.redirect('/?shared=0', 303);
      const cache = await caches.open(SHARE_CACHE);
      await cache.put('/shared-chat', new Response(file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name || 'chat.txt'),
        },
      }));
      return Response.redirect('/?shared=1', 303);
    } catch (e) {
      return Response.redirect('/?shared=0', 303);
    }
  })());
});
