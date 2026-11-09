# YaLoSabía: lo aprendido

Todo lo aprendido construyendo y lanzando YaLoSabía (febrero–septiembre de 2026): producto, embudo, analítica, anuncios, correo, pagos, contenido, herramientas y forma de trabajar. Sirve para este proyecto y para el siguiente.

> Datos a 30 sep 2026. Las cifras son las reales del proyecto, no ejemplos.

---

## 1. Resumen en 10 líneas

1. **El cuello de botella casi nunca está donde crees.** Gastamos semanas en diseño, precio y anuncios, y el problema real era que nadie tenía el archivo del chat a mano.
2. **Mide cada paso antes de optimizar nada.** Sin el evento `file_picker_cancel` nunca habríamos visto que 7 de cada 7 personas cancelaban el selector.
3. **Tráfico barato no es tráfico bueno.** ~1.000 visitas pagadas dieron 0 chats subidos.
4. **Un producto que exige un paso fuera de tu web (exportar en WhatsApp) necesita guía dentro del flujo**, no un enlace a un tutorial.
5. **Captura el correo antes de que se vayan.** Quien no puede hoy, puede mañana si le escribes.
6. **La fuente de verdad del pago es el proveedor (Stripe)**, no tu base de datos ni el navegador.
7. **Nada inventado:** ni testimonios, ni contadores, ni «+12.000 usuarios». Quita credibilidad y puede ser ilegal.
8. **Menos texto, más imagen.** Todas las versiones con mucho texto (creatividades, popup, portada) funcionaron peor o no gustaron.
9. **Trabaja en ramas y con preview.** Cada cambio en PR, preview en Vercel y fusión solo cuando se ha visto.
10. **Automatiza lo repetitivo** (programar publicaciones, plantillas de correo, códigos de descuento) y deja la cabeza para lo que mueve el embudo.

---

## 2. Producto

### Lo que funcionó
- **Pivotar de «detector de infidelidad» a «el diario de su relación».** El ángulo de sospecha daba vergüenza compartirlo y tenía mala prensa. El de regalo o recuerdo se puede enseñar, compartir y regalar.
- **El producto es un entregable concreto (PDF de 14 páginas)**, no una web con gráficas. Es fácil de entender, de enseñar en un anuncio y de justificar el precio.
- **Adelanto gratis y muro de pago.** El usuario ve algo suyo (índice 0-100, 3 datos) antes de pagar.
- **Un solo precio ($199 MXN) y un pago = un diario.** Los planes Curioso/Detective/Obsesivo del MVP confundían.
- **Bonus que se ven:** la carta para cada uno, la imagen para Stories, el PDF por correo y 30 días de garantía. Suben el valor percibido sin cambiar el precio.
- **Estética muy reconocible** (diario íntimo: papel rayado, boli rojo y azul, polaroids, cinta washi). Se reconoce en un anuncio en medio segundo.

### Lecciones
- **Límites claros:** chats de menos de 300 mensajes no se venden (el PDF saldría pobre) y entre 300 y 1.000 se avisa. Mejor no vender que vender algo malo.
- **Solo parejas.** Quitar el modo grupo simplificó todo.
- **Cualquier texto de IA hay que verificarlo:** `verifyQuote` solo pinta citas que existen tal cual en el chat. Una IA que se inventa frases «de tu pareja» es un desastre de confianza.
- **Sin emojis ni tono de IA.** Suena a plantilla y resta intimidad.
- **Español de México y «ustedes»,** nunca «vosotros». El público nota enseguida un texto escrito desde España.

---

## 3. Embudo (la lección más cara)

### Los números reales (sep 2026)

| Paso | Dato |
|---|---|
| Visitas pagadas (Meta, tráfico) | ~1.000 |
| Rebote en la primera pantalla | ~95% |
| Pulsan «subir chat» | ~2% |
| Abren el selector de archivos | la mitad de esos |
| **Cancelan el selector** | **casi todos** (7 de 7 el 29 sep) |
| Suben el chat | ~0 (reales) |
| Compran | 0 reales |

