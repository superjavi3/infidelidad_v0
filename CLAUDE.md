# YaLoSabía — contexto del proyecto

> Guía de negocio (servicios, recorrido del cliente, marketing, pendientes): `docs/GUIA-YALOSABIA.md`.

Web que convierte un chat de WhatsApp de pareja en **«su diario»**: un PDF de 14 páginas con la historia de la relación. Público: México (español de México, «ustedes», nunca «vosotros»). Producción: https://www.yalosabia.com (repo `superjavi3/infidelidad_v0`; «el proyecto de infidelidad» para el dueño, Javi).

## El producto (decidido en septiembre de 2026)

- **El producto es el PDF.** La web solo enseña un adelanto y vende. Nada de capítulos, gráficas ni chatbot en la web.
- **Un solo precio:** $199 MXN (antes $129; subido el 25 sep 2026), pago único (otros países: `app/api/pricing/route.ts`).
- **Un pago = un diario:** cada pago vale para el chat con el que se pagó.
- **Solo parejas:** un chat con 3+ personas muestra un aviso. El modo grupo se eliminó.
- **Chats cortos:** con menos de 300 mensajes de texto (`DIARY_MIN_MSGS`, cuenta `isRealText`) se enseña el adelanto pero no se vende el diario (`#diaryTooShort`, `openPayModal` no abre); entre 300 y 1.000 (`DIARY_SHORT_MSGS`) se vende con aviso de que algunos capítulos saldrán breves. Evento `chat_short`. Con menos de 10 mensajes ni siquiera hay adelanto.
- **Estética «diario íntimo»:** papel rayado rosa, margen rojo, Caveat (a mano) + Courier Prime, rojo boli `#C8102E` (persona A) y tinta azul `#1F3A93` (persona B), polaroids, cinta washi.
- **Sin emojis ni tono «de IA»** en la web ni en el PDF (Javi lo pidió expresamente). Todo texto de IA o del chat pasa por `stripEmoji()`; el prompt lo prohíbe.
- Nada de cifras o testimonios de relleno (se quitaron «+12,000 chats», contador aleatorio, percentiles inventados).

## Flujo

1. Landing → sube el `.txt`/`.zip` exportado de WhatsApp (se procesa en el navegador).
2. Adelanto gratis: índice de la relación (0-100), 3 datos, un dato curioso y el índice de 8 capítulos cerrado → **muro de pago**.
3. Pago con Stripe Checkout. Antes de redirigir, el chat se guarda en IndexedDB (solo en el navegador) y se recupera y borra al volver.
4. Con pago: «¡Listo!» + «Descargar mi diario (PDF)». El PDF se genera en el navegador (html2canvas + jsPDF); los capítulos IV–VIII los escribe Gemini.

## Estructura

| Archivo | Qué hace |
|---|---|
| `public/index.html` | **Toda la web** (HTML + CSS + JS vanilla en un archivo, ~4.2k líneas). `app/page.tsx` solo redirige aquí. |
| `app/api/analyze/route.ts` | Único modo: `diary` (Gemini 2.5 Flash). Exige pago verificado y la huella del chat. |
| `app/api/create-checkout/route.ts` | Crea la sesión de Stripe. Exige `chatFp` y lo guarda en `metadata.chat_fp`. |
| `app/api/verify-payment/route.ts` | Comprueba una sesión contra Stripe (pagada, no reembolsada ni disputada). |
| `app/api/stripe-webhook/route.ts` | Solo invalida la caché de pagos en `charge.refunded` / `charge.dispute.created`. |
| `app/api/pricing/route.ts` | Precio por país (cabecera `x-vercel-ip-country`). MX = 19900 centavos. |
| `lib/payments.ts` | `checkSessionPayment()` (Stripe como fuente de verdad, caché 10 min) y `chatFingerprint()`. |
| `app/api/share`, `app/a/[id]` | Links compartidos **antiguos** (Supabase). Solo lectura: el POST devuelve 410 (aceptaba HTML de cualquiera → XSS). `/a/[id]` limpia el HTML guardado (`safeHtml`) y solo acepta imágenes png/jpeg/webp. |
| `lib/money.ts` | `toMajorUnits`/`isZeroDecimal`: única lista de monedas sin decimales de Stripe (CLP, PYG…; COP y ARS **sí** llevan 2 decimales). |
| `public/diario/*.jpg`, `public/og-image.jpg` | Páginas de un diario de ejemplo (chat demo «Laura & Carlos») para el hero y «Así es su diario», e imagen para compartir (1200×630). Si cambia el diseño del PDF, hay que regenerarlas: `buildDiaryPages` + html2canvas a escala 0.8. |
| `tools/mockup-studio.html`, `tools/mockup-capture.html` | Herramientas internas de mockups (ya no se publican). Para usarlas: `node scripts/preview-static.mjs tools 5180`. |
| `next.config.ts` | `/` se sirve como `/index.html` (rewrite, sin redirección), cabeceras de seguridad (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) y caché de 1 día para imágenes. |

