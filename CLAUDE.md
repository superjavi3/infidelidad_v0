# YaLoSabía — contexto del proyecto

Web que convierte un chat de WhatsApp de pareja en **«su diario»**: un PDF de 14 páginas con la historia de la relación. Público: México (español de México, «ustedes», nunca «vosotros»). Producción: https://www.yalosabia.com (repo `superjavi3/infidelidad_v0`; «el proyecto de infidelidad» para el dueño, Javi).

## El producto (decidido en septiembre de 2026)

- **El producto es el PDF.** La web solo enseña un adelanto y vende. Nada de capítulos, gráficas ni chatbot en la web.
- **Un solo precio:** $199 MXN (antes $129; subido el 25 sep 2026), pago único (otros países: `app/api/pricing/route.ts`).
- **Un pago = un diario:** cada pago vale para el chat con el que se pagó.
- **Solo parejas:** un chat con 3+ personas muestra un aviso. El modo grupo se eliminó.
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
| `app/api/share`, `app/a/[id]` | Links compartidos **antiguos** (Supabase). La web ya no crea links; se mantienen para que los viejos abran. |
| `app/api/track` | Eventos a Supabase. |
| `public/diario/*.jpg`, `public/og-image.jpg` | Páginas de un diario de ejemplo (chat demo «Laura & Carlos») para el hero y «Así es su diario», e imagen para compartir (1200×630). Si cambia el diseño del PDF, hay que regenerarlas: `buildDiaryPages` + html2canvas a escala 0.8. |
| `public/mockup-studio.html`, `mockup-capture.html` | Herramientas internas de mockups, sin enlazar desde la web. |

### Dentro de `public/index.html` (script principal, por orden)
Parser de WhatsApp (`parseWhatsApp`) → `analyzeMessages` (índice 0-100, `verdict`) → `processChat` → `showResults` (adelanto) → análisis que usa el PDF (`analyzeRelationshipTimeline`, `analyzeSilences`, `analyzeDoubleTexting`, `analyzeMultimedia`, `analyzeDeletedMessages`, `analyzeForensicReconstruction`, `analyzeBeforeVsNow`, `analyzeSelectiveGhosting`, `analyzeLanguageChanges`) → modo demo (`loadDemo`, `generateDemoMessages`).
Bloque «PREMIUM PLAN SYSTEM»: precios, estado de pago (`rememberPurchase`, `sessionForChat`, `loadPremiumState`, `revokePremium`, `revalidateStoredPayment`), modal de pago, `checkPaymentSuccess`.
Bloque «DIARIO» (al final): huella del chat, `analyzeMilestones`, `computePeople`, adelanto (`renderLockedIndex`, `refreshDiaryState`), `loadDiaryAI`, IndexedDB, Story (`shareToStories`) y **PDF** (`buildDiaryPages` → 14 páginas, `generatePDF`).
- `computeMoments`: hasta 4 «días que recordar» (primer mensaje, primer «te quiero», día con más mensajes, último «te quiero» o vuelta tras el silencio más largo) con sus mensajes reales; se envían a Gemini para que escriba un texto por momento.
- `verifyQuote`: toda cita que devuelve la IA (perfiles, señales, frases para guardar, mensaje final) solo se pinta si existe **tal cual** en el chat. Si no, se omite.
- `isWaSystem` / `WA_SYSTEM_RE`: avisos automáticos de WhatsApp (cifrado, llamadas, mensajes temporales…). Se excluyen de todo lo que se pinta; el servidor tiene la misma regex para la muestra de la IA.

## Oferta de bienvenida (15%)

- Barra fija arriba con un contador de **30 minutos desde la primera visita** y un **código de un solo uso por visitante** (`YLS-XXXXX`). El plazo es real: al acabarse, el servidor ya no aplica el descuento (nada de contadores que se reinician: sería publicidad engañosa).
- `lib/offer.ts`: `/api/offer` firma `{código, caducidad}` con HMAC (clave: `OFFER_SECRET` o, si no existe, derivada de `STRIPE_SECRET_KEY`). Al pagar, `create-checkout` verifica la firma y crea en Stripe el código (`max_redemptions: 1`, `expires_at`) sobre el cupón `YLS15` (15%, lo crea solo si no existe) y lo aplica con `discounts`. Si algo falla, cobra el precio normal.
- En el navegador: `localStorage.yalosabia_offer` (una oferta por navegador; se marca usada al pagar).
- **Apagarla:** `OFFER_DISABLED=1` en Vercel y redeploy. Duración y porcentaje: constantes en `lib/offer.ts` (el texto «15%» de la barra está en `index.html`).

## Medición

- Píxel de Meta: `PageView`, `ChatUploaded` (custom), `ViewContent` (adelanto visto), `InitiateCheckout`, `Purchase`.
- PostHog (`trackFunnel`): `chat_uploaded`, `preview_shown`, `cta_upload_click` (`from`: price/sticky), `sample_page_open`. Con esto se ve en qué paso se cae la gente.

## Seguridad del pago (importante)

- **Stripe es la única fuente de verdad.** No hay tabla de compras. El navegador solo guarda `session_id`s (`localStorage`: `yalosabia_plan_v2` y `yalosabia_diaries` = `{huella: session_id}`).
- El servidor escribe el diario solo si la sesión está pagada, sin reembolso (ni parcial) ni disputa, **y** la huella de los mensajes recibidos coincide con `metadata.chat_fp`. Si no: 402 o 403 y no se llama a Gemini.
- **Huella del chat** = SHA-256 de `JSON.stringify([[date,time,sender,text], …])` sobre los mensajes de texto (`diaryPayload` en el cliente = lo que se envía). Cliente (`chatFingerprint` con `crypto.subtle`) y servidor (`lib/payments.ts`) **deben calcularla igual**: la lista sale de `isRealTextV1` (congelado): **no lo cambies** o los chats ya pagados darán 403. Para filtrar más cosas en el PDF, cambia `isRealText`/`isWaSystem`, que no afectan a la huella.
- Las compras anteriores a «un pago = un diario» no tienen huella y valen para cualquier chat.
- Ya no existe ninguna clave de admin. Para probar con acceso usa el preview estático (abajo) o un pago real reembolsado.

## Probar

- **Preview sin Stripe ni Gemini:** `npm run preview:static` → http://localhost:5173 (o la config `yalosabia-static` de `.claude/launch.json`). Simula `/api/pricing` y `/api/analyze`. Instrucciones de consola en `scripts/preview-static.mjs`.
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
5. Ideas pendientes: `/api/share` y `/a/[id]` usan la estética antigua; valorar retirarlos.

## Historial

- Feb 2026: MVP con planes Curioso/Detective/Obsesivo (doc externo `ESTADO_PROYECTO_YALOSABIA_v2.3.md`, desfasado).
- Sep 2026: PR #8 rediseño «Querido diario» + PDF como producto; PR #9 pago verificado en servidor + un pago = un diario; se eliminó `/api/debug-supabase` (exponía claves) y la clave de admin del cliente; limpieza del código de la web antigua.
