// Correos de «Háganlo luego». Una sola fuente para el E0 (lo manda /api/lead, lib/brevo.ts) y para E1–E6
// (plantillas de Brevo: node scripts/brevo-plantillas.mjs). HTML de tablas con estilos en línea para que se vea
// igual en Gmail, Outlook y Apple Mail. La cabecera de cada correo es una imagen (letra a mano, papel rayado)
// en public/email/, porque los clientes de correo no cargan la fuente Caveat.
// Solo sintaxis de TS que Node puede ejecutar directamente (sin enums ni parámetros de clase).

const SITE = 'https://www.yalosabia.com';
const INK = '#3B0A12';
const RED = '#C8102E';
const MUTED = '#8A5A61';
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export type Email = { name: string; subject: string; preheader: string; html: string };

const link = (campaign: string, extra = '#subir') =>
  `${SITE}/?utm_source=email&utm_medium=lead&utm_campaign=${campaign}${extra}`;

const p = (html: string, extra = '') =>
  `<p style="margin:0 0 16px;font-family:${SERIF};font-size:17px;line-height:1.65;color:${INK};${extra}">${html}</p>`;

const a = (href: string, text: string) =>
  `<a href="${href}" style="color:${RED};text-decoration:underline;">${text}</a>`;

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 10px;"><tr>
<td align="center" bgcolor="${RED}" style="border-radius:999px;">
<a href="${href}" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table>`;
}

const reassure = (text = 'Gratis &middot; sin registrarse &middot; su chat se lee en su teléfono') =>
  `<p style="margin:0 0 6px;text-align:center;font-family:${SANS};font-size:13px;color:${MUTED};">${text}</p>`;

function steps(items: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;background:#FFF6F4;border:1px solid #F1D3CE;border-radius:12px;">
${items.map((t, i) => `<tr><td width="34" valign="top" style="padding:${i ? 12 : 18}px 0 ${i === items.length - 1 ? 18 : 0}px 18px;">
<div style="width:28px;height:28px;line-height:28px;border-radius:50%;background:${RED};color:#FFFFFF;text-align:center;font-family:${SANS};font-size:14px;font-weight:bold;">${i + 1}</div></td>
<td valign="top" style="padding:${i ? 12 : 18}px 18px ${i === items.length - 1 ? 18 : 0}px 12px;font-family:${SERIF};font-size:16px;line-height:1.55;color:${INK};">${t}</td></tr>`).join('\n')}
</table>`;
}

function pages(list: { src: string; label: string }[], href: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr>
${list.map(pg => `<td width="33%" align="center" valign="top" style="padding:0 5px;">
<a href="${href}" style="text-decoration:none;"><img src="${SITE}/diario/${pg.src}.jpg" width="160" alt="${pg.label}" style="display:block;width:100%;max-width:160px;height:auto;border:1px solid #EAD0CB;border-radius:4px;"></a>
<div style="padding-top:8px;font-family:${SANS};font-size:12px;line-height:1.35;color:${MUTED};">${pg.label}</div></td>`).join('\n')}
</tr></table>`;
}

function layout(o: { hero: string; heroAlt: string; preheader: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>YaLoSabía</title></head>
<body style="margin:0;padding:0;background:#F7E4E0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F7E4E0;">${o.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7E4E0;"><tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
<tr><td style="padding:0;"><a href="${SITE}/?utm_source=email&utm_medium=lead"><img src="${SITE}/email/${o.hero}.jpg" width="600" alt="${o.heroAlt}" style="display:block;width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:30px 36px 12px;">
${o.body}
</td></tr>
<tr><td style="padding:8px 36px 30px;">
<p style="margin:0;font-family:${SERIF};font-size:16px;font-style:italic;color:${RED};">Con cariño,<br>YaLoSabía</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;"><tr><td align="center" style="padding:22px 20px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
<a href="${SITE}/?utm_source=email&utm_medium=lead" style="color:${MUTED};text-decoration:none;font-weight:bold;">yalosabia.com</a> &middot; el diario de su relación, escrito con su chat de WhatsApp<br>
${o.footer}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// Caja con el código del 15% (sale del E0 con el código real, y de E1/E2 con las variables de Brevo)
function codeBox(code: string, percent: string, until: string, href: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;"><tr>
<td align="center" style="padding:20px 18px;border:2px dashed ${RED};border-radius:12px;background:#FFFFFF;">
<div style="font-family:${SANS};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};">Su ${percent}% de descuento</div>
<div style="font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:bold;letter-spacing:3px;color:${RED};padding:8px 0 6px;">${code}</div>
<div style="font-family:${SANS};font-size:13px;line-height:1.5;color:${MUTED};">Vale hasta el ${until} &middot; un solo uso<br><a href="${href}" style="color:${RED};">Entren con este enlace</a> y se aplica solo, o escríbanlo al pagar</div>
</td></tr></table>`;
}
// En la secuencia de Brevo el código es un atributo del contacto; si no tiene (Stripe falló), no sale la caja
const BREVO_CODE = '{{ contact.CODIGO }}';
const brevoCodeBox = (href: string) => `{% if contact.CODIGO %}${codeBox(BREVO_CODE, '15', '{{ contact.CODIGO_CADUCA }}', href)}{% endif %}`;

