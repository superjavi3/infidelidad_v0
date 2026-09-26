# YaLoSabía · Cómo funciona todo

Guía de negocio y operación: qué vendemos, qué servicios usamos, cómo se mueve un cliente de principio a fin, cómo medimos, cómo publicamos y qué queda pendiente. La guía técnica para programar está en `CLAUDE.md`.

Actualizado: 26 de septiembre de 2026.

---

## 1. Qué es

**YaLoSabía** convierte el chat de WhatsApp de una pareja en **«su diario»**: un PDF de 14 páginas con la historia de su relación. Tiene 8 capítulos: cómo empezó todo, quién es quién, cómo se hablan, compatibilidad, las señales, ¿van a durar?, consejos y el mensaje.

| | |
|---|---|
| Web | https://www.yalosabia.com |
| Público | Parejas de México (español de México, «ustedes») |
| Precio | **$199 MXN**, pago único. Hay un 15% de bienvenida durante 30 minutos desde la primera visita. |
| Qué es gratis | El adelanto: índice de la relación (0-100), 3 datos, un dato curioso y el índice de capítulos. Se calcula en el teléfono. |
| Qué se paga | El PDF completo. Los capítulos IV–VIII los escribe la IA (Google Gemini). |
| Regla de producto | **Un pago = un diario**: cada pago vale para el chat con el que se pagó. Solo parejas (grupos de 3+ muestran un aviso). |
| Estilo | «Diario íntimo»: papel rayado rosa, margen rojo, letra a mano (Caveat) y máquina de escribir (Courier Prime). Sin emojis, sin tono de IA, sin cifras inventadas. |
| Tono | Cercano y honesto. «No es para acusar a nadie.» Nunca se habla de infidelidad. |

---

## 2. Servicios que usamos

| Servicio | Para qué | Cuenta / dato clave | Quién lo toca |
|---|---|---|---|
| **Namecheap** | Dominio yalosabia.com, DNS y correo `contacto@yalosabia.com` (Private Email, webmail en privateemail.com) | DNS `registrar-servers.com` | Javi |
| **Vercel** | Aloja la web y las APIs. Cada push crea una preview; `main` va a producción. Variables de entorno. | Proyecto del repo `infidelidad_v0` | Javi (variables), Claude (código) |
| **GitHub** | Código | `superjavi3/infidelidad_v0` | Claude vía PR, Javi aprueba |
| **Stripe** | Cobros en **modo live**, códigos de descuento de un solo uso (cupón `YLS15`) y webhook de reembolsos y disputas | Cuenta «YaLoSabía.com» | Javi |
| **Google Gemini** | Escribe los capítulos del diario (gemini-2.5-flash). Solo recibe una muestra de ~300 mensajes. | `GEMINI_API_KEY` | — |
| **Supabase** | Solo para los links compartidos **antiguos** (`/a/...`). La web ya no crea links. | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | — |
| **PostHog** | Analítica: visitas, embudo y origen de cada visita | Proyecto `phc_TkTrcz…` (us.posthog.com) | Javi (login) |
| **Meta Business Suite** | Página de Facebook «Ya lo sabía App», Instagram `yalosabiaapp`, publicaciones y mensajes | Portfolio **YaloSabía** (business_id 740081945708518), página 1077889492066752 | Javi / Claude |
| **Meta Ads** | Anuncios | Cuenta **MVP** 788285070542304 (MXN, la activa). Cuenta personal «Yalosabía App» 26120048234342856 (EUR, **desactivada**, con €140 retenidos). | Javi / Claude |
| **Píxel de Meta** | Mide visitas, adelantos, pagos | «Market data» 1580141019940219 (el de las campañas) y «Pixel2» 1867438827762719. La web manda a los dos. | — |
| **API de conversiones de Meta** | Manda las compras desde el servidor (código listo) | Falta `META_CAPI_TOKEN` | Javi |
| **Pinterest** | Pines con enlaces a la web (tráfico de búsqueda) | Cuenta de empresa **yalosabiaapp**, 4 tableros | Claude |
| **TikTok** | Vídeos cortos | Pendiente de crear o conectar la cuenta | Javi |
| **Google Fonts / cdnjs** | Letras y librerías de la web (JSZip, html2canvas, jsPDF) | — | — |
| **Metricool** (propuesto) | Programar redes a meses vista (Meta solo deja 29 días) | No contratado | Javi |

