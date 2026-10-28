/** Errors returned by services and hooks (text ready to show). */
export default {
  emptyName: 'The name cannot be empty.',
  supabase: {
    sessionExpired: 'Your session expired. Sign in again.',
    forbidden: "You don't have permission to do this.",
    duplicate: 'An identical record already exists.',
    migration: 'A database migration is missing (see supabase/migrations/, in order: 0001, 0002…).',
    offline: 'No connection to the server. It was saved locally and will be retried.',
  },
  crud: {
    loadList: 'Could not load the list.',
    loadRecord: 'Could not load the record.',
    create: 'Could not create it.',
    save: 'Could not save it.',
    savePosition: 'Could not save the position.',
    delete: 'Could not delete it.',
    reorder: 'Could not reorder.',
  },
  sheets: { save: 'Could not save the sheet.', search: 'Could not search.' },
  home: { lastSheet: 'Could not load the last sheet.' },
  trash: {
    move: 'Could not move it to the trash.',
    restore: 'Could not restore it.',
    load: 'Could not load the trash.',
    check: 'Could not check what it includes.',
    purge: 'Could not delete it forever.',
    purgeExpired: 'Could not empty what has expired.',
  },
}