const HOWTO = [
  '<b>En WhatsApp</b>, abran su chat.',
  '<b>Android:</b> los tres puntos &rsaquo; Más &rsaquo; Exportar chat &rsaquo; Sin archivos.<br><b>iPhone:</b> toquen el nombre arriba &rsaquo; Exportar chat &rsaquo; Sin archivos.',
  '<b>Suban el archivo</b> en yalosabia.com y en un minuto ven su adelanto.',
];

// Pie de los correos de la secuencia (Brevo cambia {{ unsubscribe }} por el enlace de baja)
const SEQ_FOOTER = 'Recibes este correo porque pediste el enlace en yalosabia.com. <a href="{{ unsubscribe }}" style="color:#8A5A61;">Darme de baja</a>';
// El E0 va por la API transaccional, que no tiene enlace de baja automático
const E0_FOOTER = 'Recibes este correo porque pediste el enlace en yalosabia.com. Si no quieres recibir más, responde «baja».';

export function emailE0(offer: { code: string; percent: number; expires: string } | null = null): Email {
  const c = 'e0';
  const go = offer ? link(c, `&c=${offer.code}#subir`) : link(c);
  return {
    name: 'YLS E0 - El enlace',
    subject: offer ? 'Su diario y su 15% de descuento' : 'Su diario, cuando tengan un minuto',
    preheader: 'Tres pasos y un par de minutos. Aquí está el enlace.',
    html: layout({
      hero: 'e0', heroAlt: 'Querido diario: hoy vamos a leer nuestra historia', preheader: 'Tres pasos y un par de minutos. Aquí está el enlace.',
      body:
        p('Hola:') +
        p(offer
          ? 'Aquí tienen el enlace para hacer el diario de su relación y, como lo prometido es deuda, su código de descuento:'
          : 'Aquí tienen el enlace para hacer el diario de su relación. Cuando tengan el chat a mano, son tres pasos:') +
        (offer ? codeBox(offer.code, String(offer.percent), offer.expires, go) + p('Cuando tengan el chat a mano, son tres pasos:') : '') +
        steps(HOWTO) +
        button(go, 'Ver nuestro adelanto gratis') +
        reassure() +
        p(`¿Se atoran exportando el chat? ${a(link(c, '&tutorial=1'), 'Vean el tutorial en video')} (dura un minuto).`, 'margin-top:22px;font-size:15px;color:#6B3A42;'),
      footer: E0_FOOTER,
    }),
  };
}

export function emailE1(): Email {
  const c = 'e1';
  const go = link(c, `&c=${BREVO_CODE}#subir`);
  return {
    name: 'YLS E1 - Exportar el chat',
    subject: '¿Ya tienen su chat a mano?',
    preheader: 'Exportarlo tarda menos de lo que parece. Así se hace.',
    html: layout({
      hero: 'e1', heroAlt: '¿Ya tienen su chat a mano?', preheader: 'Exportarlo tarda menos de lo que parece. Así se hace.',
      body:
        p('Hola:') +
        p('Hace un par de días nos pidieron el enlace para hacer su diario. Por si se quedó pendiente: exportar el chat tarda menos de lo que parece.') +
        steps(HOWTO) +
        p('En cuanto lo suban verán el índice de su relación, cuántos mensajes se han mandado y quién suele escribir primero. Todo eso es gratis.') +
        brevoCodeBox(go) +
        button(go, 'Ver nuestro adelanto gratis') +
        reassure() +
        p(`Si prefieren verlo antes: ${a(link(c, '&tutorial=1'), 'tutorial en video de un minuto')}.`, 'margin-top:22px;font-size:15px;color:#6B3A42;'),
      footer: SEQ_FOOTER,
    }),
  };
}

