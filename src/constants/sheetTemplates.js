/**
 * Plantillas de hoja de fábrica (Fase 13, ver docs/features/sheet-templates.md).
 * Viven en el código, no en la base: no se pueden borrar. Las del usuario
 * están en la tabla `sheet_templates` (migración 0006).
 *
 * Fase 18: el nombre y el contenido salen del diccionario `templates.factory` y siguen el idioma
 * activo. El contenido es Markdown que pasa a ser contenido del usuario: se toma al CREAR la hoja
 * y después no cambia de idioma. Los `id` no cambian.
 */

import { getLang, tIn } from '../lib/i18n/index.js'

export const TEMPLATE_NAME_MAX = 60
export const TEMPLATE_CONTENT_MAX = 20000

/** Claves del diccionario de cada plantilla de fábrica (el id es `factory:<clave>`). */
const FACTORY_KEYS = Object.freeze(['clase', 'resumen', 'practica', 'repaso'])

/**
 * @param {string} [lang]
 * @returns {Array<{id: string, name: string, factory: true, content_md: string}>}
 */
export function getFactoryTemplates(lang = getLang()) {
  return FACTORY_KEYS.map((key) => ({
    id: `factory:${key}`,
    name: tIn(lang, `templates.factory.${key}.name`),
    factory: true,
    content_md: tIn(lang, `templates.factory.${key}.content`),
  }))
}