### Qué aprendimos
1. **Identifica el paso que se lleva a la gente antes de tocar nada más.** Cambiamos portada, precio, creatividades… y el agujero estaba en un paso que ni mirábamos: tener el archivo.
2. **El botón que abre algo «técnico» de golpe asusta.** Un selector de archivos sin contexto se cancela. Solución: preguntar primero («¿Ya exportaron su chat?») y guiar.
3. **El navegador dentro de Instagram o Facebook complica todo:** subir archivos, cookies, sesiones. La mayoría del tráfico móvil llega por ahí. Hay que probar el flujo desde la app real, no desde el ordenador.
4. **Quien llega desde un anuncio no tiene el producto «preparado».** Llega con curiosidad y sin el chat exportado. Hay que ofrecerle «hazlo luego» (correo + descuento) en vez de perderlo.
5. **El orden de la portada importa:** primero la imagen que engancha, luego el ejemplo del producto, luego subir. Empezar con texto y botón «a saco» no convence.
6. **Una sola acción principal por pantalla.** Quitamos «ver un ejemplo sin subir nada», el 15% en la portada y los enlaces secundarios, y dejamos un solo botón.
7. **Barra fija abajo** con la acción principal, pero que desaparezca donde ya hay otro botón que hace lo mismo.
8. **Garantía visible junto al botón de pago** (30 días). Quita miedo en el último paso.
9. **Mira a personas reales usarlo.** 15 minutos viendo a 3 amigos hacerlo desde Instagram enseñan más que cualquier gráfica.

### Checklist de embudo para el próximo proyecto
- [ ] Dibuja el embudo paso a paso **antes** de lanzar anuncios.
- [ ] Un evento por paso, también los de «abandono» (cancelar, cerrar, volver atrás).
- [ ] Prueba el flujo entero desde el móvil, dentro de Instagram y Facebook.
- [ ] Si un paso depende de algo externo (exportar, instalar, registrarse en otro sitio), guía dentro del flujo.
- [ ] Captura del correo para quien no puede ahora.
- [ ] No escales anuncios hasta que el embudo convierta con poco tráfico.

---

## 4. Analítica

### Herramientas
- **PostHog** (eventos, embudo, origen). Consultas SQL (HogQL) desde el navegador con la cookie `posthog_csrftoken`.
- **Píxel de Meta** (solo si aceptan todas las cookies) y **API de conversiones** desde el servidor para las compras.
- **Stripe** para ventas, con el origen de cada venta en la metadata de la sesión.
- **Panel interno** (`/panel.html`) que junta Stripe, PostHog y el gasto de Meta en una pantalla.

### Buenas prácticas
- **Nombra los eventos por paso del embudo y con propiedades** (`from`, `where`, `reason`) para saber desde qué botón o formulario vino cada acción.
- **Registra los abandonos:** `file_picker_cancel`, `nochat_close`, `guide_close`, `upload_failed` con motivo.
- **Guarda el origen de la primera visita** (utm, fbclid, referrer) en `localStorage` y mándalo a PostHog y a Stripe. Así se sabe qué campaña vende, no solo cuál trae clics.
- **Pon UTM a todo enlace que publiques** (anuncios, historias, bio, correos): `utm_source`, `utm_medium`, `utm_campaign`.
- **Cuenta la compra una sola vez** aunque recarguen la página de éxito. Usa el mismo `event_id` en el píxel y en la API de conversiones para que Meta no la duplique.
- **Separa tus pruebas de los datos reales.** Las pruebas desde el preview o con códigos del 100% ensucian los números: márcalas (`prueba`, `free_diary`) y fíltralas.
- **No grabes sesiones donde se ven datos privados** (`ph-no-capture` en el adelanto).
- **El píxel de Meta ve menos de lo real** si respetas las cookies. Cuenta con ello al comparar Meta y Stripe.
- **Revisa por día y por origen,** no el total. «trafico_mx» y «stories-diario» se comportan muy distinto.

### Métricas que importan (en orden)
1. % de visitas que **suben el chat** (el paso roto).
2. % de adelantos que **abren el pago**.
3. % de pagos iniciados que **terminan**.
4. **Coste por chat subido** y **coste por venta** por campaña.
5. Correos captados y cuántos acaban comprando.