export function emailE2(): Email {
  const c = 'e2';
  const go = link(c, `&c=${BREVO_CODE}#subir`);
  return {
    name: 'YLS E2 - Lo que trae el diario',
    subject: 'Lo que cabe en 14 páginas',
    preheader: 'Cómo empezó todo, quién es quién y si van a durar.',
    html: layout({
      hero: 'e2', heroAlt: 'Lo que cabe en 14 páginas', preheader: 'Cómo empezó todo, quién es quién y si van a durar.',
      body:
        p('Hola:') +
        p('Les enseñamos lo que trae el diario para que sepan qué esperar. Estas son páginas de un diario de ejemplo:') +
        pages([
          { src: 'como-empezo', label: 'Cómo empezó todo' },
          { src: 'dias-que-recordar', label: 'Días que recordar' },
          { src: 'compatibilidad', label: 'Qué tan compatibles son' },
        ], link(c, '#indice')) +
        p('Y además: quién es quién en la relación, cómo se hablan, cuánto tardan en contestarse, las palabras que más usan, las señales a cuidar, si van a durar y unos consejos. Al final, el mensaje de ustedes que más vale guardar.') +
        p('Todo sale de sus propios mensajes: cada frase que citamos existe tal cual en su chat.') +
        '{% if contact.CODIGO %}' + p('Su código del 15% vence en dos días, el {{ contact.CODIGO_CADUCA }}:', 'margin-bottom:10px;') + '{% endif %}' +
        brevoCodeBox(go) +
        button(go, 'Hacer nuestro diario') +
        reassure('Adelanto gratis &middot; diario completo en PDF: $199 MXN, un solo pago') +
        p(`${a(link(c, '#indice'), 'Ver las 14 páginas del ejemplo')}`, 'margin-top:22px;font-size:15px;text-align:center;'),
      footer: SEQ_FOOTER,
    }),
  };
}

// Después de E2 (el código ya caducó): uno por semana durante 4 semanas, sin código, cada uno con un motivo distinto
export function emailE3(): Email {
  const c = 'e3';
  const go = link(c);
  return {
    name: 'YLS E3 - Lo que su chat sabe',
    subject: 'Lo que su chat sabe de ustedes',
    preheader: 'Quién escribe primero, a qué hora se extrañan y la palabra que más repiten.',
    html: layout({
      hero: 'e3', heroAlt: 'Lo que su chat sabe de ustedes', preheader: 'Quién escribe primero, a qué hora se extrañan y la palabra que más repiten.',
      body:
        p('Hola:') +
        p('Su chat de WhatsApp guarda cosas que ustedes ya no recuerdan: quién escribió primero, el día que más se escribieron, a qué hora se buscan y la palabra que más se repite entre los dos.') +
        pages([
          { src: 'quien-es-quien', label: 'Quién es quién' },
          { src: 'cuando-contestan', label: 'Cuánto tardan en contestar' },
          { src: 'sus-palabras', label: 'Sus palabras' },
        ], link(c, '#indice')) +
        p('El adelanto les da su índice de pareja de 0 a 100 y un par de datos curiosos. Es gratis y tarda un minuto.') +
        button(go, 'Ver nuestro adelanto gratis') +
        reassure() +
        p(`¿No saben cómo sacar el chat? ${a(link(c, '&tutorial=1'), 'Tutorial en video de un minuto')}.`, 'margin-top:22px;font-size:15px;color:#6B3A42;'),
      footer: SEQ_FOOTER,
    }),
  };
}

export function emailE4(): Email {
  const c = 'e4';
  const go = link(c);
  return {
    name: 'YLS E4 - Un regalo que no se compra',
    subject: 'Un regalo que no se compra en ninguna tienda',
    preheader: 'Su historia en 14 páginas, con una carta para cada uno.',
    html: layout({
      hero: 'e4', heroAlt: 'Un regalo que no se compra', preheader: 'Su historia en 14 páginas, con una carta para cada uno.',
      body:
        p('Hola:') +
        p('Si tienen un aniversario cerca, o simplemente ganas de tener algo bonito, el diario es un regalo que no se encuentra en ninguna tienda: su historia contada con sus propios mensajes.') +
        pages([
          { src: 'portada', label: 'La portada, con su primer mensaje' },
          { src: 'dias-que-recordar', label: 'Los días que no quieren olvidar' },
          { src: 'el-mensaje', label: 'El mensaje que más vale guardar' },
        ], link(c, '#indice')) +
        p('Y al final, de regalo, una carta para cada uno escrita a partir de lo que se han dicho. Lo pueden imprimir o leer juntos en el teléfono.') +
        button(go, 'Empezar por el adelanto gratis') +
        reassure('Adelanto gratis &middot; diario completo en PDF: $199 MXN, un solo pago'),
      footer: SEQ_FOOTER,
    }),
  };
}