### Dentro de `public/index.html` (script principal, por orden)
Parser de WhatsApp (`parseWhatsApp`) → `analyzeMessages` (índice 0-100, `verdict`) → `processChat` → `showResults` (adelanto) → análisis que usa el PDF (`analyzeRelationshipTimeline`, `analyzeSilences`, `analyzeDoubleTexting`, `analyzeMultimedia`, `analyzeDeletedMessages`, `analyzeForensicReconstruction`, `analyzeBeforeVsNow`, `analyzeSelectiveGhosting`, `analyzeLanguageChanges`) → modo demo (`loadDemo`, `generateDemoMessages`; desde sep 2026 la web ya no lo enlaza, solo queda para herramientas internas).
Bloque «PREMIUM PLAN SYSTEM»: precios, estado de pago (`rememberPurchase`, `sessionForChat`, `loadPremiumState`, `revokePremium`, `revalidateStoredPayment`), modal de pago, `checkPaymentSuccess`.
Bloque «DIARIO» (al final): huella del chat, `analyzeMilestones`, `computePeople`, adelanto (`renderLockedIndex`, `refreshDiaryState`), `loadDiaryAI`, IndexedDB, Story (`shareToStories`) y **PDF** (`buildDiaryPages` → 14 páginas, `generatePDF`).
- `computeMoments`: hasta 4 «días que recordar» (primer mensaje, primer «te quiero», día con más mensajes, último «te quiero» o vuelta tras el silencio más largo) con sus mensajes reales; se envían a Gemini para que escriba un texto por momento.
- **Página extra «Una carta para cada uno»** (bonus, después del capítulo VIII, no entra en el índice): la IA devuelve `letters.A` (de A para B) y `letters.B` en la misma llamada de `/api/analyze`; si no vienen (diarios guardados antes), la página no sale. Se anuncia en la caja «Además, incluido» de la portada.
- `verifyQuote`: toda cita que devuelve la IA (perfiles, señales, frases para guardar, mensaje final) solo se pinta si existe **tal cual** en el chat. Si no, se omite.
- `isWaSystem` / `WA_SYSTEM_RE`: avisos automáticos de WhatsApp (cifrado, llamadas, mensajes temporales…). Se excluyen de todo lo que se pinta; el servidor tiene la misma regex para la muestra de la IA.

## Oferta de bienvenida (15%)

> **Desde el 28 sep 2026 el 15% solo se da por correo** (abajo, «Correo»). La oferta de 30 minutos está apagada (`OFFER_ENABLED=1` la vuelve a encender) y la barra de arriba ahora dice «15% de descuento si les mandamos el enlace por correo» y abre el formulario. Lo de abajo describe la oferta antigua.