### Panel interno

`https://www.yalosabia.com/panel.html` reúne ventas y origen (Stripe), el embudo y las visitas por origen (PostHog) y el gasto en Meta. Pide una clave (`PANEL_KEY` en Vercel).

---

## 3. El recorrido de un cliente

```
Anuncio / post / pin / TikTok (con UTM)
  → yalosabia.com (se guarda de dónde vino: utm, fbclid o web de origen)
  → barra del 15% con su código YLS-XXXXX (30 minutos reales)
  → exporta su chat de WhatsApp («Más › Exportar chat › Sin archivos»)
  → sube el .txt o .zip (se lee en el teléfono, no se envía nada)
  → ADELANTO GRATIS: índice 0-100, 3 datos, dato curioso, índice de capítulos cerrado
  → muro de pago: escribe su email → Stripe Checkout ($199, o $169.15 con el 15%)
       (antes de salir, el chat se guarda en el navegador para no tener que subirlo otra vez)
  → vuelve de Stripe → la web comprueba el pago con el servidor
  → «¡Listo!» → «Descargar mi diario (PDF)»
       → los mensajes de texto van al servidor, que comprueba pago + huella del chat
       → Gemini escribe los capítulos → el PDF se monta en el navegador y se descarga
  → opcional: comparte su índice en Stories
```

**Otro dispositivo:** el acceso vive en el navegador donde se pagó. Desde otro teléfono hay que volver a abrir el enlace de éxito de Stripe (no hay «recuperar mi diario» por email).

**Soporte:** `contacto@yalosabia.com`. Los reembolsos se hacen a mano en Stripe y quitan el acceso al momento.

---

## 4. Cómo protegemos el pago

- **Stripe es la única fuente de verdad.** No hay base de datos de compras: el navegador guarda el `session_id` y el servidor lo comprueba siempre contra Stripe.
- **Huella del chat.** Al pagar se guarda en Stripe una huella SHA-256 de los mensajes. El servidor solo escribe el diario si la huella de los mensajes que recibe coincide con la de ese pago. Así, pagar una vez no sirve para cualquier chat.
- **Un pago = un PDF.** La IA escribe el diario una sola vez por pago (con 15 minutos para reintentar si algo falla). El PDF se puede volver a descargar en el mismo navegador sin gastar otro. Si alguien lo pierde, soporte borra el contador `diary_count` del pago en Stripe.
- **Reembolsos y disputas.** Si una sesión tiene un reembolso (aunque sea parcial) o una disputa, se niega el diario (402/403) y no se llama a Gemini.
- **Qué no se puede tocar.** Nada que cambie cómo se calcula esa huella: si no, los chats ya pagados dejan de funcionar. `CLAUDE.md` tiene la lista exacta de funciones congeladas.

---

## 5. Cómo medimos

| Paso | PostHog (evento) | Meta (píxel) | Stripe |
|---|---|---|---|
| Visita | `$pageview` + `first_source` | PageView (solo con cookies aceptadas) | — |
| Sube chat | `chat_uploaded` | ChatUploaded | — |
| Ve el adelanto | `preview_shown` | ViewContent | — |
| Va a pagar | `checkout_started` | InitiateCheckout | sesión creada con `src_source`, `src_campaign`… |
| Paga | `purchase` (una sola vez) | Purchase (+ servidor si hay token) | pago con el origen en metadata |

- **Origen:** la primera visita guarda utm_source/campaign/content o, si viene de Facebook/Instagram sin UTM, «facebook» por el `fbclid`. Va en cada evento de PostHog y en cada pago de Stripe.
- **UTMs en uso:**
  - anuncio de Meta: `utm_source=meta&utm_medium=paid&utm_campaign=ventas_mx`
  - pines: `utm_source=pinterest&utm_campaign=q4_XX`
- **Ojo:** el píxel de Meta solo carga si aceptan «todas» las cookies, así que Meta ve menos de lo que pasa.

---

## 6. Marketing: qué está en marcha

### Facebook e Instagram (orgánico)

