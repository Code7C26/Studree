/**
 * Claves de localStorage usadas por Studree (ver docs/DB_SCHEMA.md).
 *
 * Desde ADR-007 localStorage ya NO es la persistencia: es cache descartable +
 * preferencias de UI. Las claves del modelo viejo (`studree:folders`,
 * `studree:subjects`, `studree:nodes`, `studree:resources`) quedaron obsoletas.
 */
export const STORAGE_KEYS = Object.freeze({
  /**
   * Prefijo de TODO lo de Studree en localStorage (cache + UI). `clearAllCache()`
   * borra por este prefijo al cerrar sesión.
   */
  appPrefix: 'studree:',

  /**
   * Prefijo de TODA la cache de datos. `clearAllCache()` borra por este prefijo,
   * así que cualquier clave de cache nueva tiene que empezar con esto.
   */
  cachePrefix: 'studree:cache:',

  /** Preferencias de UI (no son datos de negocio: no se sincronizan a Supabase). */
  uiTabs: 'studree:ui:tabs',
  uiExplorer: 'studree:ui:explorer',
  /** Explorador lateral abierto/cerrado (ADR-018: arranca cerrado). */
  uiExplorerOpen: 'studree:ui:explorer-open',
  /** Panel del Brote (asistente) abierto/cerrado (Fase 14). */
  uiAssistantOpen: 'studree:ui:assistant-open',
})
