/*
 * keywords.js — los temas de la sección «Los temas» del informe.
 *
 * Archivo editable a propósito: añadir o quitar una palabra no requiere tocar
 * el motor. Reglas para editarlo:
 *
 *   - Minúsculas. Da igual poner acentos o no: el motor los quita antes de
 *     comparar, así que «mamá» y «mama» son la misma entrada.
 *   - Se compara por palabra o frase completa: «ex» no se activa con «examen».
 *   - Evita palabras ambiguas sueltas («papa», «feria», «cuenta»); mejor en
 *     frase («mi papá», «la cuenta del banco»).
 *
 * Todo se busca en el dispositivo. Ninguna de estas palabras, ni los mensajes
 * donde aparecen, salen del navegador: a la IA solo le llega el recuento.
 */
(function (root) {
  'use strict';

  root.YLSKeywords = {
    planes: {
      label: 'Planes',
      words: [
        'plan', 'planes', 'quedamos', 'vernos', 'nos vemos', 'salir', 'salimos', 'cita',
        'cine', 'cenar', 'a cenar', 'comer juntos', 'viaje', 'viajar', 'fin de semana',
        'finde', 'el sabado', 'el domingo', 'reservar', 'reservacion', 'boletos',
        'concierto', 'vacaciones', 'paseo'
      ]
    },
    futuro: {
      label: 'Futuro',
      words: [
        'futuro', 'algun dia', 'vivir juntos', 'vivir juntas', 'casarnos', 'boda',
        'hijos', 'tener hijos', 'mudarnos', 'nos mudamos', 'el proximo ano',
        'en unos anos', 'comprometernos', 'anillo', 'nuestra casa', 'nuestro depa',
        'a largo plazo', 'formalizar', 'lo nuestro'
      ]
    },
    familia: {
      label: 'Familia',
      words: [
        'familia', 'mi mama', 'tu mama', 'mi papa', 'tu papa', 'mis papas', 'tus papas',
        'mi madre', 'tu madre', 'mi padre', 'tu padre', 'mi hermano', 'mi hermana',
        'tu hermano', 'tu hermana', 'abuela', 'abuelo', 'suegra', 'suegro', 'mis tios',
        'mis primos', 'sobrino', 'sobrina', 'comida familiar'
      ]
    },
    dinero: {
      label: 'Dinero',
      words: [
        'dinero', 'lana', 'pagar', 'pago', 'pagos', 'renta', 'deuda', 'deudas',
        'prestamo', 'prestar', 'me prestas', 'quincena', 'sueldo', 'gastos', 'ahorrar',
        'ahorro', 'tarjeta de credito', 'transferencia', 'te transfiero', 'deposito',
        'cuanto cuesta', 'pesos', 'euros', 'presupuesto', 'la cuenta del banco'
      ]
    },
    ex: {
      label: 'Ex parejas',
      words: [
        'mi ex', 'tu ex', 'su ex', 'exnovio', 'exnovia', 'ex novio', 'ex novia',
        'expareja', 'ex pareja', 'exesposo', 'exesposa', 'ex esposo', 'ex esposa'
      ]
    },
    trabajo: {
      label: 'Trabajo',
      words: [
        'trabajo', 'chamba', 'chambear', 'trabajar', 'jefe', 'jefa', 'oficina', 'junta',
        'reunion', 'proyecto', 'cliente', 'turno', 'horas extra', 'home office',
        'entrevista', 'renuncia', 'renunciar', 'ascenso', 'mis companeros'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
