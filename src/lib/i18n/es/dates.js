/** Nombres y frases de fechas (formateadores de `lib/format/` y `lib/home/dates.js`). */
export default {
  weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  weekdaysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  months: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  countdown: {
    today: 'hoy',
    tomorrow: 'mañana',
    yesterday: 'ayer',
    inDays: 'en {count} días',
    daysAgo: 'hace {count} días',
  },
  relative: {
    justNow: 'recién',
    minutesAgo: 'hace {count} min',
    hoursAgo: { one: 'hace 1 hora', other: 'hace {count} horas' },
    daysAgo: { one: 'hace 1 día', other: 'hace {count} días' },
    onDate: 'el {date}',
  },
}
