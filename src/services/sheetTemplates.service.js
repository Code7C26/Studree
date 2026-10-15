/**
 * Plantillas de hoja del usuario (migración 0006). Las de fábrica están en
 * `constants/sheetTemplates.js`. Ver docs/features/sheet-templates.md.
 */

import { createCrudService } from './crudService.js'

const crud = createCrudService({ table: 'sheet_templates', orderBy: 'created_at', notifies: false })

export const sheetTemplatesService = {
  ...crud,

  /**
   * @param {{name: string, content_md: string}} values
   * @returns {Promise<import('../types/models.js').ServiceResult<import('../types/models.js').SheetTemplate>>}
   */
  create({ name, content_md }) {
    return crud.create({ name: name.trim(), content_md })
  },
}