El CTR y el coste por clic son secundarios: un clic barato que no sube el chat no vale nada.

---

## 5. Anuncios (Meta)

### Lo que vimos
- La **campaña de tráfico** daba visitas baratas (~$0,92 MXN), pero de poca calidad: rebote del 95%.
- La **campaña de Stories** con creatividades estilo diario dio visitas a ~$0,55 MXN y tardó 2-3 días en arrancar (gastó $12 en tres días antes de coger ritmo).
- **Una cuenta nueva y sin verificar** entrega poco. Verifica la cuenta cuanto antes.
- **Un anuncio que no gasta no es un problema de pago:** revisa facturación, verificación, fase de aprendizaje y cuántas creatividades tiene.

### Creatividades
- **Gancho de pregunta** que la persona se hace de verdad: «¿Quieres saber qué tal va tu relación?», «¿Quién manda más mensajes?», «¿Van a durar?».
- **Datos concretos en tarjetas** («Ella 54%», «8 min», «97/100») mejor que frases.
- **Siempre visible el «adelanto gratis»** y el botón («VER EL MÍO GRATIS»).
- **Logo y URL** en cada pieza.
- **Poco texto.** Las versiones cargadas no gustaron. La estética del producto (el diario) funcionó mejor que diseños genéricos de «anuncio».
- **Formato 9:16** para Stories y Reels, y 4:5 o carrusel para el feed.
- Las primeras ideas casi nunca son las buenas: iterar 5-8 versiones fue normal.

### Reglas
- **No escales presupuesto con el embudo roto.** Primero que convierta con $100 al día.
- **Una campaña activa, con pocas creatividades buenas,** mejor que muchas campañas pequeñas.
- **UTM en cada anuncio** y comprobar en PostHog, no solo en Meta.
- **Revisa los borradores pendientes** («Revisar y publicar (N)») antes de publicar: pueden ser cambios viejos con errores.

---

## 6. Correo (Brevo)

### Qué montamos
- Formulario de correo con casilla de consentimiento **sin marcar**, en tres sitios: la zona de subida, el pie y un popup.
- **Popup a los 5 segundos** con «15% + regalo», como mucho una vez cada 3 días, y nunca si ya dejó el correo, ya pagó o viene con código.
- **Correo al momento (E0)** con el código y el tutorial, y recordatorios a los 2 días (E1) y a los 5 (E2, el último).
- El código de descuento es **único por correo, de un solo uso, caduca en 7 días** y solo se entrega por correo. Así hace falta un correo real.
- **Quien compra sale de la secuencia** (`markBuyer`).
- **El PDF también por correo,** adjunto, solo al correo de la compra.

### Lecciones
- **Autentica el dominio** (DKIM, DMARC, SPF) desde el primer día.
- **Los correos con diseño de boletín caen en Promociones de Gmail.** El del PDF lo hicimos sencillo, personal, con versión en texto y firmado por una persona, y así llega a Principal.
- **Brevo tiene bloqueo por IP para las claves API:** hay que desactivarlo si llamas desde Vercel (IPs que cambian).
- **Plantillas en código** (`lib/email-templates.ts` + script que las sube) en vez de editarlas a mano en el panel.
- **Descuento solo a cambio de algo** (el correo). Un 15% para todos con un contador de 30 minutos era ruido.
- **Nada de contadores falsos:** si hay plazo, que sea real y el servidor lo respete.
- **Carrito abandonado de Stripe:** activarlo (`after_expiration.recovery`) es gratis.

---

## 7. Pagos (Stripe) y seguridad