export function emailE5(): Email {
  const c = 'e5';
  const go = link(c);
  return {
    name: 'YLS E5 - Su chat es suyo',
    subject: '¿Qué pasa con su chat cuando lo suben?',
    preheader: 'El adelanto se calcula en su teléfono y, si el diario no les gusta, les devolvemos el dinero.',
    html: layout({
      hero: 'e5', heroAlt: 'Su chat es suyo', preheader: 'El adelanto se calcula en su teléfono y, si el diario no les gusta, les devolvemos el dinero.',
      body:
        p('Hola:') +
        p('Antes de subir su chat es normal preguntarse qué pasa con él. Se lo contamos sin letra chiquita:') +
        steps([
          '<b>El adelanto se calcula en su propio teléfono.</b> Para verlo, su chat no sale de ahí.',
          '<b>Para escribir el diario</b> (solo si lo compran), sus mensajes pasan una vez por nuestro servidor y una parte por la IA que lo redacta. No los guardamos.',
          '<b>El pago va con Stripe</b>: nunca vemos su tarjeta. Y si el diario no les gusta, les devolvemos el dinero dentro de los 30 días.',
        ]) +
        p(`Más detalles en ${a(SITE + '/privacidad.html', 'nuestra política de privacidad')}.`, 'font-size:15px;') +
        button(go, 'Ver nuestro adelanto gratis') +
        reassure(),
      footer: SEQ_FOOTER,
    }),
  };
}

export function emailE6(): Email {
  const c = 'e6';
  const go = link(c);
  return {
    name: 'YLS E6 - Una última nota',
    subject: '¿Van a durar? (una última nota)',
    preheader: 'Es el último correo que les mandamos. El enlace se queda aquí.',
    html: layout({
      hero: 'e6', heroAlt: 'Una última nota', preheader: 'Es el último correo que les mandamos. El enlace se queda aquí.',
      body:
        p('Hola:') +
        p('Una de las páginas del diario se llama «¿Van a durar?»: una lectura honesta de cómo se hablan, lo que va bien y lo que conviene cuidar. No es para acusar a nadie, es para darse cuenta.') +
        pages([
          { src: 'van-a-durar', label: '¿Van a durar?' },
          { src: 'senales', label: 'Las señales a cuidar' },
          { src: 'consejos', label: 'Consejos para ustedes dos' },
        ], link(c, '#indice')) +
        button(go, 'Ver nuestro adelanto gratis') +
        reassure() +
        p('Este es el último correo que les mandamos; no queremos llenarles la bandeja. El enlace sigue aquí para cuando quieran.', 'margin-top:22px;font-size:15px;color:#6B3A42;'),
      footer: SEQ_FOOTER,
    }),
  };
}

// Recordatorios: E1 a los 2 días, E2 a los 5 y luego E3–E6 uno por semana (días 12, 19, 26 y 33). El E0 sale al momento.
// Correo con el diario en PDF adjunto (lo manda /api/send-diary al correo de la compra).
// A propósito sin cabecera, botones ni pie de boletín: un correo corto y personal, con versión en texto,
// para que Gmail lo deje en Principal y no en Promociones (es lo que compraron).
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function emailDiary(names = ''): Email & { text: string } {
  const who = names ? 'el diario de ' + names : 'su diario';
  const lines = [
    'Hola:',
    'Aquí está ' + who + ', en el PDF adjunto. Así lo tienen guardado aunque cambien de teléfono o se les pierda la descarga.',
    'Es una versión un poco más ligera que la que descargaron, para que quepa en el correo. Las páginas y los textos son los mismos.',
    'Si algo no salió bien, respondan a este correo y lo vemos. Y si no les gusta, les devolvemos el dinero dentro de los 30 días siguientes a la compra.',
    'Un abrazo,\nJavi, de YaLoSabía',
  ];
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222;max-width:560px;">'
    + lines.map(l => '<p style="margin:0 0 14px;">' + esc(l).replace(/\n/g, '<br>') + '</p>').join('')
    + '</div>';
  return {
    name: 'YLS - Su diario en PDF',
    subject: names ? 'El diario de ' + names : 'Su diario, para guardarlo',
    preheader: '',
    html,
    text: lines.join('\n\n'),
  };
}

export const SEQUENCE = [emailE1, emailE2, emailE3, emailE4, emailE5, emailE6];
