/** Date names and phrases (formatters in `lib/format/` and `lib/home/dates.js`). */
export default {
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  countdown: {
    today: 'today',
    tomorrow: 'tomorrow',
    yesterday: 'yesterday',
    inDays: 'in {count} days',
    daysAgo: '{count} days ago',
  },
  relative: {
    justNow: 'just now',
    minutesAgo: '{count} min ago',
    hoursAgo: { one: '1 hour ago', other: '{count} hours ago' },
    daysAgo: { one: '1 day ago', other: '{count} days ago' },
    onDate: 'on {date}',
  },
}