- Barra fija arriba con un contador de **30 minutos desde la primera visita** y un **código de un solo uso por visitante** (`YLS-XXXXX`). El plazo es real: al acabarse, el servidor ya no aplica el descuento (nada de contadores que se reinician: sería publicidad engañosa).
- `lib/offer.ts`: `/api/offer` firma `{código, caducidad}` con HMAC (clave: `OFFER_SECRET` o, si no existe, derivada de `STRIPE_SECRET_KEY`). Al pagar, `create-checkout` verifica la firma y crea en Stripe el código (`max_redemptions: 1`, `expires_at`) sobre el cupón `YLS15` (15%, lo crea solo si no existe) y lo aplica con `discounts`. Si algo falla, cobra el precio normal.
- En el navegador: `localStorage.yalosabia_offer` (una oferta por navegador; se marca usada al pagar).
- **Apagarla:** `OFFER_DISABLED=1` en Vercel y redeploy. Duración y porcentaje: constantes en `lib/offer.ts` (el texto «15%» de la barra está en `index.html`).

## Códigos de influencers

- En la ventana de pago hay «¿Tienes un código de descuento?»: vale cualquier código de promoción activo de Stripe (también los creados a mano en el panel de Stripe) salvo los `YLS-XXXXX`. Stripe no deja aplicar un descuento y a la vez enseñar su propio campo de códigos, por eso el campo está en la web. Eventos `code_applied`/`code_invalid`; con código del 100% la vuelta de Stripe cuenta `free_diary` (no `purchase`) y no se manda a Meta.
- **Códigos del 100%**: el total queda en 0, Stripe no pide tarjeta y la sesión termina con `payment_status = no_payment_required`, que `checkSessionPayment` acepta como pagada.
- Enlace `yalosabia.com/?c=CODIGO`: el navegador guarda el código 30 días (`localStorage.yalosabia_ref`, manda el último enlace), `/api/ref` comprueba en Stripe que existe y la web enseña el precio con descuento en vez de la barra del 15%. Evento `ref_landing` y propiedad `ref_code` en PostHog.
- `create-checkout` lo aplica antes que la oferta de bienvenida y guarda `ref_code`, `influencer` y `ref_commission_mxn` en la sesión. El panel suma ventas y comisión por código. También se puede escribir a mano en la página de pago de Stripe (sin que quede `ref_code`; se ve en los usos del código).
- `lib/ref.ts`: vale cualquier código de promoción activo (porcentaje o importe fijo) menos los `YLS-XXXXX` de la oferta; los de influencers llevan `metadata.influencer` y `commission_mxn`.
- Crear, listar y pausar: `node scripts/influencer-code.mjs crear SOFI20 sofi.y.tomas --pct 20 --comision 50` (cupón `YLSINF20`, multiuso; Stripe live). En el preview, cualquier código `PRUEBA…` vale un 20%.

## Correo: «Háganlo luego» (Brevo)

