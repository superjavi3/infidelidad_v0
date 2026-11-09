---
name: resumen
description: Resumen de la operativa de YaLoSabía. Revisa Stripe (ventas), Meta Ads (gasto y resultados), PostHog (visitas y embudo), los posts de Facebook, Instagram y Pinterest y lo programado, y termina con los 3 próximos pasos. Úsala cuando Javi pida «resumen», «cómo vamos», «revisa todo» o similar.
---

# Resumen de la operativa de YaLoSabía

Objetivo: en unos minutos, un resumen corto y honesto de cómo va el negocio y qué hacer después.
**Solo lectura**: no publiques, pauses, edites ni borres nada, y no envíes mensajes. Si ves algo que
conviene cambiar, lo propones en «Próximos pasos».

## Cómo acceder

Todo se mira en Edge con las sesiones de Javi (herramientas `mcp__claude-in-chrome__*`; carga las
herramientas con ToolSearch si hacen falta). Usa **una sola pestaña** y navega en ella; Edge tiene que
estar a la vista (si una página no responde o sale «renderer frozen», pídele a Javi que ponga Edge
delante). Prefiere `get_page_text` y `javascript_tool` a las capturas.
Si falta una sesión (pide login), di qué falta y sigue con lo demás. Nunca escribas contraseñas.

Periodo por defecto: **últimos 7 días** y, aparte, **desde el último resumen** si Javi lo menciona.
Fechas en hora de México (la cuenta de Meta y el navegador están en America/Mexico_City).

## 1. Stripe (ventas)

- `https://dashboard.stripe.com/payments` → `get_page_text`.
- Cuenta: pagos «Completado correctamente», importes, reembolsos, disputas, anulados.
- **No pongas emails de clientes en el resumen**; como mucho «1 venta, $169.15 MXN (con el 15%)».
- Las compras de `superjavi3@*` son de Javi (pruebas): sepáralas.

## 2. Meta Ads

- `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=788285070542304&business_id=740081945708518`
  (añade `&date=AAAA-MM-DD_AAAA-MM-DD` para el periodo) → `get_page_text`.
- Por campaña activa: gasto, alcance, resultados, coste por resultado, clics en el enlace, CTR, CPC,
  visitas a la página de destino si salen. Estado de entrega (activa, en revisión, rechazada, limitada).
- Avisos de la cuenta: límite de gasto, verificación, anuncios rechazados.
- La campaña de tráfico es «YaLoSabía Tráfico MX» (UTM `utm_campaign=trafico_mx`).

## 3. PostHog (visitas y embudo)

Proyecto **325512** en `https://us.posthog.com`. Con la sesión abierta, consulta por HogQL desde la página:

```js
const csrf=(document.cookie.match(/posthog_csrftoken=([^;]+)/)||[])[1];
const q=async sql=>{const r=await fetch('/api/projects/325512/query/',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify({query:{kind:'HogQLQuery',query:sql}})});const j=await r.json();return j.results||j};
```

Filtra **siempre** `properties.$host = 'www.yalosabia.com'` (hay mucho ruido de localhost y previews).
Si la salida sale `[BLOCKED: ...]`, quita `?`, `=` y `&` del texto antes de devolverlo.

Consultas útiles (ajusta el intervalo):
- Embudo por día: `select toDate(timestamp) d, count(distinct person_id) visitantes, countIf(event='chat_uploaded') chats, countIf(event='preview_shown') adelantos, countIf(event='checkout_started') pagos_abiertos, countIf(event='purchase') compras from events where properties.$host='www.yalosabia.com' and timestamp > now() - interval 7 day group by d order by d`
- Origen: `select coalesce(properties.utm_campaign, properties.first_source, properties.$referring_domain, 'directo') s, count(distinct person_id) p from events where properties.$host='www.yalosabia.com' and event='$pageview' and timestamp > now() - interval 7 day group by s order by p desc limit 12`
- Compromiso: `select round(avg(properties.$prev_pageview_max_scroll_percentage),2), quantile(0.5)(properties.$prev_pageview_duration) from events where properties.$host='www.yalosabia.com' and event='$pageleave' and timestamp > now() - interval 7 day`
- Fallos al subir: `select properties.reason r, count() c from events where event='upload_failed' and properties.$host='www.yalosabia.com' and timestamp > now() - interval 7 day group by r order by c desc` (y `properties.shape` si es `pocos_mensajes`: formato que no entendemos).
- Chats cortos: `event='chat_short'` (`blocked` = no pudieron pagar). Tutorial: `tutorial_open` y `tutorial_close` (`seconds`).
- Dispositivo: `properties.$device_type`, `properties.$os`.

