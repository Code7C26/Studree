/** Errores que devuelven los services y los hooks (texto listo para mostrar). */
export default {
  emptyName: 'El nombre no puede estar vacío.',
  supabase: {
    sessionExpired: 'Tu sesión expiró. Volvé a iniciar sesión.',
    forbidden: 'No tenés permiso para hacer esto.',
    duplicate: 'Ya existe un registro igual.',
    migration: 'Falta aplicar una migración de la base (ver supabase/migrations/, en orden: 0001, 0002…).',
    offline: 'Sin conexión con el servidor. Se guardó localmente y se reintentará.',
  },
  crud: {
    loadList: 'No se pudo cargar la lista.',
    loadRecord: 'No se pudo cargar el registro.',
    create: 'No se pudo crear.',
    save: 'No se pudo guardar.',
    savePosition: 'No se pudo guardar la posición.',
    delete: 'No se pudo eliminar.',
    reorder: 'No se pudo reordenar.',
  },
  sheets: { save: 'No se pudo guardar la hoja.', search: 'No se pudo buscar.' },
  plan: {
    load: 'No se pudo leer tu plan.',
    change: 'No se pudo cambiar el plan. Probá de nuevo.',
    guest: 'Para pasar a Premium, primero guardá tu cuenta en el Perfil.',
  },
  home: { lastSheet: 'No se pudo cargar la última hoja.' },
  trash: {
    move: 'No se pudo mover a la papelera.',
    restore: 'No se pudo restaurar.',
    load: 'No se pudo cargar la papelera.',
    check: 'No se pudo revisar qué incluye.',
    purge: 'No se pudo borrar para siempre.',
    purgeExpired: 'No se pudo vaciar lo vencido.',
  },
  share: {
    load: 'No se pudo leer el link para compartir.',
    create: 'No se pudo generar el link.',
    revoke: 'No se pudo revocar el link.',
    open: 'No se pudo abrir la materia compartida.',
  },
  flashcards: {
    load: 'No se pudieron cargar las tarjetas.',
    create: 'No se pudo crear la tarjeta.',
    save: 'No se pudo guardar la tarjeta.',
    remove: 'No se pudo borrar la tarjeta.',
    review: 'No se pudo guardar el repaso.',
  },
}