- Debajo de la zona de subida (y un enlace en la portada móvil) hay un formulario para quien no tiene el chat a mano: correo + casilla de consentimiento (sin marcar). `/api/lead` → `lib/brevo.ts`: guarda el contacto en la lista «Leads web» (la crea si no existe; o `BREVO_LIST_ID`) con `FUENTE`, `ORIGEN`, `CONSENTIMIENTO` y manda al momento el E0 (enlace + tutorial). Sin `BREVO_API_KEY` en Vercel devuelve 503 y la web dice que lo intenten luego.
- E0 al momento; recordatorios E1 (a los 2 días) y E2 (a los 5 días, el último). Diseño y textos en `lib/email-templates.ts`; plantillas de Brevo con `scripts/brevo-plantillas.mjs` (`node scripts/brevo-plantillas.mjs` las crea/actualiza y crea los atributos). Las manda una automatización de Brevo (contacto añadido a la lista → esperas → correo, comprobando que sigue en la lista).
- **15% por dejar el correo**: `/api/lead` crea en Stripe un código `DIARIO-XXXXX` (cupón `YLS15`, un solo uso, caduca a los 7 días: `emailOfferCode` en `lib/offer.ts`), lo guarda en Brevo (`CODIGO`, `CODIGO_CADUCA`) y lo manda en el E0 con un enlace `?c=CODIGO` (se aplica como los códigos de influencers). El código nunca se devuelve a la web: para tenerlo hace falta un correo real. E1/E2 lo recuerdan con `{{ contact.CODIGO }}`. Hay formulario en `#subir`, otro dentro del pie, bajo las redes (`#correo`), y la ventana «¿No tienen el chat exportado?» (`#noChatModal`, `openNoChat`): es un popup «15% de descuento en su diario» que sale **a los 5 s de llegar** (como mucho una vez cada 3 días por navegador, `localStorage.yls_popup_at`; no si ya dejaron el correo, pagaron, traen `?c=`, vuelven de Stripe o de compartir, ya hay un chat u otra ventana abierta), desde el enlace de la portada y, una vez por visita, al cancelar el selector de archivos. `lead_captured` lleva `where` (subir/abajo/sin_chat); eventos `nochat_open` (`from`: timer/hero/cancel) y `nochat_close`.
- **El PDF también por correo**: al descargarlo, `generatePDF` hace a la vez una copia ligera (794 px, JPEG 0,8, ~1 MB) y la manda a `/api/send-diary` (cabeceras `x-session-id`, `x-chat-fp`). El servidor comprueba el pago sin caché y la huella, y la manda por Brevo **solo al correo de la sesión de Stripe**, adjunta; máximo 3 envíos por pago (`pdf_emails` en la metadata, `markPdfEmailed`). El PDF no se guarda. Casilla «Mandármelo también a …» (marcada; `localStorage.yls_pdf_mailed_<sesión>` evita repetir). Eventos `pdf_emailed`, `pdf_email_failed`, `pdf_email_toggle`. El correo del PDF (`emailDiary`) es a propósito sencillo, sin cabecera ni botones, con versión en texto, asunto «El diario de A y B» y firma «Javi, de YaLoSabía»: con el diseño de boletín Gmail lo mandaba a Promociones. Vercel acepta ~4,5 MB por petición (límite 4 MB).
- Quien paga sale de la lista: `/api/verify-payment` llama a `markBuyer` (atributo `COMPRADO`).
- `?tutorial=1` abre el tutorial al cargar (enlace de los correos). Eventos: `lead_form_open`, `lead_captured` (+ `Lead` del píxel), `lead_failed`.
- Carrito abandonado de Stripe: `create-checkout` pide `consent_collection.promotions: 'auto'` y `after_expiration.recovery`; si Stripe lo rechaza, crea la sesión sin eso. Hay que activar los correos de recuperación en el Dashboard de Stripe.
- DNS (Namecheap): Brevo autenticado (`brevo-code`, DKIM `brevo1/brevo2._domainkey`, DMARC, marca `em`), correo de Namecheap Private Email (MX/SPF/DKIM `privateemail`). Remitente: contacto@yalosabia.com.

## Medición

- Píxel de Meta: `PageView`, `ChatUploaded` (custom), `ViewContent` (adelanto visto), `InitiateCheckout`, `Purchase`.
- PostHog (`trackFunnel`): `chat_uploaded`, `preview_shown`, `checkout_started`, `purchase`, `cta_upload_click` (`from`: price/sticky), `sample_page_open` (`from`: landing/paywall), `offer_shown`, `offer_bar_click`, `tutorial_open`/`tutorial_close`, `demo_open`/`demo_exit` (`from`: hero/upload, banner/price), `upload_failed` (`reason`: pocos_mensajes con la forma de la primera línea enmascarada, grupo, una_persona, zip_sin_chat, error_lectura, demasiado_grande, compartir), `app_install_*`, `chat_shared_in`, `file_picker_open`/`file_selected`/`file_picker_cancel` (selector de archivos), `section_view` (`section`: subir, video, pasos, ejemplo, precios, faq), `preview_reached` (`part`: indice, precio), `pay_modal_open`, `flow_video_progress` (`pct`: 25/50/75/100), `pdf_download`, `stories_share`, `exit_intent_shown`. Con esto se ve en qué paso se cae la gente.
- **Origen de cada visita** (`firstTouch`): en la primera visita se guarda `localStorage.yalosabia_src` (utm_source/medium/campaign/content, `fbclid` → «facebook», o la web de origen; si no, «directo»). Va a PostHog como `first_source`/`first_campaign` y a Stripe en la metadata de la sesión (`src_source`, `src_medium`, `src_campaign`, `src_ad`, `src_referrer`, `src_first_visit`).
- **API de conversiones** (`lib/meta-capi.ts`): al volver de Stripe, si la persona aceptó «todas» las cookies, `/api/verify-payment?track=1` manda la compra a Meta desde el servidor (píxel «Market data», `event_id` = id de la sesión, el mismo `eventID` que el píxel del navegador, así Meta no la cuenta dos veces). Sin la variable `META_CAPI_TOKEN` en Vercel no hace nada. `META_CAPI_TEST_CODE` para probar en «Eventos de prueba».
- Ojo: el píxel de Meta solo carga si aceptan «todas» las cookies, así que Meta no ve a quien pulsa «Solo necesarias» y atribuye menos compras de las reales.