Ojo: las personas con varios eventos de `chat_uploaded` desde escritorio en España suelen ser Javi.

## 4. Redes

**Facebook e Instagram** (Business Suite, activo `asset_id=1077889492066752`):
- Publicados: `https://business.facebook.com/latest/posts/published_posts?asset_id=1077889492066752&business_id=740081945708518` → texto de las filas (visualizaciones, alcance, interacciones de los últimos posts; separa Facebook e Instagram).
- Estadísticas de la página y la cuenta: `https://business.facebook.com/latest/insights/overview?asset_id=1077889492066752&business_id=740081945708518` (alcance, visitas, seguidores nuevos).
- Programado: calendario `https://business.facebook.com/latest/content_calendar?asset_id=1077889492066752&business_id=740081945708518` o la lista de programados. Di **hasta qué día hay posts** (Meta deja programar hasta 29 días vista) y si algún día tiene más o menos de 2.

- **Historias** (1 al día, FB + IG): en el calendario salen como un elemento por la tarde (~7:40 pm). Di hasta qué día hay historias. Si quedan menos de 7 días, propón una tanda nueva: las imágenes se generan con `.tmp-posts/carruseles/stories.js` (1080×1920, páginas reales del PDF) y se programan en `https://business.facebook.com/latest/story_composer/?asset_id=1077889492066752&business_id=740081945708518` → «Programar», fecha por JS (setter nativo + evento `input` en los dos `input[placeholder="dd/mm/aaaa"]`), botón «Programar» del final. La hora por defecto es la actual; con la pestaña oculta no se puede cambiar.
- Seguidores: la página de Facebook y la cuenta de Instagram tenían 0 y 1 seguidores el 27/09/2026. Mira cuántos hay ahora (inicio de Business Suite).

**Pinterest** (cuenta `yalosabiaapp`):
- `https://www.pinterest.com/business/analytics/` (impresiones, clics salientes, guardados) y el perfil `https://www.pinterest.com/yalosabiaapp/` para contar pines. Las cuentas nuevas tardan semanas en tener impresiones: dilo si sale todo a 0.

**TikTok**: aún no hay cuenta (los 5 vídeos están en `.tmp-posts/tiktok/out/`).

## 5. Web y otros (rápido)

- `curl -s -o /dev/null -w "%{http_code}" https://www.yalosabia.com/` debe dar 200.
- PRs abiertas: `gh pr list`. Pendientes del proyecto: sección «Pendiente» de `CLAUDE.md` y `docs/GUIA-YALOSABIA.md`.

## Formato del resumen

Español de México, sin emojis, corto (se lee en el móvil). Números reales; si un dato no se pudo
obtener, dilo en vez de inventarlo.

```
**Resumen YaLoSabía · <periodo>**

**Ventas (Stripe):** N ventas reales, $X MXN. <reembolsos/disputas si hay>
**Anuncios (Meta):** $gastado · N clics · $/clic · N visitas · estado <y avisos>
**Web (PostHog):** N visitantes → N chats subidos → N adelantos → N pagos abiertos → N compras
  · de dónde vienen · scroll/tiempo · fallos al subir y por qué · tutorial
**Redes:** FB e IG: últimos posts y cómo van · programado hasta <fecha>. Pinterest: <datos>.
**Lo que llama la atención:** 2-3 frases (lo bueno y lo malo).

**3 próximos pasos**
1. <lo que más mueve las ventas, concreto, con quién lo hace: yo / tú>
2. ...
3. ...
```

Los próximos pasos se priorizan por impacto en ventas: primero lo que rompe el embudo (visitas que no
suben el chat, chats que fallan, pagos que no se completan), luego tráfico (anuncios, contenido) y
por último lo demás. Marca lo que Javi tiene que hacer él (claves, pagos, cuentas).