- **Stripe es la única fuente de verdad.** No hay tabla de compras. El servidor pregunta a Stripe si la sesión está pagada, no reembolsada ni disputada.
- **El pago va atado a lo que se compró** (la huella SHA-256 del chat). Así no se puede pagar uno y generar otros.
- **Nunca cambies la función que calcula la huella** de algo ya vendido: los clientes antiguos darían error. Si hay que filtrar más, hazlo en otra función.
- **Un pago = un PDF:** se marca en la metadata de Stripe tras generarlo, con un margen de 15 minutos para reintentar.
- **Nada de claves de admin en el cliente** ni endpoints de depuración en producción: tuvimos uno que exponía claves.
- **No aceptes HTML de usuarios:** el antiguo «compartir» permitía XSS. Se pasó a solo lectura.
- **Códigos de descuento:**
  - los de influencers llevan metadata (`influencer`, `commission_mxn`);
  - los del 100% dan `no_payment_required` y hay que aceptarlo como pagado;
  - Stripe no deja aplicar un descuento y a la vez enseñar su campo de códigos, así que el campo va en tu web.
- **Monedas sin decimales** (CLP, PYG…) en una sola lista compartida.
- **Stripe en modo live:** probar cuesta dinero real. Usa un preview con respuestas simuladas y un código del 100% para probar de extremo a extremo.
- **Página de reembolsos y términos** claros: 30 días de garantía, enlazados junto al botón de pago.

---

## 8. Contenido y redes

### Qué tenemos montado
- **Instagram y Facebook:** 2 publicaciones al día (13:00 y 19:00) y un reel diario, programados con Meta Business Suite con semanas de antelación.
- **Historias:** una al día a las 20:00, con enlace (en Facebook se puede poner desde el ordenador; en Instagram solo desde el móvil, con el sticker de enlace).
- **TikTok:** 2 vídeos al día programados.
- **X:** 1 tuit al día con imagen.

### Lecciones
- **Programa en lote.** Una tarde de trabajo cubre un mes.
- **Todo post necesita texto y enlace.** Programamos reels sin descripción: se publican «vacíos» y un reel de Instagram publicado no se puede editar desde Business Suite. **Revisa el texto antes de programar.**
- **Enlace en la bio** y UTM en todos los enlaces.
- **Fija el vídeo que explica el producto** («De principio a fin») arriba del perfil.
- **Perfil completo** en cada red: portada, bio, categoría, web, correo y enlaces cruzados.
- **Las redes orgánicas con 1 seguidor no mueven ventas al principio.** Sirven de prueba social cuando alguien que vio un anuncio mira el perfil.

### Formatos que hicimos
- Carruseles de preguntas («¿Quién pide perdón primero?»).
- Historias estilo diario con 2 tarjetas de datos y un botón.
- Vídeo del flujo completo (96 s) y tutorial de exportación (54 s), generados con HTML animado, puppeteer y ffmpeg.

---

## 9. Web y técnica

### Stack
- **Next.js en Vercel.** Toda la web en un solo `public/index.html` (HTML + CSS + JS sin framework) y las APIs en `app/api/*`.
- **Procesamiento en el navegador:** el chat no sale del teléfono salvo lo necesario para la IA, tras pagar. Es un argumento de privacidad fuerte.
- **IA:** Gemini 2.5 Flash para los capítulos, con timeout, clave en la cabecera y errores genéricos al cliente.
- **PDF en el navegador:** html2canvas + jsPDF.
- **IndexedDB** para guardar el chat mientras se paga en Stripe y recuperarlo al volver.
- **PWA con `share_target`:** en Android, «Compartir» desde WhatsApp abre la web con el chat. iPhone no lo admite.

### Trampas técnicas
- **html2canvas** no pinta bien `repeating-linear-gradient` ni `box-shadow` con `transform`: dibuja las líneas con divs y usa bordes.
- **Formatos de exportación de WhatsApp:**
  - Android/iPhone, español/inglés y 12h/24h;
  - fechas día/mes o mes/día (hay que detectarlo por chat);
  - avisos del sistema con el nombre del contacto;
  - Meta AI como un remitente más.
  Prueba con chats generados (`scripts/chat-test-harness.js`) de 10 a 100.000 mensajes.