## Móvil, tutorial y app instalable

- **Orden de la portada** (sep 2026): portada con «Subir nuestro chat» → «Así es su diario» (`#indice`, las 14 páginas + botón «Hacer el nuestro») → «Ahora, el de ustedes» (`#subir`: zona de subida, formulario de correo visible debajo, aviso de privacidad) → adelanto → vídeo, cómo funciona, para quién, precio, FAQ. El adelanto sale justo debajo de `#subir`.
- Portada (`.hero-v2`, sep 2026): titular corto «¿Qué tal va su relación?», imagen grande (3 páginas del diario de ejemplo + burbujas, notas a mano y sello 97/100, animación suave) y un solo botón «Ver nuestro adelanto gratis» (`heroUpload`, abre el selector de archivos) con enlaces al tutorial y a `#indice` (evento `hero_see_sample`). En escritorio, texto a la izquierda e imagen a la derecha. La barra fija se esconde mientras se ve ese botón.
- Vídeo «De principio a fin» en la landing (`#de-principio-a-fin`): `public/flujo.mp4` (96 s, 720×1280, sin audio, se reproduce solo al verse; evento `flow_video_view`) y `flujo-portada.jpg`. Se genera con `.tmp-posts/flujo/` (capture.js saca pantallas y PDF reales del preview, flujo.html anima, render.js exporta a 1080×1920 con música); no está en el repo.
- Tutorial: `public/tutorial.mp4` (54 s, Android + iPhone) y `tutorial-portada.jpg`, en un modal (`openTutorial`). Se genera con `.tmp-posts/tutorial/` (HTML animado + puppeteer + ffmpeg), no está en el repo.
- App instalable: `public/manifest.webmanifest` con `share_target` + `public/sw.js`. Instalada en Android, al exportar el chat en WhatsApp se puede elegir YaLoSabía en «Compartir»: el service worker guarda el archivo en la caché del teléfono, redirige a `/?shared=1` y la página lo abre y lo borra. `app/share-target/route.ts` solo redirige si el SW no está activo. iPhone no admite `share_target`.
- **Guía antes de elegir el archivo** (`#guideModal`, `pickChat`): el botón de la portada y la zona de subida ya no abren el selector directamente (casi todos lo cancelaban: no tenían el chat exportado). Primero «¿Ya exportaron su chat?»: «Sí» abre los archivos (`openPicker`, y en esa visita ya no vuelve a preguntar, `sessionStorage.yls_has_chat`); «No» enseña 3 pasos (Android/iPhone según el móvil) con «Listo, subir nuestro chat», el vídeo y el 15% por correo. Eventos `guide_open`, `guide_answer` (`has`: si/no), `guide_done`, `guide_close`.
- `handleFile` reconoce un ZIP por su contenido (`PK`) y lee lo demás como texto, aunque el archivo no tenga extensión.

## Panel interno

- `yalosabia.com/panel.html` (noindex) + `/api/panel` (`lib/panel.ts`): ventas y origen (Stripe), embudo por origen y visitas diarias (PostHog, HogQL), gasto/clics de Meta. Protegido con la variable `PANEL_KEY` (cabecera `x-panel-key`; el navegador la guarda en `localStorage.panelKey`).
- Cada fuente es opcional; si falta su clave el panel lo dice: `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`, `META_ADS_TOKEN` (ads_read; `META_AD_ACCOUNT_ID` por defecto 788285070542304).
- En el preview estático, `/api/panel` devuelve datos inventados con la clave «preview».

