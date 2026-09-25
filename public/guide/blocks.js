/*
 * blocks.js — la biblioteca de la guía. Es el producto.
 *
 * Cada patrón que el motor puede detectar tiene aquí un bloque completo:
 * qué suele significar, qué no significa, cuándo es normal, cuándo preocupa,
 * qué hacer, una conversación con guion y acciones para el plan de 30 días.
 * Con esto solo ya sale una guía entera aunque la IA no responda.
 *
 * Reglas de redacción (las comprueba tests/guide.test.mjs):
 *   - Segunda persona, cálida, sin culpar a nadie.
 *   - Sin etiquetas clínicas ni de meme: nada de «tóxico», «narcisista»,
 *     «apego ansioso», «red flag», «gaslighting».
 *   - No se le dice a nadie qué hacer con su relación: se le dan herramientas.
 *   - Quien lee puede ser cualquiera de las dos personas, así que cuando un
 *     patrón tiene dos lados se habla a los dos («si eres quien…»).
 *   - Español neutro, sin formas de vosotros.
 *
 * Las llaves {asi} se rellenan con los datos del chat en assemble.js.
 */
(function (root) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
   * PATRONES QUE MERECEN ATENCIÓN
   * ───────────────────────────────────────────────────────────── */
  const CONCERNS = {

    iniciativa: {
      title: 'Quién busca a quién',
      calm: 'En su caso no hay un desequilibrio marcado: los dos abren conversaciones con regularidad. Es una buena base. La iniciativa compartida hace que ninguno tenga que preguntarse si el otro le buscaría, y esa duda, cuando aparece, desgasta más que casi cualquier otra cosa en un chat. Si alguna temporada el reparto se inclina, que no les preocupe: lo que cuenta es que vuelva a equilibrarse.',
      significa: [
        'Abrir una conversación es un gesto pequeño que dice «pensé en ti». Cuando casi siempre lo hace la misma persona, la conversación empieza a apoyarse en un solo lado. Quien abre suele acabar sintiendo que empuja, y quien responde puede no darse cuenta de que el reparto se ha inclinado, porque desde su lado la conversación existe y funciona.',
        'Lo que mide este dato es quién rompe el silencio después de varias horas sin mensajes. No mide cuánto le importa la relación a cada uno, ni quién piensa más en el otro: mide quién lo convierte en mensaje.'
      ],
      noSignifica: [
        'No significa que quien abre menos quiera menos. Hay personas que no inician por timidez, por no molestar, porque sienten que el otro siempre se adelanta o porque en su casa nadie escribía «¿cómo va tu día?». También hay quien expresa el interés de otras formas: llamando, apareciendo, haciendo planes en persona.',
        'Tampoco significa que quien abre más sea «el que ama más» o «el que pierde». Esa lectura convierte un hábito en un marcador, y los marcadores rara vez ayudan a una pareja.'
      ],
      normal: [
        'Es habitual que una persona inicie más, sobre todo si tiene horarios más libres, si trabaja con el celular a mano o si simplemente es más de escribir. Un reparto de 60/40 es muy común en parejas que se sienten bien. También es normal que cambie por temporadas: exámenes, un trabajo nuevo, un duelo o un bebé mueven el reparto sin que la relación cambie.'
      ],
      preocupa: [
        'Merece atención cuando el reparto es muy desigual y además se sostiene durante meses, cuando antes era más parejo y se ha ido inclinando, o cuando quien abre empieza a hacerse preguntas del tipo «¿y si dejo de escribir, me escribiría?». Esa pregunta, más que el porcentaje, es la señal: indica cansancio.'
      ],
      queHacer: [
        'Si eres quien abre casi siempre: antes de sacar conclusiones, observa una semana sin cambiar nada y apunta cuándo te buscan. A veces el otro sí inicia, pero por otros canales o en persona. Luego dilo como una necesidad, no como una cuenta pendiente: «me hace bien cuando me escribes tú primero» funciona mucho mejor que «siempre soy yo».',
        'Si eres quien abre menos: pregúntate qué te frena. Si es costumbre, un mensaje breve a media mañana basta; no hace falta tener nada importante que contar. Si es que no sabes qué decir, preguntar por algo concreto que te contó el día anterior es la forma más sencilla de demostrar que te acuerdas.',
        'En los dos casos: no conviertan el porcentaje en una competencia. El objetivo no es llegar al 50/50, es que ninguno de los dos sienta que sostiene la conversación en solitario.'
      ],
      conversation: {
        title: 'Hablar de quién busca a quién',
        porque: 'Porque el desequilibrio en la iniciativa se nota antes de que se diga, y cuando se calla suele salir más tarde en forma de reproche.',
        cuando: 'En un momento tranquilo y en persona, no justo después de un día en el que no te escribió. Mejor un fin de semana que un martes a las once de la noche.',
        abrir: [
          { si: 'Si eres quien más escribe primero', guion: 'Quiero contarte algo sin que suene a queja. Me he dado cuenta de que casi siempre soy yo quien te escribe primero, y a veces me quedo con la duda de si te apetece hablar. Me haría bien que de vez en cuando me buscaras tú. ¿Cómo lo vives tú?' },
          { si: 'Si eres quien menos escribe primero', guion: 'He visto que casi siempre eres tú quien me escribe primero y no quiero que sientas que sostienes sola o solo la conversación. A veces no te escribo porque siento que ya lo vas a hacer tú, no porque no piense en ti. ¿Te pesa? Me gustaría hacerlo mejor.' }
        ],
        escuchar: 'Escucha la razón que da la otra persona antes de responder. «No se me ocurre» y «siento que te molesto» piden cosas distintas.',
        evitar: 'Evita los números como prueba («el 80 % de las veces»). Sirven para que tú lo entiendas; en la conversación suenan a juicio.'
      },
      actions: [
        { week: 1, text: 'Durante siete días no cambies nada: apunta quién escribe primero cada día y a qué hora.' },
        { week: 1, text: 'Si eres quien abre casi siempre, prueba dos días a no iniciar tú y observa sin sacar conclusiones.' },
        { week: 2, text: 'Ten la conversación sobre quién busca a quién, usando el guion de la sección 13 como punto de partida.' },
        { week: 3, text: 'Si eres quien abre menos, escribe tú primero al menos tres días esta semana, aunque sea un mensaje breve.' },
        { week: 4, text: 'Vuelve a mirar tus notas de la primera semana y compáralas con esta. ¿Cambió el reparto? ¿Cambió cómo te sientes?' }
      ]
    },

    respuesta: {
      title: 'El tiempo que tardan en contestarse',
      calm: 'En su caso los tiempos de respuesta no muestran una diferencia preocupante ni un cambio brusco con el tiempo. Eso significa que la espera no es un tema entre ustedes, o al menos no lo es en los datos. Recuerda que el ritmo depende mucho de las circunstancias: si cambian los horarios de alguno, es normal que cambie también, y basta con hablarlo.',
      significa: [
        'El tiempo de respuesta es una de las cosas que más se notan en un chat, porque se vive en carne propia: el mensaje enviado, el doble check, la espera. Cuando una persona contesta mucho más despacio que la otra, o cuando alguien tarda cada vez más, quien espera suele rellenar el hueco con explicaciones, y casi nunca son amables.',
        'Lo que mide este dato es la mediana: el tiempo típico que tarda cada uno en contestar cuando le toca. Se descartan los silencios de más de dos días, que se analizan aparte, para que un fin de semana sin mensajes no distorsione el ritmo del día a día.'
      ],
      noSignifica: [
        'No significa desinterés por sí solo. El ritmo de respuesta depende muchísimo del trabajo, de si se puede usar el celular, de si una persona prefiere contestar con calma o de si sencillamente no vive pendiente de las notificaciones. Hay quien tarda horas y está completamente presente cuando por fin escribe.',
        'Tampoco significa que quien contesta rápido esté «más enganchado». Contestar al momento es, muchas veces, solo una costumbre.'
      ],
      noteTrend: 'Cuando lo que cambia es el ritmo de una misma persona, antes rápido y ahora lento, el dato dice algo distinto: no habla de cómo es, sino de algo que ha cambiado en su vida o en la relación. Merece una pregunta, no una conclusión.',
      normal: [
        'Es normal que una persona sea más lenta en horario de trabajo y rápida por la noche, o al revés. Es normal que el ritmo baje después de los primeros meses: al principio todo es urgente, y con el tiempo la conversación se vuelve más tranquila. Una diferencia de minutos no es un problema; una diferencia de horas sostenida, a veces sí.'
      ],
      preocupa: [
        'Merece atención cuando la diferencia es grande y sostenida, cuando el ritmo de alguien ha pasado de minutos a horas sin un cambio de circunstancias que lo explique, o cuando la espera ya genera ansiedad en quien escribe. También cuando la lentitud aparece sobre todo con ciertos temas: eso se mira en la sección de ritmos y en la de temas.'
      ],
      queHacer: [
        'Si eres quien espera: separa lo que sabes de lo que imaginas. Sabes que tarda; no sabes por qué. Antes de interpretarlo, pregunta por su contexto: «¿cómo están tus días últimamente?» abre más puertas que «¿por qué tardas tanto?».',
        'Si eres quien tarda: no hace falta contestar al momento, pero sí ayuda avisar. Un «tengo mucho trabajo, te escribo en la noche con calma» cuesta cinco segundos y quita horas de incertidumbre al otro lado.',
        'Si el ritmo ha cambiado mucho, háblenlo en persona. El chat es el peor sitio para preguntar por qué alguien tarda en contestar en el chat.'
      ],
      conversation: {
        title: 'Hablar de los tiempos de respuesta',
        porque: 'Porque la espera sin contexto se llena de historias, y es mucho más fácil acordar expectativas que adivinarlas.',
        cuando: 'Cuando estén juntos y sin prisa. Nunca mientras esperas una respuesta.',
        abrir: [
          { si: 'Si eres quien espera', guion: 'Me gustaría hablar de algo pequeño que me pesa más de lo que parece. Cuando tardas mucho en contestar me pongo a imaginar cosas, y sé que muchas veces no tienen nada que ver con lo que pasa. ¿Cómo son tus días ahora? Me ayudaría entender tu ritmo, y quizá acordar algo tan simple como un aviso cuando vas a tardar.' },
          { si: 'Si eres quien tarda', guion: 'Sé que a veces tardo mucho en contestarte y quiero explicarte por qué, para que no lo leas como falta de interés. Te pregunto también cómo lo vives tú. Si te ayuda, puedo avisarte cuando sé que voy a estar desconectado.' }
        ],
        escuchar: 'Escucha si lo que la otra persona necesita es rapidez o certeza. Casi siempre es certeza: saber que el silencio no significa nada malo.',
        evitar: 'Evita pedir tiempos concretos («contéstame en menos de una hora»). Las reglas rígidas se rompen y luego pesan el doble.'
      },
      actions: [
        { week: 1, text: 'Observa en qué momentos del día contestan más rápido y más despacio. Apunta si coincide con trabajo, transporte o cansancio.' },
        { week: 2, text: 'Hablen de sus ritmos: qué horarios tiene cada uno y qué esperan del chat en esos horarios.' },
        { week: 3, text: 'Prueben un acuerdo sencillo durante la semana: avisar con un mensaje corto cuando se va a tardar más de lo habitual.' },
        { week: 4, text: 'Valoren si el acuerdo cambió algo en cómo se siente la espera, aunque los tiempos sean parecidos.' }
      ]
    },

    doubleTexting: {
      title: 'Hablar sin recibir respuesta',
      calm: 'En su caso las rachas de mensajes seguidos sin respuesta son pocas o están repartidas entre los dos. Nadie parece estar sosteniendo la conversación a base de insistir. Si alguno escribe en ráfagas, parece más una forma de contar las cosas que una forma de pedir atención.',
      significa: [
        'Este dato cuenta las rachas de cinco o más mensajes seguidos de una persona sin que la otra conteste en medio. Una racha así puede ser entusiasmo, una historia larga contada por partes o, a veces, la sensación de estar hablando sola o solo.',
        'Cuando las rachas se concentran en una misma persona y aumentan con el tiempo, suelen indicar que esa persona está intentando sostener la conversación, llenando el espacio que el otro deja.'
      ],
      noSignifica: [
        'No significa que quien escribe en ráfagas sea demasiado intensa o intenso, ni que quien no contesta en medio esté ignorando. Mucha gente escribe así: una idea por mensaje. Y hay quien lee todo de golpe y responde al final con un solo mensaje largo.'
      ],
      normal: [
        'Es completamente normal cuando se cuenta algo emocionante, cuando se manda una lista de cosas o cuando la otra persona está ocupada y se le deja todo para que lo lea después. También es normal si ambos lo hacen por igual: es su forma de escribirse.'
      ],
      preocupa: [
        'Merece atención cuando casi todas las rachas son de la misma persona, cuando terminan sin respuesta o con una respuesta mínima, o cuando quien las escribe siente que tiene que insistir para que le hagan caso. En ese caso lo importante no es la racha, es la sensación de insistir.'
      ],
      queHacer: [
        'Si eres quien escribe las rachas: fíjate en cómo terminan. Si suelen acabar con una respuesta cálida, probablemente es tu estilo y está bien. Si suelen acabar en silencio, pregúntate qué buscas con ellas y si podrías pedirlo directamente.',
        'Si eres quien las recibe: una respuesta breve que demuestre que leíste todo («me encantó lo que me contaste del trabajo, luego me sigues contando») vale más que contestar cada mensaje.',
        'Para los dos: acordar un momento del día para hablar con calma reduce la necesidad de contarlo todo en el momento.'
      ],
      conversation: {
        title: 'Hablar de sentirse escuchado en el chat',
        porque: 'Porque sentir que se habla solo desgasta, y quien lo siente suele callarlo para no parecer demandante.',
        cuando: 'En persona, en un momento en el que ninguno de los dos esté ocupado con el celular.',
        abrir: [
          { si: 'Si eres quien escribe más seguido', guion: 'A veces te escribo muchas cosas seguidas y me quedo sin saber si las leíste o si te agobian. No te pido que contestes todo, pero me ayudaría saber que estás del otro lado. ¿Cómo lo ves tú?' },
          { si: 'Si eres quien recibe los mensajes', guion: 'Me di cuenta de que a veces me escribes varias cosas y yo contesto poco o nada. Quiero que sepas que sí las leo. ¿Te hace sentir que no te hago caso? Me gustaría encontrar una forma que nos funcione a los dos.' }
        ],
        escuchar: 'Escucha si lo que falta es respuesta o reconocimiento. A veces basta un «te leí».',
        evitar: 'Evita decir «es que escribes demasiado». Aunque sea verdad para ti, se oye como «me molestas».'
      },
      actions: [
        { week: 1, text: 'Cuando escribas varias cosas seguidas, fíjate en cómo te sientes mientras esperas la respuesta.' },
        { week: 2, text: 'Hablen de cómo prefiere cada uno contar las cosas: por partes en el momento o todo junto más tarde.' },
        { week: 3, text: 'Si eres quien recibe las rachas, contesta al menos una vez al día con algo que demuestre que leíste todo.' },
        { week: 4, text: 'Comprueben si las rachas sin respuesta bajaron y, sobre todo, si la sensación de hablar solo cambió.' }
      ]
    },

    silencios: {
      title: 'Los silencios largos',
      calm: 'En su caso los silencios largos son pocos o poco frecuentes para la duración del periodo. Los días sin mensajes que aparecen se explican bien por viajes, días intensos o simplemente por estar juntos. No hay señales de que el silencio se use para marcar distancia.',
      significa: [
        'Un silencio largo es un periodo de dos días o más sin un solo mensaje entre ustedes. En una pareja que se escribe a diario, estos huecos destacan, y el dato que más dice no es cuántos hay, sino cómo terminan: quién los rompe y cómo.',
        'Cuando casi siempre los rompe la misma persona, esa persona está haciendo un trabajo invisible: decidir que el silencio ya duró suficiente. Con el tiempo, ese trabajo cansa.'
      ],
      noSignifica: [
        'No significa necesariamente enfado ni distancia. Viajes, días de mucho trabajo, vivir juntos o verse en persona producen silencios en el chat que no son silencios en la relación. Si pasaron esos días juntos, el chat no lo sabe.'
      ],
      normal: [
        'Es normal que haya silencios si se ven a menudo en persona, si uno de los dos no es de escribir o si hubo un periodo de mudanza, enfermedad o viaje. También es normal que haya algún silencio después de una discusión: a veces es la forma de enfriar el momento antes de hablar.'
      ],
      preocupa: [
        'Merece atención cuando los silencios se vuelven más frecuentes o más largos con el tiempo, cuando siempre los rompe la misma persona, o cuando se usan como castigo: dejar de hablar para que el otro sienta la ausencia. Si reconoces este último patrón, en cualquiera de los dos lados, vale la pena hablarlo pronto.'
      ],
      queHacer: [
        'Si eres quien suele romper los silencios: piensa si te gustaría que alguna vez lo hiciera la otra persona y díselo. Romper siempre el hielo también es una forma de cuidar, pero no tiene por qué ser siempre tuya.',
        'Si eres quien suele dejarlos correr: pregúntate qué pasa en esos días. Si es que necesitas espacio, está bien, pero dilo antes de tomarlo: «estos días voy a estar desconectado, no es por ti» evita que el otro lo viva como un abandono.',
        'Si los silencios aparecen después de las discusiones, acuerden cómo quieren manejarlos: cuánto tiempo necesita cada uno y quién retoma.'
      ],
      conversation: {
        title: 'Hablar de los días sin hablar',
        porque: 'Porque un silencio sin explicar se vive de forma muy distinta a cada lado, y acordar cómo manejar la distancia evita que se convierta en un pulso.',
        cuando: 'Nunca en medio de un silencio. Después, cuando todo esté tranquilo.',
        abrir: [
          { si: 'Si eres quien suele romperlos', guion: 'Quiero hablarte de los días en los que no nos escribimos. Casi siempre soy yo quien retoma, y a veces me pregunto si me esperas o si ni lo notas. No te lo reprocho: quiero entender cómo lo vives tú. ¿Qué pasa de tu lado en esos días?' },
          { si: 'Si eres quien suele dejarlos correr', guion: 'Sé que a veces pasan días sin que te escriba y que casi siempre eres tú quien retoma. Quiero contarte qué me pasa en esos días, porque no tiene que ver con lo que siento por ti. ¿Te preocupan? Podemos acordar algo para que no se sientan como distancia.' }
        ],
        escuchar: 'Escucha si el silencio es necesidad de espacio o una forma de evitar algo. Piden respuestas distintas.',
        evitar: 'Evita preguntar «¿por qué no me escribiste?» como apertura. Pone a la defensiva antes de empezar.'
      },
      actions: [
        { week: 1, text: 'Si llega un silencio de más de un día, no lo rompas enseguida: apunta qué sientes y qué te imaginas.' },
        { week: 2, text: 'Hablen de cómo prefiere cada uno manejar los días de distancia y quién suele retomar.' },
        { week: 3, text: 'Prueben un gesto mínimo para los días ocupados: un solo mensaje de «hoy no puedo, pienso en ti».' },
        { week: 4, text: 'Miren cuántos días sin mensajes hubo este mes y cómo se sintieron comparado con antes.' }
      ]
    },

    nocturna: {
      title: 'Una conversación que vive de noche',
      calm: 'En su caso la conversación no está concentrada en la madrugada: se reparte a lo largo del día. Eso suele indicar que los dos tienen un espacio para el otro en horas normales y que el chat no depende de que el resto del día esté vacío.',
      significa: [
        'Este dato mide qué parte de los mensajes de cada persona se escribe entre las diez de la noche y las seis de la mañana. Cuando una buena parte de la conversación sucede de noche, suele ser porque es el único momento libre, porque las noches invitan a hablar de otra manera o porque durante el día la presencia de uno de los dos es escasa.',
        'La pregunta útil no es «¿por qué de noche?», sino «¿dónde está el resto del día?». Una relación que solo aparece a ciertas horas puede sentirse como una relación a medias, aunque esas horas sean muy buenas.'
      ],
      noSignifica: [
        'No significa que haya algo que ocultar ni que la relación sea menos seria. Horarios de trabajo, turnos, hijos, estudiar, vivir en husos horarios distintos o simplemente ser de noche explican la mayoría de los casos.'
      ],
      normal: [
        'Es normal en parejas a distancia, en personas con turnos o en quien tiene días muy llenos. También es normal que las conversaciones importantes se tengan de noche: es cuando hay calma.'
      ],
      preocupa: [
        'Merece atención si una persona está muy presente de noche y casi ausente durante el día, si esa ausencia diurna es nueva, o si las noches largas de chat están afectando al descanso de alguno de los dos. Dormir poco durante meses cambia el humor y la paciencia, y eso también acaba notándose en la relación.'
      ],
      queHacer: [
        'Mira el reparto por franjas de la sección 05. Si una persona casi desaparece durante el día, pregúntate si es por sus horarios o si ha cambiado algo.',
        'Si las noches están quitándoles horas de sueño, acuerden una hora de despedida. Una buena noche no se mide por lo tarde que acaba.',
        'Si echas de menos presencia durante el día, pídela en pequeño: un mensaje a mediodía, una foto de lo que está haciendo. No hace falta una conversación larga.'
      ],
      conversation: {
        title: 'Hablar de a qué horas están el uno para el otro',
        porque: 'Porque los horarios compartidos son la estructura invisible de una relación, y acordarlos evita que uno sienta que solo existe a ciertas horas.',
        cuando: 'De día, precisamente. Una tarde tranquila.',
        abrir: [
          { si: 'Para cualquiera de los dos', guion: 'Me di cuenta de que casi toda nuestra conversación pasa de noche. Me gustan esos ratos, pero a veces echo de menos saber de ti durante el día. ¿Cómo son tus días ahora? Me encantaría recibir algún mensaje a mediodía, aunque sea corto.' }
        ],
        escuchar: 'Escucha los horarios reales de la otra persona antes de pedir nada. A veces la ausencia tiene una explicación simple.',
        evitar: 'Evita la sospecha como punto de partida. «¿Con quién estás durante el día?» cierra la conversación antes de abrirla.'
      },
      actions: [
        { week: 1, text: 'Observa a qué horas escribe cada uno y apunta cómo te sientes en las horas en las que no hay mensajes.' },
        { week: 2, text: 'Hablen de sus horarios reales y de qué momentos del día les gustaría compartir.' },
        { week: 3, text: 'Prueben una hora de despedida por la noche al menos cuatro días de la semana.' },
        { week: 4, text: 'Valoren si dormir mejor o tener algo de presencia durante el día cambió cómo se sienten.' }
      ]
    },

    enfriamiento: {
      title: 'Menos palabras de afecto que antes',
      calm: 'En su caso el afecto escrito no muestra una caída marcada entre el principio y el final del periodo. Puede haber más o menos, según su estilo, pero no hay una tendencia clara a desaparecer. Si en algún momento notas que el chat se vuelve solo práctico, es fácil de recuperar a propósito.',
      significa: [
        'Este dato compara cuántas palabras y emojis de afecto se usan ahora con cuántos se usaban al principio del periodo: «te quiero», «te extraño», los apodos, los corazones. Cuando bajan mucho, la conversación se vuelve más práctica y más fría en la forma, aunque la relación no necesariamente lo sea.',
        'El afecto escrito es un termómetro imperfecto pero sensible. Suele ser lo primero que cae cuando hay cansancio, rutina o distancia, y también lo primero que se recupera cuando alguien decide cuidarlo.'
      ],
      noSignifica: [
        'No significa que el cariño haya desaparecido. Muchas parejas, con los años, pasan de decirse las cosas por escrito a demostrarlas de otras formas: estando, cocinando, resolviendo. El chat se vuelve logístico porque la vida se vuelve compartida, y eso no es poco.',
        'Tampoco significa que quien usaba más palabras de afecto quiera más. Hay personas que escriben «te quiero» cada día y personas a las que les cuesta escribirlo aunque lo sientan.'
      ],
      normal: [
        'Es normal que el lenguaje de los primeros meses, muy intenso, se suavice. También es normal que baje en épocas de estrés. Lo que cuenta es si sigue habiendo alguna forma de decirse que se quieren, y si a los dos les basta.'
      ],
      preocupa: [
        'Merece atención cuando el afecto casi ha desaparecido de los dos lados, cuando alguien lo echa de menos y no lo dice, o cuando la caída coincide con otras señales: más silencios, respuestas más cortas, menos preguntas. Si solo baja una persona, es una pregunta para esa persona; si bajan las dos, es una pregunta para la pareja.'
      ],
      queHacer: [
        'Pregúntate si lo echas de menos. Si no, quizá su forma de quererse cambió de lugar y está bien. Si sí, es algo que se puede pedir.',
        'Recuperar el afecto escrito no requiere grandes gestos: un mensaje al día sin ninguna función práctica, solo para decir algo bonito, cambia el tono de la semana.',
        'Si eres a quien le cuesta escribirlo, busca tu forma: una foto de algo que te recordó a la otra persona, un «me acordé de ti» o un apodo que solo ustedes usen.'
      ],
      conversation: {
        title: 'Hablar de cómo se dicen que se quieren',
        porque: 'Porque cada persona tiene una forma distinta de sentirse querida, y a veces el afecto está ahí pero en un idioma que el otro no lee.',
        cuando: 'En un buen momento, no después de echar algo de menos. Funciona mejor desde la curiosidad que desde la carencia.',
        abrir: [
          { si: 'Si echas de menos el afecto escrito', guion: 'Estuve pensando en cómo nos hablábamos al principio y en cómo nos hablamos ahora. No creo que nos queramos menos, pero echo de menos que nos digamos cosas bonitas sin motivo. ¿A ti te pasa? ¿Qué te hace sentir querido o querida a ti?' },
          { si: 'Si sientes que ahora lo demuestras de otras formas', guion: 'Creo que ahora te escribo menos cosas cariñosas que antes. Quiero que sepas que no es porque sienta menos. ¿Lo echas de menos? Me gustaría saber qué te llega más a ti: que te lo diga, que te lo demuestre o las dos cosas.' }
        ],
        escuchar: 'Escucha qué gestos hacen que la otra persona se sienta querida. Puede que no tengan nada que ver con los tuyos.',
        evitar: 'Evita comparar con el principio como reproche. «Antes me decías» suena a pérdida; «me gustaba cuando» suena a invitación.'
      },
      actions: [
        { week: 1, text: 'Lee algunos mensajes del principio y de ahora. Apunta qué echas de menos y qué te parece mejor ahora.' },
        { week: 2, text: 'Pregúntale a la otra persona qué le hace sentir querida. Cuéntale qué te lo hace sentir a ti.' },
        { week: 3, text: 'Envía un mensaje al día que no sirva para organizar nada: solo para decir algo bonito.' },
        { week: 4, text: 'Fíjate si el tono de la conversación cambió y si la otra persona respondió en el mismo registro.' }
      ]
    },

    volumen: {
      title: 'Menos conversación que antes',
      calm: 'En su caso el volumen de mensajes no ha caído de forma sostenida. Puede haber meses con más y meses con menos, como en cualquier relación, pero la conversación sigue ocupando un lugar parecido en su día a día.',
      significa: [
        'La línea de vida muestra cuántos mensajes se escriben cada mes. Cuando la curva baja de forma sostenida, la conversación está ocupando menos espacio en su día a día. A veces es porque se ven más y el chat ya no hace falta; a veces es porque hay menos que contarse, o menos ganas de contarlo.',
        'Los momentos en los que la curva cambia bruscamente suelen coincidir con algo que pasó fuera del chat: una mudanza, un trabajo nuevo, una discusión, un viaje. Recordar qué pasaba entonces da más información que el número.'
      ],
      noSignifica: [
        'No significa que la relación esté peor. Muchas parejas escriben muchísimo al principio, cuando aún no conviven ni se ven a diario, y mucho menos cuando la vida se junta. Menos mensajes puede ser más cercanía.'
      ],
      normal: [
        'Es normal que el volumen baje después de los primeros meses, después de empezar a vivir juntos o en épocas de mucho trabajo. También es normal que suba y baje con las estaciones: vacaciones, fiestas, exámenes.'
      ],
      preocupa: [
        'Merece atención cuando la caída no se explica por ningún cambio de circunstancias, cuando coincide con menos afecto y más silencios, o cuando uno de los dos siente que el otro se está alejando y no sabe por qué.'
      ],
      queHacer: [
        'Mira los meses marcados en la línea de vida de la sección 03 y trata de recordar qué pasaba entonces en sus vidas. Muchas caídas tienen una explicación que el chat no conoce.',
        'Si la caída no tiene explicación, no la conviertas en una acusación: conviértela en una pregunta sobre cómo están, no sobre cuánto se escriben.',
        'Si simplemente se ven más y se escriben menos, cuiden que el chat siga teniendo algo de ustedes: una broma, una foto, un «me acordé de ti».'
      ],
      conversation: {
        title: 'Hablar de cómo están, no de cuánto se escriben',
        porque: 'Porque una caída en la conversación suele ser síntoma de algo más, y preguntar por el síntoma rara vez lleva a la causa.',
        cuando: 'En persona y con tiempo. Un paseo funciona mejor que una mesa frente a frente.',
        abrir: [
          { si: 'Para cualquiera de los dos', guion: 'Últimamente siento que hablamos menos, no solo por mensaje. No sé si es el trabajo, el cansancio o algo más, y prefiero preguntártelo a imaginármelo. ¿Cómo estás tú? ¿Cómo sientes que estamos?' }
        ],
        escuchar: 'Escucha lo que pasa en la vida de la otra persona fuera de la relación. Muchas veces la respuesta está ahí.',
        evitar: 'Evita la cifra como argumento. «Antes nos escribíamos 500 mensajes al mes» no invita a hablar, invita a defenderse.'
      },
      actions: [
        { week: 1, text: 'Mira los momentos de cambio de la línea de vida y apunta qué pasaba en sus vidas en esas fechas.' },
        { week: 2, text: 'Pregúntale cómo está, en persona y sin mencionar el chat.' },
        { week: 3, text: 'Compartan algo pequeño cada día por mensaje: una foto, una canción, algo que les hizo gracia.' },
        { week: 4, text: 'Comparen cómo se sienten con la conversación ahora respecto a hace un mes.' }
      ]
    },

    preguntas: {
      title: 'Preguntas que se quedan sin respuesta',
      calm: 'En su caso la mayoría de las preguntas recibe respuesta en pocas horas, y no hay una persona a la que se le queden sistemáticamente en el aire. Es una señal de atención mutua: lo que uno plantea, el otro lo recoge.',
      significa: [
        'Este dato cuenta los mensajes con pregunta que no recibieron respuesta de la otra persona en las siguientes doce horas. Una pregunta sin responder deja algo abierto: un plan sin confirmar, una duda, una invitación a hablar que nadie recogió.',
        'Cuando pasa de vez en cuando, es olvido. Cuando le pasa mucho más a una persona que a la otra, esa persona empieza a sentir que sus preguntas no importan, y suele dejar de hacerlas.'
      ],
      noSignifica: [
        'No significa necesariamente que la otra persona no quiera responder. Muchas preguntas se contestan en persona, por llamada o en la cabeza («ya le dije que sí») sin llegar al chat. Otras se pierden en medio de varios mensajes seguidos.'
      ],
      normal: [
        'Es normal que alguna pregunta se quede en el aire, sobre todo las retóricas o las que se hacen en medio de una conversación rápida. Dejar sin responder una de cada diez es habitual; una de cada tres, ya no tanto.'
      ],
      preocupa: [
        'Merece atención cuando las preguntas sin responder se concentran en una persona, cuando han aumentado respecto al principio, o cuando son justamente las preguntas importantes las que se quedan sin contestar: sobre planes, sobre la relación, sobre cómo está el otro.'
      ],
      queHacer: [
        'Si eres quien pregunta y no recibe respuesta: antes de insistir por escrito, prueba a hacer la pregunta importante en persona. Si por escrito se pierde y en persona no, el problema es el canal, no la relación.',
        'Si eres quien deja preguntas sin contestar: no hace falta responder todo al instante, pero sí cerrar. Un «déjame pensarlo y te digo mañana» es una respuesta.',
        'Para los dos: cuando una pregunta sea importante, díganlo. «Esto sí necesito que me lo contestes» ayuda a separar lo urgente de lo casual.'
      ],
      conversation: {
        title: 'Hablar de las preguntas en el aire',
        porque: 'Porque cada pregunta sin respuesta es pequeña, pero juntas pueden hacer que alguien deje de preguntar.',
        cuando: 'En persona y en calma, con algún ejemplo reciente en mente pero sin llevar una lista.',
        abrir: [
          { si: 'Si eres quien pregunta', guion: 'Me he dado cuenta de que a veces te pregunto cosas por mensaje y se quedan sin respuesta. Sé que muchas veces es porque estás ocupado u ocupada, pero me deja con la sensación de que no te importan. ¿Te pasa que las lees y se te olvidan? Me ayudaría que me dijeras aunque sea «luego te digo».' },
          { si: 'Si eres quien deja preguntas sin contestar', guion: 'Creo que a veces me haces preguntas y no te contesto, y no quiero que pienses que me dan igual. A veces las leo en un mal momento y se me pasan. ¿Te ha molestado? Voy a intentar al menos decirte cuándo te voy a responder.' }
        ],
        escuchar: 'Escucha qué preguntas le importan de verdad a la otra persona. Probablemente no son las del día a día.',
        evitar: 'Evita reenviar la pregunta con un «???» o un «hola?». Añade presión y rara vez consigue una buena respuesta.'
      },
      actions: [
        { week: 1, text: 'Apunta las preguntas que haces por mensaje y cuáles se quedan sin respuesta. Fíjate en de qué tratan.' },
        { week: 2, text: 'Hagan en persona una pregunta importante que por escrito se haya quedado en el aire.' },
        { week: 3, text: 'Si eres quien suele dejarlas sin contestar, cierra cada pregunta del día, aunque sea con un «luego te digo».' },
        { week: 4, text: 'Comparen cuántas preguntas se quedaron sin respuesta esta semana respecto a la primera.' }
      ]
    },

    temas: {
      title: 'Temas que cuestan',
      calm: 'En su caso ningún tema provoca respuestas mucho más lentas ni deja más preguntas sin contestar que el resto de la conversación. Si hay temas que les cuestan, no se notan en el chat, lo que suele indicar que o bien se hablan con normalidad o bien se hablan en persona.',
      significa: [
        'Este dato compara el tiempo que tarda cada persona en responder cuando aparece un tema concreto (planes, futuro, familia, dinero, exparejas, trabajo) con lo que tarda normalmente. Cuando un tema provoca respuestas mucho más lentas o deja más preguntas sin contestar, es probable que ese tema pese: que incomode, que dé miedo o que no se sepa qué decir.',
        'Los temas se detectan con palabras clave dentro de tu dispositivo. Ningún mensaje sale de él para hacer este análisis.'
      ],
      noSignifica: [
        'No significa que la otra persona esté evitando el tema a propósito. Hay temas que requieren pensar antes de responder, y tardar puede ser señal de que se toman en serio. Tampoco significa que no quiera ese futuro, esa familia o ese plan: significa que la respuesta no le sale fácil.'
      ],
      normal: [
        'Es normal que los temas de futuro, dinero o familia cuesten más que decidir qué cenar. Casi todas las parejas tienen uno o dos temas que se mueven más despacio. Lo que marca la diferencia es si esos temas se hablan en algún sitio, aunque no sea por chat.'
      ],
      preocupa: [
        'Merece atención cuando el tema que cuesta es importante para una de las dos personas y la otra lo esquiva sistemáticamente, o cuando nunca llega a hablarse en ningún lugar. Un tema evitado durante mucho tiempo no desaparece: se acumula.'
      ],
      queHacer: [
        'Mira en la sección 10 qué tema es y quién tarda más con él. Pregúntate si ese tema se habla en persona. Si sí, el chat no es su lugar y no pasa nada.',
        'Si el tema no se habla en ningún sitio, no lo saques por mensaje. Los temas difíciles necesitan caras, tono de voz y tiempo.',
        'Si eres quien tarda con ese tema, prueba a decir qué te pasa con él, aunque no tengas la respuesta: «me cuesta hablar de dinero porque en mi casa siempre fue motivo de pelea» ya es una respuesta.'
      ],
      conversation: {
        title: 'Hablar del tema que cuesta',
        porque: 'Porque un tema esquivado suele doler más a quien lo saca, que acaba sintiendo que lo que le importa no tiene espacio.',
        cuando: 'Con tiempo, sin prisa por cerrar nada y avisando antes: «me gustaría que habláramos de algo con calma este fin de semana».',
        abrir: [
          { si: 'Si eres quien saca el tema', guion: 'Hay un tema que me importa y siento que nos cuesta hablar de él. No necesito que tengamos una respuesta hoy; me gustaría saber qué te pasa a ti cuando sale, para entenderlo. ¿Podemos hablarlo con calma?' },
          { si: 'Si eres a quien le cuesta el tema', guion: 'Sé que a veces tardo en responder cuando hablamos de ciertos temas, y no es porque no me importen. Me cuesta y no siempre sé qué decir. Quiero intentar contarte qué me pasa, aunque todavía no tenga todas las respuestas.' }
        ],
        escuchar: 'Escucha el miedo que hay detrás del silencio. Casi siempre hay uno, y casi nunca es el que imaginas.',
        evitar: 'Evita ponerle fecha límite a la respuesta en la primera conversación. Abrir el tema ya es un avance.'
      },
      actions: [
        { week: 1, text: 'Piensa qué te gustaría hablar del tema que cuesta y qué te preocupa de sacarlo.' },
        { week: 2, text: 'Propón un momento para hablar de ese tema en persona, avisando antes de qué se trata.' },
        { week: 3, text: 'Vuelvan al tema una segunda vez, aunque sea brevemente, para que no se quede en una conversación aislada.' },
        { week: 4, text: 'Valoren si el tema pesa menos ahora que se ha hablado, aunque no esté resuelto.' }
      ]
    },

    multimedia: {
      title: 'Lo que se comparte, de un solo lado',
      calm: 'En su caso lo que se comparte, fotos, audios, stickers, ubicaciones, no está concentrado en una sola persona, o hay tan poco que no dice nada. Los dos se asoman al día del otro de una forma parecida.',
      significa: [
        'Fotos, audios, stickers, ubicaciones: lo que se comparte en un chat es una forma de invitar al otro a la propia vida. «Mira dónde estoy», «escucha esto», «me acordé de ti». Cuando casi todo lo comparte una sola persona, la otra está recibiendo mucho de su día y ofreciendo poco del suyo.'
      ],
      noSignifica: [
        'No significa que quien comparte menos esté cerrado. Hay personas a las que no se les ocurre mandar fotos, que odian los audios o que simplemente prefieren contar las cosas en persona. Es un estilo, no una declaración.'
      ],
      normal: [
        'Es normal que una persona mande más audios porque le resulta más cómodo, o más fotos porque su trabajo o su día son más visuales. Solo es un dato a mirar si el desequilibrio es muy grande y quien comparte más echa de menos recibir.'
      ],
      preocupa: [
        'Merece atención si quien comparte siente que lo que envía no recibe respuesta, o si antes ambos compartían y ahora solo uno lo hace. En ese caso no habla de un estilo, habla de un cambio.'
      ],
      queHacer: [
        'Si eres quien comparte más: si te gustaría recibir más de su día, pídelo en concreto. «Me encanta cuando me mandas fotos de lo que estás haciendo» es más fácil de cumplir que «nunca me mandas nada».',
        'Si eres quien comparte menos: una foto de tu comida, de tu camino o de algo que te hizo gracia cuesta un segundo y le dice al otro que existe en tu día.'
      ],
      conversation: {
        title: 'Hablar de compartir el día',
        porque: 'Porque compartir pequeños momentos es una de las formas más sencillas de sentirse cerca cuando no se está juntos.',
        cuando: 'En un momento relajado, incluso con humor.',
        abrir: [
          { si: 'Para cualquiera de los dos', guion: 'Me gusta mucho cuando me cuentas cosas de tu día. Me he dado cuenta de que casi siempre soy yo quien manda fotos o audios, y no es una queja. Me encantaría recibir un poco más de lo tuyo, aunque sea una foto tonta de lo que estás comiendo. ¿Te da flojera o simplemente no se te ocurre?' }
        ],
        escuchar: 'Escucha si a la otra persona le resulta natural o le da pereza. Si le da pereza, busquen un formato que le salga fácil.',
        evitar: 'Evita que suene a lista de deberes. Compartir funciona cuando es espontáneo.'
      },
      actions: [
        { week: 2, text: 'Cuéntale a la otra persona qué tipo de cosas te gusta recibir por mensaje.' },
        { week: 3, text: 'Comparte algo de tu día que no tenga ninguna utilidad, solo para que el otro lo vea.' }
      ]
    },

    eliminados: {
      title: 'Lo que se borra',
      calm: 'En su caso hay pocos mensajes eliminados, en una cantidad normal para un chat de esta duración. Casi siempre son erratas o mensajes enviados al chat equivocado, y no hay nada que leer en ellos.',
      significa: [
        'Este dato cuenta los mensajes que alguien envió y después eliminó para todos. WhatsApp deja una marca, «Se eliminó este mensaje», y el chat la conserva. No sabemos qué decían, ni queremos saberlo: solo cuántos son y de quién.',
        'Hay muchísimas razones para borrar un mensaje: una errata, un mensaje enviado al chat equivocado, una foto que no era, una frase dicha en caliente y retirada a tiempo, un arrepentimiento.'
      ],
      noSignifica: [
        'No significa que se esté ocultando algo. La mayoría de los mensajes eliminados son errores sin importancia. Y cuando no lo son, borrar algo dicho con enfado puede ser, precisamente, una forma de cuidar.',
        'Este informe no hace ninguna acusación a partir de este dato, y te pedimos que tú tampoco la hagas solo con él.'
      ],
      normal: [
        'Es normal ver algunos mensajes eliminados en cualquier chat largo. Que una persona borre más que la otra suele ser solo una diferencia de estilo: hay quien corrige todo y quien deja las erratas.'
      ],
      preocupa: [
        'Solo merece atención si coincide con otras cosas que ya te preocupan y que no están en este informe. Si es así, lo que necesitas no es contar mensajes eliminados, es una conversación honesta, y quizá hablar con alguien de confianza.'
      ],
      queHacer: [
        'Si este dato te inquieta, pregúntate qué te inquieta exactamente. Si la respuesta es «nada en concreto», déjalo pasar: el número por sí solo no dice nada.',
        'Si hay una desconfianza de fondo, el camino no es vigilar el chat, es hablar de esa desconfianza. La sección «Cuándo hablar con alguien» te da algunas pistas sobre cuándo buscar ayuda.'
      ],
      actions: []
    }
  };

  /* ─────────────────────────────────────────────────────────────
   * LO QUE VA BIEN
   * ───────────────────────────────────────────────────────────── */
  const HEALTHY = {
    iniciativa: {
      title: 'Los dos se buscan',
      habitos: ['Escríbele sin motivo al menos una vez al día, aunque sea breve.', 'Si notas que llevas días sin iniciar, rompe tú el hielo.', 'Celebra cuando el otro te busca: un «qué bien que me escribiste» refuerza el gesto.'],
      text: [
        'Las conversaciones las abren los dos en una proporción parecida. Eso significa que ninguno sostiene el chat en solitario y que los dos tienen la costumbre de pensar en el otro y convertirlo en mensaje. Es una de las señales más claras de reciprocidad en una conversación escrita.',
        'Puede parecer un detalle, pero es de las cosas que más desgastan cuando faltan. Quien siempre escribe primero acaba preguntándose si el otro le escribiría. En su caso esa pregunta no tiene espacio, y eso da una tranquilidad que muchas parejas no tienen.'
      ],
      proteger: 'Para protegerlo, basta con no darlo por hecho. En épocas de mucho trabajo es fácil dejar que el otro tome la iniciativa sin darse cuenta, y el reparto se inclina poco a poco. Un mensaje breve a media mañana mantiene el equilibrio.',
      vigilar: 'Qué vigilar: si alguna vez sientes que eres tú quien busca siempre, no esperes a que se convierta en cuenta pendiente. Dilo pronto y en pequeño.'
    },
    respuesta: {
      title: 'Se contestan a buen ritmo',
      habitos: ['Avisa cuando sepas que vas a estar desconectado.', 'Si no puedes contestar bien, contesta breve y promete volver.', 'No midan los minutos: cuiden que la espera no genere dudas.'],
      text: [
        'Los dos responden en tiempos cortos y parecidos. En la práctica, eso significa que ninguno de los dos pasa mucho tiempo esperando, y que la conversación fluye sin huecos que haya que interpretar.',
        'La espera es una de las fuentes más comunes de malentendidos por chat: cuando alguien tarda, el otro rellena el silencio con explicaciones, y casi nunca son amables. Que eso apenas ocurra entre ustedes quita mucho ruido de la relación.'
      ],
      proteger: 'Para protegerlo, cuando sepas que vas a estar desconectado, dilo. El buen ritmo no depende de contestar siempre rápido, sino de que el otro sepa qué esperar.',
      vigilar: 'Qué vigilar: los cambios de trabajo o de horarios suelen alargar los tiempos sin que nadie lo decida. Si pasa, háblenlo antes de que la espera empiece a pesar.'
    },
    constancia: {
      title: 'Están presentes casi todas las semanas',
      habitos: ['Un mensaje en los días imposibles, aunque sea una línea.', 'Si van a pasar días sin hablar, díganlo antes.', 'Cuando vuelvan de un periodo ocupado, retomen con una pregunta sobre el otro.'],
      text: [
        'Hay mensajes en la mayoría de las semanas del periodo, sin grandes temporadas en blanco. Esa constancia es la base de todo lo demás: una relación que se escribe con regularidad tiene un espacio propio que no depende de las ganas del momento.',
        'La constancia importa más que la cantidad. Un chat con pocos mensajes pero todos los días transmite más seguridad que uno con ráfagas enormes separadas por semanas de silencio.'
      ],
      proteger: 'Para protegerla, cuiden los días complicados: un solo mensaje en un día imposible vale más de lo que parece.',
      vigilar: 'Qué vigilar: si empiezan a aparecer silencios de varios días que antes no había, pregunten qué está pasando antes de acostumbrarse a ellos.'
    },
    calidez: {
      title: 'El afecto sigue a la vista',
      habitos: ['Un mensaje al día sin ninguna función práctica.', 'Usen sus apodos y sus bromas internas: son su idioma.', 'Díganse lo que se quieren también en los días malos.'],
      text: [
        'Las palabras y los emojis de afecto siguen presentes en la conversación, y no han caído con el tiempo. Decirse lo que se quieren, aunque sea con un corazón, mantiene el tono de la relación incluso en los mensajes más prácticos.',
        'Es menos común de lo que parece. En muchas parejas el afecto escrito es lo primero que cae con la rutina: el chat se llena de «¿compras tú el pan?» y se vacía de «me acordé de ti». Que en el suyo siga habiendo espacio para las dos cosas es una buena señal.'
      ],
      proteger: 'Para protegerlo, no dejen que el chat se vuelva solo logístico. Un mensaje sin ninguna función práctica al día es suficiente.',
      vigilar: 'Qué vigilar: el afecto escrito suele bajar en épocas de estrés. Si notas que desaparece durante semanas, es buen momento para preguntar cómo está el otro.'
    },
    atencion: {
      title: 'Las preguntas encuentran respuesta',
      habitos: ['Cierra cada pregunta, aunque sea con un «luego te digo».', 'Pregunta por algo concreto que el otro te contó ayer.', 'Las preguntas importantes, háganlas también en persona.'],
      text: [
        'Casi todas las preguntas que se hacen reciben respuesta en pocas horas. Eso dice que los dos leen al otro con atención, y que lo que uno plantea no se queda en el aire.',
        'Parece un detalle menor, pero las preguntas sin respuesta son una de las formas más silenciosas de desgaste: quien pregunta y no recibe respuesta suele dejar de preguntar. Entre ustedes ese circuito funciona.'
      ],
      proteger: 'Para protegerlo, cuando no puedas contestar algo en el momento, ciérralo igual: «déjame pensarlo» también es una respuesta.',
      vigilar: 'Qué vigilar: que las preguntas importantes, sobre planes o sobre ustedes, reciban la misma atención que las del día a día.'
    },
    temas: {
      title: 'Ningún tema se atasca',
      habitos: ['Sigan sacando los temas importantes, aunque no haya prisa por resolverlos.', 'Si un tema empieza a costar, nómbralo pronto.', 'Los temas grandes, en persona y con tiempo.'],
      text: [
        'Los tiempos de respuesta son parecidos hablen de lo que hablen: planes, familia, dinero, trabajo o futuro. No hay un tema que se esquive de forma sistemática, lo que suele indicar que hay espacio para hablar de todo.',
        'Casi todas las parejas tienen algún tema que cuesta más. Que en su chat no aparezca ninguno no quiere decir que no existan, pero sí que ninguno está bloqueando la conversación escrita.'
      ],
      proteger: 'Para protegerlo, sigan llevando los temas importantes también a la conversación en persona. El chat es buen sitio para empezarlos, no siempre para cerrarlos.',
      vigilar: 'Qué vigilar: si un día notas que un tema empieza a generar silencios, nómbralo pronto. Los temas difíciles se hacen más grandes cuanto más se esquivan.'
    }
  };

  // Textos para los rituales que el motor encuentra en el chat.
  const RITUALS = {
    buenosDias: {
      text: 'Se dan los buenos días. Es un ritual pequeño que dice «eres de las primeras personas en las que pienso», y que marca el comienzo del día como algo compartido.',
      proteger: 'Si se ha ido perdiendo, recuperarlo cuesta cinco segundos cada mañana. No hace falta que sea largo ni original: lo que cuenta es que esté.'
    },
    buenasNoches: {
      text: 'Se despiden por la noche. Cerrar el día juntos, aunque sea por escrito, da una sensación de continuidad: pase lo que pase durante el día, termina con el otro.',
      proteger: 'Protéjanlo también en los días en los que están enojados. Una despedida breve evita que la noche se haga larga y que el enojo se quede a dormir.'
    },
    seguimiento: {
      text: 'Se preguntan por el día. Preguntar cómo le fue al otro, y acordarse de lo que tenía pendiente, es una de las formas más claras de atención: dice «me importa lo que te pasa, no solo lo que nos pasa».',
      proteger: 'Para que no se vuelva automático, pregunten por algo concreto: la reunión, la visita al médico, la comida con su familia. La pregunta concreta demuestra que se escuchó la conversación anterior.'
    },
    humor: {
      text: 'Se ríen juntos. Las risas por escrito son un buen indicador de complicidad, y el humor compartido protege mucho en las épocas difíciles: las parejas que siguen riéndose juntas suelen atravesar mejor los malos momentos.',
      proteger: 'Cuiden sus bromas internas, sus memes y sus apodos. Parecen poca cosa, pero son parte de su idioma propio, y ese idioma es algo que solo tienen ustedes.'
    },
    afecto: {
      text: 'Se dicen lo que se quieren. «Te quiero», «te extraño» o «me haces falta» aparecen con regularidad en la conversación, y no solo en fechas especiales.',
      proteger: 'Que no dependa de los días buenos: decirlo en un día malo, o después de una discusión, es cuando más se nota y cuando más cuenta.'
    }
  };

  // Para las conversaciones que van bien: lo que suele ponerlas a prueba.
  // Solo aparece en la sección 12 cuando hay pocos patrones que atender.
  const ANTICIPATE = {
    title: 'Lo que suele poner a prueba a las parejas que están bien',
    paragraphs: [
      'Cuando una conversación va bien, el mayor riesgo no es un problema concreto, sino dar por hecho que siempre será así. Casi todas las parejas que se sienten bien pasan en algún momento por cambios que mueven el equilibrio. Saber cuáles son ayuda a reconocerlos a tiempo.',
      'La rutina es el primero. Con los meses, el chat se vuelve más práctico y menos juguetón, y el afecto escrito baja sin que nadie lo decida. No es grave, pero si se deja correr, un día la conversación es solo logística.',
      'Los cambios de vida son el segundo: empezar a vivir juntos, un trabajo nuevo, una mudanza, un bebé, una enfermedad en la familia. Todos reorganizan el tiempo y la atención. En esas épocas es normal escribirse menos; lo importante es nombrar lo que pasa para que el otro no lo lea como distancia.',
      'El estrés es el tercero. Cuando uno de los dos está saturado, contesta más tarde, pregunta menos y está menos disponible. Si el otro lo interpreta como desinterés, se crea una distancia que el estrés por sí solo no habría creado.',
      'Y el cuarto es el silencio sobre lo que empieza a molestar. Las parejas que se llevan bien a veces evitan decir las cosas pequeñas para no estropear el buen momento, y las cosas pequeñas crecen. Decirlas pronto, con cariño, es la mejor forma de que sigan siendo pequeñas.',
      'Si vuelven a analizar el chat dentro de unos meses y algo ha cambiado, esta página les ayudará a entender por qué.'
    ]
  };

  /* ─────────────────────────────────────────────────────────────
   * CONVERSACIONES GENERALES
   * Se usan para completar la sección 13 cuando hay pocos patrones.
   * ───────────────────────────────────────────────────────────── */
  const GENERAL_CONVERSATIONS = [
    {
      id: 'loQueFunciona',
      title: 'Hablar de lo que les funciona',
      porque: 'Porque las parejas suelen hablar de lo que va mal y casi nunca de lo que va bien, y saber qué funciona es la mejor forma de protegerlo.',
      cuando: 'En cualquier buen momento. Es una conversación ligera y suele terminar bien.',
      abrir: [{ si: 'Para cualquiera de los dos', guion: 'Me puse a pensar en lo que más me gusta de cómo estamos, y quería decírtelo. Me encanta cuando… ¿Y a ti? ¿Qué es lo que más te gusta de nosotros ahora mismo?' }],
      escuchar: 'Escucha los detalles. Lo que la otra persona valora suele ser más pequeño y concreto de lo que imaginas.',
      evitar: 'Evita convertirla en una lista de peticiones. Hoy toca solo lo que funciona.'
    },
    {
      id: 'comoPedir',
      title: 'Hablar de cómo se piden las cosas',
      porque: 'Porque muchas discusiones no son por lo que se pide, sino por cómo se pide, y cada persona trae de casa una forma distinta de hacerlo.',
      cuando: 'En un momento neutro, nunca justo después de una discusión.',
      abrir: [{ si: 'Para cualquiera de los dos', guion: 'Me gustaría que habláramos de cómo nos pedimos las cosas. A veces siento que te pido algo y suena a reproche, o que tú me lo pides y yo lo oigo así. ¿Cómo te gusta a ti que te pidan las cosas? ¿Hay algo que yo diga que te sienta mal?' }],
      escuchar: 'Escucha las frases concretas que a la otra persona le duelen. Suelen ser muletillas de las que no eres consciente.',
      evitar: 'Evita defender tu intención. Aunque no quisieras sonar así, lo que cuenta es cómo llegó.'
    },
    {
      id: 'dentroDeUnAno',
      title: 'Hablar de dónde se ven dentro de un año',
      porque: 'Porque imaginar juntos el futuro cercano ayuda a saber si van en la misma dirección, sin la presión de las grandes decisiones.',
      cuando: 'En un momento relajado: una cena, un paseo, un viaje.',
      abrir: [{ si: 'Para cualquiera de los dos', guion: 'Si pienso en nosotros dentro de un año, me imagino… ¿Tú cómo nos imaginas? No hablo de grandes planes, sino de cómo te gustaría que fueran nuestros días.' }],
      escuchar: 'Escucha los deseos pequeños: dónde vivir, cuánto verse, qué hacer los fines de semana. Ahí se ven las diferencias que importan.',
      evitar: 'Evita que se convierta en un interrogatorio sobre el compromiso. Es una conversación para imaginar, no para firmar.'
    },
    {
      id: 'discutir',
      title: 'Hablar de cómo quieren discutir',
      porque: 'Porque todas las parejas discuten, y acordar las reglas en frío es mucho más fácil que inventarlas en caliente.',
      cuando: 'En un momento tranquilo y lejos de cualquier discusión reciente. Funciona bien después de un buen día.',
      abrir: [{ si: 'Para cualquiera de los dos', guion: 'Quiero proponerte algo un poco raro: hablar de cómo discutimos cuando no estamos discutiendo. Yo me doy cuenta de que cuando me enojo tiendo a… ¿Tú qué necesitas cuando discutimos? ¿Tiempo, hablarlo enseguida, que no sea por mensaje?' }],
      escuchar: 'Escucha qué necesita la otra persona para calmarse. Hay quien necesita espacio y quien necesita cercanía, y ninguno de los dos está equivocado.',
      evitar: 'Evita revisar discusiones antiguas para ver quién tuvo la culpa. Esta conversación mira hacia delante.'
    },
    {
      id: 'tiempoPropio',
      title: 'Hablar del tiempo juntos y el tiempo propio',
      porque: 'Porque cada persona necesita una proporción distinta de tiempo en pareja y tiempo a solas, y cuando no se habla, una de las dos suele sentirse invadida o desatendida.',
      cuando: 'En cualquier momento tranquilo. Es una conversación práctica, no una crisis.',
      abrir: [{ si: 'Para cualquiera de los dos', guion: 'Estuve pensando en cómo repartimos nuestro tiempo. Me gusta mucho estar contigo y también necesito algunos ratos para mí, para mis amigos o para no hacer nada. ¿A ti cómo te gusta repartirlo? Me gustaría que los dos estuviéramos a gusto con el equilibrio.' }],
      escuchar: 'Escucha si la otra persona necesita más o menos de lo que tú imaginabas. Y separa el tiempo que pide para sí de lo que siente por ti.',
      evitar: 'Evita leer la necesidad de espacio como rechazo. Querer tiempo propio es compatible con querer mucho a alguien.'
    }
  ];

  // Acciones generales para completar el plan de 30 días.
  const GENERAL_ACTIONS = [
    { week: 1, text: 'Relee este informe con calma, apunta las tres cosas que más te han llamado la atención y por qué.' },
    { week: 1, text: 'Fíjate en un momento de la semana en el que la conversación te haya hecho sentir bien. Apunta qué lo hizo especial.' },
    { week: 2, text: 'Ten la conversación sobre lo que les funciona (sección 13).' },
    { week: 2, text: 'Dile a la otra persona algo concreto que agradeces de ella, por mensaje y sin motivo.' },
    { week: 3, text: 'Propón un plan juntos que no hayan hecho nunca, aunque sea pequeño.' },
    { week: 3, text: 'Un día de esta semana, deja el celular fuera de la mesa cuando estén juntos.' },
    { week: 4, text: 'Vuelve a analizar el chat y compara los datos con este informe.' },
    { week: 4, text: 'Escribe en una frase cómo te sientes con la relación hoy y compárala con cómo te sentías al empezar el plan.' }
  ];

  // Una línea por semana que explica el sentido de esa semana del plan.
  const PLAN_INTRO = {
    1: 'La primera semana no se trata de cambiar nada, sino de mirar. Es fácil leer un informe y querer arreglarlo todo el lunes; observar primero te permite comprobar si lo que dicen los datos coincide con lo que vives, y llegar a la conversación con ejemplos concretos en lugar de números.',
    2: 'La segunda semana es para hablar. Elige una sola conversación de la sección 13, la que te parezca más importante, y tenla en persona. No hace falta que salga perfecta: abrir el tema ya es la mitad del trabajo.',
    3: 'La tercera semana es para probar algo distinto, en pequeño. Los cambios grandes se abandonan; los pequeños y concretos se convierten en costumbre. Si algo no funciona, no pasa nada: se ajusta.',
    4: 'La cuarta semana es para mirar atrás. Compara tus notas de la primera semana con cómo están ahora, y si quieres, vuelve a analizar el chat para ver si los números se han movido. Lo que más importa, de todos modos, es cómo te sientes tú.'
  };

  const PLAN_FOCUS = {
    1: 'Observar sin cambiar nada',
    2: 'Hablar de lo que has visto',
    3: 'Probar algo distinto',
    4: 'Mirar atrás y comparar'
  };

  /* ─────────────────────────────────────────────────────────────
   * ENTRADAS DE CADA SECCIÓN DE LA GUÍA
   * ───────────────────────────────────────────────────────────── */
  const SECTION_INTROS = {
    meaning: [
      'Esta sección recorre cada uno de los patrones que buscamos en su conversación. Los que merecen atención aparecen primero, con una página cada uno: qué suele significar, qué no significa, en qué contextos es normal y cuándo conviene preocuparse. Los que no muestran nada llamativo aparecen al final, con una explicación breve de por qué.',
      'Un patrón no es un veredicto. Es una forma de mirar algo que ya estaba en el chat, para que puedas decidir si te importa y qué quieres hacer con ello. Lee cada bloque pensando en tu contexto: tú sabes cosas que los datos no.'
    ],
    going: [
      'Los informes tienden a fijarse en lo que falla, y las personas también. Por eso esta sección va antes que las conversaciones y el plan: lo que ya funciona es lo que sostiene a una pareja en las épocas difíciles, y merece cuidarse con la misma atención que lo que preocupa.',
      'Aquí aparecen los patrones sanos que encontramos y los rituales que ya existen en su chat, con una idea de cómo protegerlos.'
    ],
    conversations: [
      'Estas son las conversaciones que, a partir de lo que muestran sus mensajes, más pueden ayudar ahora. Están ordenadas de más a menos importante. No hace falta tenerlas todas: con una bien tenida ya cambia mucho.',
      'Cada una trae un guion para empezar, en primera persona. No es para leerlo en voz alta, sino para que tengas una forma de arrancar que no suene a reproche. Cámbialo con tus palabras.'
    ],
    conversationTips: [
      'Una conversación importante por vez. Si mezclas temas, ninguno se cierra.',
      'En persona, o al menos por llamada. Por escrito se pierde el tono.',
      'Habla de lo que sientes, no de lo que el otro hace: «me siento lejos» abre, «nunca me escribes» cierra.',
      'Escucha más de lo que hablas. La primera respuesta suele ser defensiva; la segunda, la verdadera.',
      'No busques cerrar nada el primer día. Abrir el tema ya es un avance.'
    ],
    plan: [
      'Un plan de cuatro semanas con acciones pequeñas y concretas, pensadas a partir de lo que muestra su chat. Cada semana tiene un sentido: observar, hablar, probar y comparar. Al final de cada una hay espacio para que anotes lo que has visto.',
      'No es un examen. Si una semana no puedes hacer algo, no pasa nada: pasa a la siguiente. Lo importante es que al final del mes tengas algo más de claridad que al principio.'
    ],
    care: [
      'Esta sección no depende de sus datos: son ideas que sirven a casi cualquier pareja para comunicarse mejor, por escrito y en persona. Léela cuando tengas un rato, y quédate con lo que te sirva.'
    ]
  };

  /* ─────────────────────────────────────────────────────────────
   * CÓMO LEER ESTE INFORME
   * ───────────────────────────────────────────────────────────── */
  const HOW_TO_READ = [
    'Este informe describe mensajes, no sentimientos. Todo lo que vas a leer sale de cómo se escriben: cuántos mensajes, a qué horas, cuánto tardan en contestarse, qué palabras usan. Es una fotografía de la conversación, y una conversación escrita es solo una parte de una relación.',
    'Por eso hay cosas que no puede ver. No sabe cuánto se ven en persona, qué se dicen por llamada, qué pasa en sus vidas fuera del chat ni cómo se sienten. Si algo de lo que lees no encaja con lo que vives, confía en lo que vives: tú tienes el contexto que a los datos les falta.',
    'Sobre los números: los tiempos de respuesta son medianas, es decir, el tiempo típico, no el promedio, para que una sola noche sin contestar no lo distorsione. Cuando comparamos «antes» y «ahora», partimos el periodo por la mitad. Y cuando decimos que algo merece atención, es porque se sale de lo habitual en muchas conversaciones, no porque haya una cifra correcta.',
    'La primera parte, «Cómo va tu relación», cuenta lo que muestran los datos. La segunda, «Tu guía», explica qué suele significar cada patrón, qué no significa, y te da herramientas: conversaciones que merece la pena tener y un plan de 30 días. Ninguna parte te dice qué hacer con tu relación. Esa decisión es tuya.',
    'Si decides compartirlo con la otra persona, léanlo con calma y por separado primero. Es normal que cada uno se reconozca más en unas partes que en otras, y que algunos datos incomoden. Úsenlo como punto de partida para hablar, no como prueba de nada.',
    'Este informe no es terapia ni un diagnóstico. No etiqueta a nadie ni reparte culpas. Si algo de lo que lees te remueve mucho, la sección «Cuándo hablar con alguien» explica cuándo y dónde buscar ayuda.',
    'Tus mensajes no han salido de tu teléfono para hacer este informe. Solo viajaron números, y sin nombres.'
  ];

  /* ─────────────────────────────────────────────────────────────
   * CÓMO CUIDAR LA RELACIÓN A PARTIR DE AHORA
   * ───────────────────────────────────────────────────────────── */
  const CARE = [
    {
      title: 'Hábitos de comunicación que ayudan',
      paragraphs: [
        'La mayoría de las parejas que se sienten bien no hablan más que las demás: hablan de forma más previsible. Saben más o menos cuándo van a saber del otro, y eso les permite estar tranquilas en los ratos en los que no hablan.',
        'Tres hábitos sencillos cambian mucho el día a día. El primero, avisar: cuando vas a desaparecer unas horas, dilo. El segundo, cerrar: cuando alguien pregunta algo, contestar aunque sea con un «luego te digo». El tercero, preguntar por lo concreto: acordarse de lo que el otro tenía pendiente y preguntar por ello.',
        'Y un cuarto, quizá el más importante: llevar las conversaciones difíciles fuera del chat. Por escrito se pierde el tono, se relee lo que duele y se contesta en caliente. Si un mensaje empieza a subir de temperatura, un «esto prefiero hablarlo en persona» evita muchas discusiones.'
      ]
    },
    {
      title: 'Cómo pedir lo que necesitas',
      paragraphs: [
        'Pedir es más difícil de lo que parece, porque casi siempre pedimos cuando ya estamos cansados de esperar. Y entonces la petición sale como reproche: «nunca me escribes», «siempre soy yo». La otra persona oye un ataque y se defiende, y la necesidad se queda sin atender.',
        'Una forma que funciona mejor tiene tres partes: lo que observas, lo que sientes y lo que te gustaría. «Cuando pasan días sin saber de ti (lo que observas), me siento lejos (lo que sientes); me gustaría que me escribieras aunque sea un mensaje corto (lo que te gustaría)». No garantiza nada, pero deja espacio para que el otro diga que sí.',
        'Y pide cosas concretas. «Que estés más presente» es difícil de cumplir; «que me escribas a mediodía» es fácil. Las peticiones pequeñas y claras tienen muchas más probabilidades de convertirse en hábito.'
      ]
    },
    {
      title: 'Límites sanos',
      paragraphs: [
        'Un límite es lo que necesitas para estar bien dentro de la relación, dicho con claridad. No es un castigo ni un ultimátum: es información. «Necesito dormir antes de las doce entre semana», «prefiero no hablar de dinero por mensaje», «necesito un rato a solas cuando llego del trabajo».',
        'En una relación sana, los límites de cada uno se escuchan y se respetan aunque no se compartan. Y funcionan en las dos direcciones: los tuyos cuentan tanto como los del otro.',
        'Hay algo que no es un límite sano, aunque a veces se presente así: controlar. Revisar el celular del otro, exigir la ubicación, decidir con quién puede hablar o enojarse si no contesta al instante no son límites, son formas de control. Si reconoces alguna de estas cosas en tu relación, en cualquiera de los dos lados, la sección «Cuándo hablar con alguien» es para ti.'
      ]
    },
    {
      title: 'Cómo reparar después de una discusión',
      paragraphs: [
        'Todas las parejas discuten. Lo que distingue a las que se sienten bien no es que discutan menos, sino que saben reparar: volver a acercarse después.',
        'Reparar empieza por bajar la temperatura. Si la discusión está en el chat, sácala: propón hablarlo en persona o por llamada, y date tiempo si lo necesitas. «Necesito una hora para calmarme y luego lo hablamos» es un buen mensaje; desaparecer sin decir nada, no.',
        'Después, reconoce tu parte, aunque sea pequeña. «Tienes razón en que te contesté mal» no es rendirse, es abrir la puerta. Y pregunta más de lo que explicas: «¿qué fue lo que más te dolió?» suele llevar más lejos que cualquier argumento.',
        'Por último, cierren. Un gesto, un mensaje, un abrazo que diga «ya está». Las discusiones que no se cierran se quedan abiertas en segundo plano y vuelven en la siguiente.'
      ]
    },
    {
      title: 'Tiempo juntos y tiempo propio',
      paragraphs: [
        'Una relación sana no es la que lo comparte todo, sino la que ha encontrado un equilibrio en el que los dos están a gusto. Hay parejas que se escriben todo el día y parejas que se escriben tres mensajes, y las dos pueden estar bien. Lo que importa es que el ritmo les sirva a los dos.',
        'Cuando una persona necesita más espacio que la otra, es fácil que se lea como desinterés. Casi nunca lo es. Tener amistades propias, aficiones propias y ratos a solas protege la relación: dos personas con vidas propias tienen más que contarse.',
        'Si sientes que falta tiempo juntos, pídelo en concreto: una noche a la semana sin celulares, un paseo el domingo, una comida juntos. Los planes concretos se cumplen; los «deberíamos vernos más» se quedan en el aire.'
      ]
    },
    {
      title: 'El celular cuando están juntos',
      paragraphs: [
        'Este informe habla del chat, pero hay un chat que también importa: el que tiene cada uno con el resto del mundo mientras está con el otro. Mirar el celular en mitad de una conversación es uno de los gestos que más distancia crea, aunque nadie lo haga con mala intención.',
        'No hace falta prohibir nada. Basta con acordar algunos momentos sin pantallas, como las comidas o la última media hora antes de dormir, y respetarlos. Y si necesitas mirar algo, decirlo: «perdón, espera, contesto esto del trabajo y soy tuyo» cambia por completo cómo se vive.'
      ]
    },
    {
      title: 'Cuando la vida aprieta',
      paragraphs: [
        'Muchos de los cambios que muestra este informe no nacen en la relación, sino fuera: un trabajo nuevo, una mudanza, una enfermedad en la familia, dinero justo, exámenes, un duelo. En esas épocas la conversación se encoge, los tiempos se alargan y el afecto escrito baja. Es normal.',
        'Lo que ayuda en esas temporadas no es mantener el mismo ritmo, sino nombrar lo que pasa: «estas semanas voy a estar con la cabeza en otra parte, no es por ti». Dicho así, el otro puede acompañar en lugar de preocuparse.',
        'Y cuando la época difícil pase, vuelvan a mirar cómo están. Algunas costumbres que se pierden en las malas rachas no vuelven solas: hay que recuperarlas a propósito.'
      ]
    },
    {
      title: 'Pequeños rituales que pueden crear',
      paragraphs: [
        'Los rituales son costumbres pequeñas que se repiten y que dicen «esto es nuestro». Muchas parejas los tienen sin haberlos decidido: los buenos días, una broma que se repite, una canción. Otros se pueden crear a propósito, y funcionan igual de bien.',
        'Algunas ideas que funcionan por chat: una foto al día de algo que les hizo pensar en el otro; una pregunta distinta cada domingo («¿qué fue lo mejor de tu semana?»); un mensaje de ánimo antes de algo importante; una canción compartida los viernes. Ninguna requiere tiempo, y todas construyen algo.',
        'Y algunas fuera del chat: una comida a la semana sin celulares, un paseo que siempre hacen juntos, un plan al mes que elija cada uno por turnos. Lo importante no es cuál elijan, sino que sea suyo y que lo cuiden.'
      ]
    },
    {
      title: 'Cómo se ve una relación equilibrada en los mensajes',
      paragraphs: [
        'No existe un chat perfecto, pero las conversaciones equilibradas tienen algunas cosas en común. Los dos inician, aunque no al cincuenta por ciento. Los dos contestan en tiempos que no generan ansiedad. Las preguntas se responden. Hay afecto a la vista, aunque sea poco. Y los temas importantes, aunque cuesten, encuentran su sitio en algún momento.',
        'Sobre todo, en una conversación equilibrada nadie siente que sostiene la relación en solitario. Si hay una sola pregunta que hacerse después de leer este informe, es esa: ¿alguno de los dos siente que pone más que el otro? La respuesta no está en los números, está en la conversación que tengan después.'
      ]
    },
    {
      title: 'Cómo volver a este informe',
      paragraphs: [
        'Este informe es una fotografía de un momento. Tiene más valor si lo vuelves a mirar dentro de un tiempo que si lo lees una vez y lo guardas. Te proponemos tres momentos.',
        'Dentro de una semana, relee la sección 13 y elige la conversación que quieres tener primero. A esa distancia se lee con menos emoción y más claridad.',
        'Dentro de un mes, al terminar el plan, exporta el chat otra vez y vuelve a analizarlo. Compara los números de las secciones 02 a 10 con los de este informe: no para ver si «han aprobado», sino para ver si lo que han intentado se nota. Y compara también tus notas del plan.',
        'Dentro de unos meses, o cuando algo cambie en su vida, vuelve a leer la sección 12. Lo que va bien es lo primero que se descuida cuando todo lo demás aprieta, y es lo que más cuesta recuperar si se pierde.',
        'Y si algún día este informe deja de describir su relación porque las cosas han cambiado para bien, mejor: para eso sirve.'
      ]
    }
  ];

  /* ─────────────────────────────────────────────────────────────
   * SI ESTÁS PENSANDO EN TERMINAR, O YA TERMINÓ
   * Solo aparece si el score es bajo o el chat acaba en silencio.
   * ───────────────────────────────────────────────────────────── */
  const ENDING = {
    title: 'Si estás pensando en terminar, o ya terminó',
    paragraphs: [
      'Esta sección aparece porque los datos muestran una conversación muy apagada o que terminó en silencio. No sabemos en qué punto estás: puede que la relación haya terminado, que estés pensando en terminarla o que simplemente estén en una etapa difícil. Sea cual sea, estas páginas son para ti.',
      'Lo primero: lee este informe sin castigarte. Es muy fácil, al ver los números, buscar el momento en el que «lo hiciste mal», o buscar al culpable al otro lado. Los datos no sirven para eso. Una conversación la hacen dos personas, en unas circunstancias concretas, y casi nunca se apaga por una sola razón.',
      'Lo segundo: separa lo que es de la relación de lo que es tuyo. Algunos patrones de este informe hablan de cómo estaban juntos, y se quedarán con esta relación. Otros hablan de ti: de cómo pides, de cómo esperas, de cómo te callas o de cómo insistes. Esos te acompañarán en la siguiente relación, en tus amistades y en tu familia. No son defectos: son información sobre ti, y es valiosa.',
      'Pregúntate, con calma: ¿qué patrones de este informe reconozco de otras relaciones? ¿Qué necesité y no pedí? ¿Qué di que no me devolvieron, o qué no di? No hace falta contestar hoy. Estas preguntas son para las próximas semanas.',
      'Si la relación ya terminó, puede que releer el chat te haga daño. Está bien no hacerlo. Tampoco hace falta borrar nada si no quieres: basta con no volver a él cada noche. El informe ya guarda lo que el chat tenía que enseñarte.',
      'Si estás pensando en terminar, este informe no puede decirte si deberías hacerlo. Puede darte un lenguaje para hablar de lo que ves, y la sección 13 tiene conversaciones que quizá quieras intentar antes. Si ya las has tenido y nada cambia, esa también es una respuesta.',
      'Y si estás triste, es normal. El final de una relación, o la posibilidad del final, duele aunque sea la decisión correcta. Apóyate en tu gente. Y si el dolor no baja con las semanas, o sientes que no puedes con él, habla con alguien: la sección «Cuándo hablar con alguien» te dice dónde.'
    ]
  };

  /* ─────────────────────────────────────────────────────────────
   * CUÁNDO HABLAR CON ALGUIEN
   * ───────────────────────────────────────────────────────────── */
  const HELP = {
    intro: 'Un informe puede ayudarte a ver patrones, pero hay cosas que merecen hablarse con una persona preparada. Buscar ayuda no significa que la relación esté rota ni que tú estés mal: significa que te tomas en serio cómo te sientes.',
    signals: [
      'Sientes miedo de la reacción de la otra persona: de su enojo, de lo que pueda hacer o decir.',
      'Alguien revisa tu celular, te pide la ubicación constantemente, decide con quién puedes hablar o controla tu dinero.',
      'Hay insultos, humillaciones, amenazas o cualquier forma de violencia física, aunque haya pasado una sola vez.',
      'Llevas semanas con ansiedad, sin dormir bien o sin ganas de nada, y lo relacionas con la relación.',
      'Tienen la misma discusión una y otra vez sin llegar a ningún sitio, y los dos lo quieren cambiar.',
      'Te cuesta separar lo que sientes de lo que ves, o te encuentras revisando el chat de forma compulsiva.',
      'Tienes pensamientos de hacerte daño. En ese caso, llama hoy a una de las líneas de abajo.'
    ],
    professional: 'Para trabajar la relación, una terapia de pareja o individual con un profesional de la psicología es el camino habitual. No hace falta estar en crisis para ir: muchas parejas van precisamente para no llegar a ella.',
    lines: {
      mx: [
        { name: 'Emergencias', contact: '911', desc: 'Si estás en peligro ahora mismo.' },
        { name: 'Línea de la Vida', contact: '800 911 2000', desc: 'Atención gratuita las 24 horas en salud mental y crisis emocional.' },
        { name: 'SAPTEL', contact: '55 5259 8121', desc: 'Apoyo psicológico gratuito por teléfono, las 24 horas.' },
        { name: 'Consejo Ciudadano', contact: '55 5533 5533', desc: 'Línea de Seguridad y Chat de Confianza: apoyo psicológico y orientación en violencia, gratuito y las 24 horas.' }
      ],
      es: [
        { name: 'Emergencias', contact: '112', desc: 'Si estás en peligro ahora mismo.' },
        { name: 'Línea 024', contact: '024', desc: 'Atención a la conducta suicida, gratuita, confidencial y las 24 horas.' },
        { name: 'Violencia de género', contact: '016', desc: 'Gratuito y las 24 horas. No aparece en la factura, pero sí en el registro de llamadas del teléfono.' },
        { name: 'Teléfono de la Esperanza', contact: '717 003 717', desc: 'Escucha y apoyo emocional las 24 horas.' }
      ]
    },
    note: 'Este informe no es terapia ni diagnóstico. Describe patrones en mensajes escritos y no puede saber cómo se sienten ni qué pasa fuera del chat. Si tu seguridad o la de otra persona está en riesgo, no esperes: llama a emergencias.'
  };

  root.YLSGuideBlocks = {
    CONCERNS, HEALTHY, RITUALS, GENERAL_CONVERSATIONS, GENERAL_ACTIONS, PLAN_FOCUS, PLAN_INTRO, SECTION_INTROS, ANTICIPATE,
    HOW_TO_READ, CARE, ENDING, HELP
  };
})(typeof window !== 'undefined' ? window : globalThis);
