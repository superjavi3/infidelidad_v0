/*
 * ai-payload.js — Contrato de privacidad de YaLoSabía
 *
 * Único punto del proyecto autorizado a construir lo que se envía a /api/analyze
 * (y de ahí a Gemini). La regla es absoluta:
 *
 *   Solo salen del dispositivo números, porcentajes, fechas y categorías.
 *   Nunca texto de mensajes. Nunca nombres reales.
 *
 * Los nombres se sustituyen por etiquetas anónimas ("Persona A", "Miembro 3")
 * antes de salir, y se vuelven a sustituir por los reales en el cliente cuando
 * llega la respuesta (restoreNames).
 *
 * El builder es de lista blanca: copia campo a campo, nunca hace spread de un
 * objeto de análisis. assertNoIdentifiers() es el cinturón además de los
 * tirantes: recorre el payload ya construido y revienta si encuentra un nombre
 * real o una clave de texto libre.
 */
(function (root) {
  'use strict';

  var SCHEMA_COUPLE = 'yls.aggregate.couple.v1';
  var SCHEMA_GROUP = 'yls.aggregate.group.v1';

  // Claves que nunca pueden viajar: son texto libre del chat.
  var FORBIDDEN_KEYS = ['text', 'message', 'messages', 'sender', 'body', 'content', 'brokeMessage', 'snippet', 'quote'];

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function round(v, decimals) {
    var f = Math.pow(10, decimals || 0);
    return Math.round(num(v) * f) / f;
  }

  function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((num(part) / num(whole)) * 100);
  }

  function sumValues(obj) {
    var total = 0;
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) total += num(obj[k]);
    }
    return total;
  }

  /*
   * Mapa de alias. Traduce nombres reales a etiquetas anónimas en la ida y
   * las etiquetas de vuelta a nombres reales en el retorno.
   */
  function createAliasMap(names, prefix) {
    var real = [];
    var alias = [];
    (names || []).forEach(function (name, i) {
      if (!name) return;
      real.push(String(name));
      alias.push(prefix === 'persona'
        ? 'Persona ' + String.fromCharCode(65 + i)
        : 'Miembro ' + (i + 1));
    });

    return {
      real: real,
      alias: alias,
      toAlias: function (name) {
        var i = real.indexOf(String(name));
        return i === -1 ? null : alias[i];
      },
      /* Alias → nombre real. Se aplica del alias más largo al más corto para
         que "Miembro 12" no se rompa al sustituir "Miembro 1". */
      restore: function (text) {
        if (!text) return text;
        var out = String(text);
        var order = alias
          .map(function (a, i) { return { a: a, r: real[i] }; })
          .sort(function (x, y) { return y.a.length - x.a.length; });
        order.forEach(function (pair) {
          out = out.split(pair.a).join(pair.r);
        });
        return out;
      }
    };
  }

  /* Aplica aliases.restore() a todas las cadenas de una respuesta de la IA. */
  function restoreDeep(value, aliases) {
    if (!aliases || value === null || value === undefined) return value;
    if (typeof value === 'string') return aliases.restore(value);
    if (Array.isArray(value)) {
      return value.map(function (item) { return restoreDeep(item, aliases); });
    }
    if (typeof value === 'object') {
      var out = {};
      for (var k in value) {
        if (Object.prototype.hasOwnProperty.call(value, k)) out[k] = restoreDeep(value[k], aliases);
      }
      return out;
    }
    return value;
  }

  /*
   * Guardia final. Recorre el payload y lanza si encuentra:
   *   - una clave de texto libre del chat
   *   - un nombre real (o un token del nombre de 3+ caracteres)
   * Pensado para fallar ruidosamente en desarrollo y en los tests.
   */
  function assertNoIdentifiers(payload, forbiddenNames) {
    var needles = [];
    (forbiddenNames || []).forEach(function (name) {
      String(name || '').split(/\s+/).forEach(function (token) {
        var t = token.trim().toLowerCase();
        if (t.length >= 3) needles.push(t);
      });
    });

    function walk(node, path) {
      if (node === null || node === undefined) return;

      if (typeof node === 'string') {
        var lower = node.toLowerCase();
        for (var i = 0; i < needles.length; i++) {
          if (lower.indexOf(needles[i]) !== -1) {
            throw new Error('ai-payload: nombre real detectado en ' + path + ' ("' + node + '")');
          }
        }
        return;
      }

      if (typeof node !== 'object') return;

      if (Array.isArray(node)) {
        node.forEach(function (item, i) { walk(item, path + '[' + i + ']'); });
        return;
      }

      for (var key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        if (FORBIDDEN_KEYS.indexOf(key) !== -1) {
          throw new Error('ai-payload: clave prohibida "' + key + '" en ' + path);
        }
        walk(node[key], path + '.' + key);
      }
    }

    walk(payload, '$');
    return payload;
  }

  /*
   * PAREJA
   *
   * stats  → salida de analyzeMessages()
   * extras → { timeline, silences, doubleText, multimedia, deleted } (opcional)
   *
   * Devuelve { payload, aliases }. El payload es lo que viaja; aliases se queda
   * en el cliente para deshacer la anonimización.
   */
  function buildCoupleAIPayload(stats, extras) {
    if (!stats) throw new Error('ai-payload: faltan stats');
    extras = extras || {};

    var names = [stats.personA, stats.personB];
    var aliases = createAliasMap(names, 'persona');
    var total = num(stats.total);

    var mm = extras.multimedia || {};
    var mediaTypes = ['audios', 'imagenes', 'stickers', 'videos', 'documentos', 'ubicaciones'];
    var media = {};
    var mediaByPerson = [0, 0];
    mediaTypes.forEach(function (type) {
      var bucket = mm[type] || {};
      media[type] = num(bucket.total);
      names.forEach(function (name, i) {
        mediaByPerson[i] += num((bucket.perPerson || {})[name]);
      });
    });

    var silences = extras.silences || {};
    var doubleText = extras.doubleText || {};
    var deleted = extras.deleted || {};
    var timeline = extras.timeline || {};

    var people = names.map(function (name, i) {
      var episodes = doubleText[name] || [];
      return {
        label: aliases.alias[i],
        messageCount: num(i === 0 ? stats.msgsA : stats.msgsB),
        sharePct: pct(i === 0 ? stats.msgsA : stats.msgsB, total),
        doubleTextEpisodes: episodes.length,
        silencesBroken: num((silences.brokeCount || {})[name]),
        deletedMessages: num((deleted.deleted || {})[name]),
        mediaShared: mediaByPerson[i]
      };
    });

    var monthly = (timeline.labels || []).map(function (label, i) {
      var perPerson = (timeline.perPerson || [])[i] || {};
      return {
        month: label,
        total: num((timeline.data || [])[i]),
        byPerson: names.map(function (name) { return num(perPerson[name]); })
      };
    });

    var payload = {
      schema: SCHEMA_COUPLE,
      span: {
        activeDays: num(stats.uniqueDays),
        firstMonth: monthly.length ? monthly[0].month : null,
        lastMonth: monthly.length ? monthly[monthly.length - 1].month : null
      },
      totals: {
        messageCount: total,
        loveEmojis: num(stats.loveCount),
        mediaShared: sumValues(media),
        deletedMessages: num(deleted.total)
      },
      score: {
        overall: num(stats.score)
      },
      rhythm: {
        avgReplyMinutes: round(stats.avgReply, 1),
        nightSharePct: round(stats.nightPct, 0)
      },
      balance: {
        leaderLabel: num(stats.msgsA) >= num(stats.msgsB) ? aliases.alias[0] : aliases.alias[1],
        leaderSharePct: num(stats.leaderPct)
      },
      silences: {
        count: num(silences.total !== undefined ? silences.total : stats.silencesCount),
        longestHours: silences.longest ? round(silences.longest.hours, 0) : 0
      },
      doubleTexting: {
        totalEpisodes: people.reduce(function (s, p) { return s + p.doubleTextEpisodes; }, 0)
      },
      media: media,
      timeline: {
        monthly: monthly,
        peakMonth: timeline.peakMonth || null,
        declineMonth: timeline.declineMonth || null,
        declinePct: num(timeline.declinePct)
      },
      people: people
    };

    assertNoIdentifiers(payload, names);
    return { payload: payload, aliases: aliases };
  }

  /*
   * GRUPO
   *
   * groupStats → salida de analyzeGroupMessages()
   */
  function buildGroupAIPayload(groupStats) {
    if (!groupStats) throw new Error('ai-payload: faltan groupStats');

    var members = (groupStats.members || []).slice(0, 20);
    var names = members.map(function (m) { return m.name; });
    var aliases = createAliasMap(names, 'miembro');

    var payload = {
      schema: SCHEMA_GROUP,
      totals: {
        messageCount: num(groupStats.totalMessages),
        members: (groupStats.members || []).length,
        activeDays: num(groupStats.uniqueDays)
      },
      score: {
        overall: num(groupStats.score)
      },
      members: members.map(function (m, i) {
        return {
          label: aliases.alias[i],
          messageCount: num(m.msgCount),
          sharePct: round(m.pct, 1),
          category: m.category || null
        };
      }),
      monthly: (groupStats.monthlyActivity || []).map(function (m) {
        return { month: m.month, total: num(m.total) };
      }),
      /* De los eventos de sistema solo viaja el recuento por tipo: quién
         entró o salió es un dato identificable. */
      eventCounts: (function () {
        var counts = {};
        (groupStats.systemEvents || []).forEach(function (e) {
          var type = e && e.type ? String(e.type) : 'otro';
          counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
      })()
    };

    assertNoIdentifiers(payload, names);
    return { payload: payload, aliases: aliases };
  }

  root.YLSPayload = {
    SCHEMA_COUPLE: SCHEMA_COUPLE,
    SCHEMA_GROUP: SCHEMA_GROUP,
    createAliasMap: createAliasMap,
    restoreDeep: restoreDeep,
    assertNoIdentifiers: assertNoIdentifiers,
    buildCoupleAIPayload: buildCoupleAIPayload,
    buildGroupAIPayload: buildGroupAIPayload
  };
})(typeof window !== 'undefined' ? window : globalThis);