## Seguridad del pago (importante)

- **Stripe es la única fuente de verdad.** No hay tabla de compras. El navegador solo guarda `session_id`s (`localStorage`: `yalosabia_plan_v2` y `yalosabia_diaries` = `{huella: session_id}`).
- El servidor escribe el diario solo si la sesión está pagada, sin reembolso (ni parcial) ni disputa, **y** la huella de los mensajes recibidos coincide con `metadata.chat_fp`. Si no: 402 o 403 y no se llama a Gemini.
- **Huella del chat** = SHA-256 de `JSON.stringify([[date,time,sender,text], …])` sobre los mensajes de texto (`diaryPayload` en el cliente = lo que se envía). Cliente (`chatFingerprint` con `crypto.subtle`) y servidor (`lib/payments.ts`) **deben calcularla igual**: la lista sale de `isRealTextV1` (congelado): **no lo cambies** o los chats ya pagados darán 403. Para filtrar más cosas en el PDF, cambia `isRealText`/`isWaSystem`, que no afectan a la huella.
- Las compras anteriores a «un pago = un diario» no tienen huella y valen para cualquier chat.
- Ya no existe ninguna clave de admin. Para probar con acceso usa el preview estático (abajo) o un pago real reembolsado.

## Reglas que salieron de la revisión de código (sep 2026)

- **La huella del pago no depende solo de `isRealTextV1`**: también de `parseWhatsApp`, `dropPastedLines`, `stripEmoji` y `DIARY_MEDIA_RE`. Cambiar cualquiera hace que chats ya pagados den 403.
- `/api/analyze`: descompresión limitada a 30 MB, pago comprobado **sin caché** (un reembolso quita el acceso al momento), timeout de 55 s a Gemini y la clave va en cabecera, no en la URL. Los errores al cliente son genéricos (`server_error`, `model_error`).
- `/api/create-checkout`: valida el email; si falla el código de descuento reintenta sin descuento en la misma moneda (antes cobraba en USD).
- **Un pago = un PDF**: tras escribir el diario, `/api/analyze` guarda `diary_count`/`diary_at` en la metadata del PaymentIntent (o de la sesión) con `markDiaryWritten`. Otra petición con el mismo pago da **409 `already_generated`** pasados 15 min (margen para reintentar si falló la descarga). El navegador guarda el diario en `localStorage` (`yls_diary_<huella>`) y lo reutiliza para volver a descargar sin llamar a la IA. Soporte: para dejar escribir otro, borra `diary_count` en Stripe.
- **Avisos de WhatsApp** (`WA_SYSTEM_RE`, igual en `index.html` y `app/api/analyze/route.ts`): cifrado, «X es un contacto», código de seguridad, «toca para…», ubicación, tarjetas de contacto, mensajes eliminados, «esperando este mensaje», llamadas, encuestas, cuentas de empresa… en español e inglés. En iPhone salen con el nombre del contacto como remitente: por eso el primer mensaje del diario salía como «Conrado es un contacto». No afecta a la huella.
- **Nombres cambiados**: si se edita un nombre o se vuelve a exportar más tarde, la huella cambia y cuenta como otro chat (a propósito: evita reutilizar un pago).
- **Meta AI**: las respuestas de @Meta AI salen en el export como un remitente más. `isWaSystem` las trata como aviso (no cuentan como persona ni entran en los textos del PDF) y el servidor las quita de la muestra para Gemini. **No** se quitan de la lista que se envía (la huella del pago se calcula sobre ella).
- **Fechas mes/día**: `detectDateOrder` decide por chat si las fechas son día/mes (español) o mes/día (móviles en inglés) y lo guarda en `CHAT_DATE_ORDER`; `parseMessageDate` lo usa. No toca la huella. `DIARY_LOVE_RE` también reconoce «I love you». El primer y el último «te quiero» usan `isLoveText`, que descarta «te quiero preguntar/comentar…» (quiero + infinitivo), «no te quiero…» y «te quiero ver».
- La compra solo se cuenta una vez (PostHog, píxel y CAPI) aunque se vuelva a abrir el enlace de éxito de Stripe.
- PostHog: `disable_session_recording` y `ph-no-capture` en el adelanto (nombres y mensajes del chat).
- Las librerías pesadas (JSZip, html2canvas, jsPDF) van con `defer`.
- El chat guardado para la vuelta de Stripe solo se borra cuando el pago está confirmado (o a las 6 h).