- **Publicado:** 4 posts (¿Y la tuya?, Esto es lo que ves gratis, exportar en Android, exportar en iPhone).
- **Programado** en Business Suite: del 26 sep al 24 oct, casi un post al día a las 19:00 (algunos días dos). Son capítulos, preguntas frecuentes, temporada y «ganchos».
- **Preparado sin programar:** calendario del **25 oct al 31 dic**, 37 posts. Incluye Halloween, Muertos, Buen Fin, Black Friday, aguinaldo, Navidad y Año Nuevo, y 5 posts de debate. Está en `Descargas/YaLoSabia-calendario-oct-dic` (CSV + imágenes).
  - Meta solo deja programar 29 días por delante: se carga por tandas o con Metricool.
- **Regla:** ninguna imagen con el precio antiguo ($129) ni con «llega por email». El diario se descarga, no se envía.

### Anuncios de Meta (cuenta MVP)

- **«YaLoSabía Ventas MX»** (ventas, optimizada a compra y luego a «Ver contenido»): MX$403 gastados y ninguna venta registrada. **Hay que apagarla.**
- **Plan:** campaña de **tráfico / clics en el enlace**, México, 18-34 años, MX$150/día, 4 anuncios de la carpeta «ganchos 2». Revisar a los 5 días:
  - clic por encima de ~MX$5 → cambiar creatividades;
  - clics sin chats subidos → el problema es la landing.
- **Referencia:** la campaña de clics de marzo consiguió 599 clics con €15,55.

### Pinterest

Cuenta de empresa **yalosabiaapp** con 4 tableros (Navidad en pareja, Relaciones de pareja, Guías y tutoriales, Frases y citas de amor) y 10 pines con títulos para buscador y enlace con UTM. Pinterest posiciona el contenido de temporada con 4-6 semanas de antelación.

### TikTok

5 vídeos listos (13-18 s, 1080×1920) en `Descargas/YaLoSabia-tiktoks`, con sus textos y hashtags:
1. POV: la IA lee su chat
2. Lo que su chat sabe
3. Debate: el audio de 4 minutos
4. Red flags de Halloween
5. Cómo funciona

Van sin música: se añade un sonido de tendencia al subirlos.

---

## 7. Cómo se trabaja en el código

1. Cada cambio va en una **rama** y un **PR** en GitHub. Vercel crea una preview automática.
2. Se prueba:
   - `npm run preview:static` → web sin Stripe ni Gemini, con datos de ejemplo;
   - `npm run check:html` → que el JavaScript de la web no tenga errores;
   - `npx tsc --noEmit` → que el TypeScript compile.
3. Javi dice «fusiona» → se fusiona a `main` → producción.
4. `CLAUDE.md` se actualiza con cada cambio importante.
5. **Stripe está en modo real**: probar un pago cobra de verdad. Para probar con acceso se usa el preview estático.

### Variables de entorno (Vercel)