- **`[hidden]` no gana a un `display` de CSS:** añade `[hidden] { display: none !important; }`.
- **Una variable global llamada `top` choca con `window.top`.**
- **Windows + git:** los archivos pueden quedar en CRLF y fallan las ediciones exactas. Normaliza con `sed -i 's/\r$//'`.
- **Heredocs en Git Bash** se comen las barras invertidas de las expresiones regulares: mejor escribir el script con un editor.
- **Librerías pesadas con `defer`.**
- **Comprueba la sintaxis del JS en línea** después de cada cambio (`npm run check:html`).

### Buenas prácticas
- Cabeceras de seguridad (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- Límites en todo lo que entra: tamaño de archivo, descompresión, número de envíos.
- Errores genéricos hacia el cliente y detalle solo en los logs.
- Respeta `prefers-reduced-motion` en las animaciones.

---

## 10. Forma de trabajar

- **Ramas y PRs siempre.** Cada push crea una preview en Vercel; `main` es producción. Se fusiona solo cuando se ha visto.
- **Preview estático sin Stripe ni IA** (`npm run preview:static`) para probar la web en segundos, con respuestas simuladas.
- **Documenta en el propio repo** (`CLAUDE.md`, `docs/`): qué hace cada archivo, reglas que no se pueden romper y pendientes. Ahorra horas en cada sesión.
- **Probar en tamaño móvil** antes de fusionar cualquier cambio visual.
- **Una decisión, una PR pequeña.** Es más fácil revertir y entender qué movió los números.
- **Revisión de código periódica** buscando seguridad (claves expuestas, XSS, pagos sin verificar).

### Automatización del navegador (para no repetir errores)
- Meta y X **solo funcionan con la ventana de Edge delante y maximizada.** Oculta o minimizada, se congelan.
- Para subir archivos en Meta: interceptar el `click()` del `<input type="file">` y usar la subida directa.
- Business Suite **no deja editar reels de Instagram ya publicados** y **no deja poner enlaces en historias de Instagram**.
- Las zonas horarias de Business Suite confunden: comprueba la hora real con el parámetro `focus_time` o con el calendario.

---

## 11. Herramientas usadas

| Para qué | Herramienta |
|---|---|
| Hosting y previews | Vercel |
| Web y APIs | Next.js, JS sin framework en `index.html` |
| Pagos | Stripe (Checkout, códigos de promoción, webhooks) |
| IA | Gemini 2.5 Flash |
| PDF | html2canvas + jsPDF |
| Analítica | PostHog (eventos + HogQL) |
| Anuncios | Meta Ads Manager + píxel + API de conversiones |
| Correo | Brevo (lista, plantillas, automatización) |
| Correo de la marca | Namecheap Private Email |
| DNS | Namecheap |
| Programar redes | Meta Business Suite, programador de TikTok, programador de X |
| Vídeos y creatividades | HTML + puppeteer (Edge headless) + ffmpeg |
| Código | GitHub (PRs), Claude Code |
| Pruebas de chats | `scripts/chat-test-harness.js` |

---

## 12. Errores que no repetiría

1. **Lanzar anuncios antes de ver a una persona real completar el flujo en el móvil.**
2. **Cifras y testimonios inventados** en la primera versión.
3. **Muchos planes de precio** en el MVP.
4. **Una oferta con contador** para todos, en vez de un descuento a cambio del correo.
5. **Programar reels sin revisar que llevaban texto.**
6. **Varias campañas de Meta a la vez** con poco presupuesto cada una.
7. **Un endpoint de depuración y una clave de admin** en producción.
8. **Mucho texto** en creatividades, popups y portada.

---

## 13. Pendientes y siguientes experimentos

- Ver si la guía «¿Ya exportaron su chat?» hace que alguien suba el chat (`guide_answer`, `guide_done`, `chat_uploaded`).
- Ver cuántos correos da el popup y si alguno compra.
- Mirar a 3-5 personas reales hacer el flujo desde Instagram.
- Verificar la cuenta de Meta.
- Probar un pago real + reembolso de extremo a extremo.
- Añadir `charge.refunded` y `charge.dispute.created` al webhook de Stripe.
- Poner texto con enlace a los reels programados sin descripción.
- Idea grande, si lo anterior no basta: «mándennos el chat por correo» (exportar → Gmail → responder con el enlace al adelanto), cuidando mucho la privacidad.