## Probar

- **Preview sin Stripe ni Gemini:** `npm run preview:static` → http://localhost:5173 (o la config `yalosabia-static` de `.claude/launch.json`). Simula `/api/pricing` y `/api/analyze`. Instrucciones de consola en `scripts/preview-static.mjs`.
- **Pruebas con chats generados:** `scripts/chat-test-harness.js` (formatos Android/iPhone, ES/EN, 12h/24h, 10 a 100.000 mensajes, grupos, Meta AI…). Sírvelo con `node scripts/preview-static.mjs scripts 5190`, cárgalo en el preview y usa `runCase(nombre, {n, fmt, lang, people})` y `runPdf()`. Resultados de sep 2026: 100.000 mensajes → 1 s de proceso, 7,4 MB de datos (0,7 MB comprimidos), PDF en 4 s.
- **Sintaxis del JS de `index.html`:** `npm run check:html`. Ejecútalo siempre después de tocar el archivo.
- **App completa:** `npm install`, `vercel env pull .env.local`, `npm run dev`. Variables: `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- **Cada push crea una preview en Vercel**; `main` despliega a producción. Trabajar en ramas y PRs; no hacer push a `main` sin que Javi lo pida.
- Stripe está en **modo live**: probar un pago real cobra de verdad.

## Convenciones y trampas

- Commits: este equipo no tiene identidad global de git → `git -c user.name=superjavi3 -c user.email=superjavi3@googlemail.com commit …`.
- Windows + `core.autocrlf`: al cambiar de rama los archivos pueden quedar en CRLF y fallar las ediciones por texto exacto. Normaliza con `sed -i 's/\r$//' archivo` (git lo guarda igual).
- Git Bash convierte los argumentos que empiezan por `//` (p. ej. un comentario `// …` pasado a un script): mejor pasar textos así desde un archivo.
- html2canvas no pinta bien `repeating-linear-gradient` ni `box-shadow` con `transform`: en el PDF las líneas de libreta se dibujan con divs (`addPaperLines`) y las tarjetas usan borde.
- Copia en español de México, sin emojis, tono cercano y honesto («no es para acusar a nadie»).

## Pendiente

1. Probar un **pago real + reembolso** (no se ha podido probar de extremo a extremo).
2. En Stripe → Webhooks, añadir `charge.refunded` y `charge.dispute.created` a `/api/stripe-webhook` (sin eso, un reembolso tarda hasta 10 min en quitar el acceso).
3. Cambiar el nombre público de la cuenta de Stripe («LoSabía» → «YaLoSabía»).
4. El acceso vive en el navegador donde se pagó: en otro dispositivo hay que volver al enlace de éxito de Stripe (no hay «recuperar mi diario» por email).
5. Ideas pendientes: `/api/share` y `/a/[id]` usan la estética antigua; valorar retirarlos del todo.
6. Decisiones abiertas de la revisión: PostHog sin consentimiento de cookies (el banner dice lo contrario), rate limiting (Vercel Firewall).

## Historial

- Feb 2026: MVP con planes Curioso/Detective/Obsesivo (doc externo `ESTADO_PROYECTO_YALOSABIA_v2.3.md`, desfasado).
- Sep 2026: PR #8 rediseño «Querido diario» + PDF como producto; PR #9 pago verificado en servidor + un pago = un diario; se eliminó `/api/debug-supabase` (exponía claves) y la clave de admin del cliente; limpieza del código de la web antigua.