| Variable | Para qué | Estado |
|---|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Cobros y webhook | Puestas |
| `GEMINI_API_KEY` | IA del diario | Puesta |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Links antiguos | Puestas |
| `NEXT_PUBLIC_APP_URL` | URL base | Puesta |
| `OFFER_SECRET` (opcional), `OFFER_DISABLED=1` para apagar el 15% | Oferta | Opcional |
| `PANEL_KEY` | Clave del panel | **Falta** |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` | Embudo en el panel | **Falta** |
| `META_ADS_TOKEN` | Gasto de Meta en el panel | **Falta** |
| `META_CAPI_TOKEN` | Compras a Meta desde el servidor | **Falta** |

---

## 8. Revisión de código (26 sep 2026)

Se revisaron el código, la web publicada y la seguridad. Arreglado en el PR «Revisión de código»:

**Seguridad**
- Cualquiera podía crear una página `yalosabia.com/a/...` con código propio. Se cerró la creación y se limpia el HTML de los links antiguos.
- La ruta de la IA ya no se puede tumbar con un archivo comprimido gigante.
- La ruta de la IA comprueba el pago sin caché, así que un reembolso quita el acceso al momento.
- La ruta de la IA tiene timeout y no enseña errores internos.
- Cabeceras de seguridad en toda la web.
- Fuera `/api/track` (roto y público) y las herramientas de mockups que estaban publicadas.

**Dinero**
- Precios por país que estaban mal:
  - Guatemala cobraba Q4.99 (~US$0.65);
  - Paraguay, ₲4,990,000 (~US$600);
  - Costa Rica, Dominicana, Honduras y Nicaragua, céntimos;
  - Colombia y Argentina mostraban un precio 100 veces mayor.
- El checkout ya no cobra en dólares a un mexicano si falla el código de descuento, y valida el email.

**Web**
- ~650 KB de librerías ya no bloquean la primera carga.
- `/` ya no redirige.
- Las imágenes se guardan en caché.
- El diario guardado en el navegador podía confundir dos chats de las mismas personas. Arreglado.
- Una misma venta ya no se cuenta dos veces si se reabre el enlace de Stripe.
- PostHog no graba sesiones ni lee el adelanto.
- El texto de privacidad decía que el chat nunca sale del teléfono; el diario completo sí pasa por el servidor, aunque no se guarda. Corregido.
- ~200 líneas de código muerto y 3 dependencias sin usar fuera.
- **Un pago = un PDF** (contador en Stripe) y **chats de móviles en inglés** (fechas mes/día bien leídas; «I love you» cuenta como «te quiero»).

---

## 9. Pendientes

### Urgente (cuesta dinero)
1. Apagar «YaLoSabía Ventas MX» y lanzar la campaña de clics.

### Solo Javi (contraseñas, claves, ajustes, legal)
2. Edge: que no suspenda `business.facebook.com` ni `adsmanager.facebook.com` (Configuración › Sistema y rendimiento › Pestañas en suspensión). Así Claude puede trabajar en Meta sin tener la pestaña delante.
3. Vercel: `PANEL_KEY`, `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`, `META_ADS_TOKEN`, `META_CAPI_TOKEN`.
4. Meta:
   - verificación del negocio (avisa de que cortará los anuncios);
   - soporte por los €140 de la cuenta personal.
5. Stripe:
   - añadir `charge.refunded` y `charge.dispute.created` al webhook;
   - cambiar el nombre público «LoSabía» → «YaLoSabía» (el extracto dice «LOSABIA PLAN PREMIUM»);
   - revisar si hay métodos de pago diferidos activos (OXXO).
6. Legal y fiscal:
   - banner de cookies: PostHog hoy carga sin consentimiento, aunque el banner dice lo contrario, y el píxel sí espera;
   - IVA con el contador;
   - Vercel Pro (el plan gratis no permite uso comercial).
7. TikTok: crear o conectar la cuenta.

### Claude, cuando tenga acceso
8. Programar el calendario del 25 oct al 31 dic (por tandas o con Metricool).
9. Subir los 5 TikToks.
10. Pinterest:
    - reclamar el dominio (etiqueta en la web);
    - foto de perfil;
    - más pines (hay 20+ en la carpeta).
11. Revisar la campaña nueva a los 5 días.

### Producto y web (decisiones abiertas)
13. **Espera artificial de 4-7 s** antes del adelanto: probar a quitarla.
15. **Rate limiting** (Vercel Firewall) en checkout, oferta y panel.
16. **La oferta del 15%** se puede reiniciar en incógnito: valorar una cookie o suavizar el texto.
17. **Recuperar mi diario por email** (otro dispositivo).
18. **Prueba real de pago + reembolso** de principio a fin (nunca se ha hecho).
19. **Links antiguos `/a/...`:** retirarlos del todo o actualizar su estética.
20. **Imágenes con $129** que quedan en las carpetas (anuncios A14, A15, B10 y pines de Buen Fin, aguinaldo…): rehacer con $199.
21. **Prueba a ciegas** del PDF con Gemini frente a Claude.

---

## 10. Historial

- **Feb 2026:** MVP con planes Curioso/Detective/Obsesivo (análisis «forense» del chat).
- **Sep 2026:**
  - rediseño «Querido diario»: el producto pasa a ser el PDF;
  - pago verificado en servidor y «un pago = un diario»;
  - precio de $129 a $199 con oferta del 15%;
  - píxeles y medición por origen;
  - redes (Facebook, Instagram, Pinterest) y primera campaña de Meta;
  - panel interno;
  - revisión completa de código.
