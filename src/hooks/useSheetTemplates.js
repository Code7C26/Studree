/**
 * Plantillas de hoja: las de fábrica + las del usuario. Ver
 * docs/features/sheet-templates.md.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { sheetTemplatesService } from '../services/sheetTemplates.service.js'
import { getFactoryTemplates, TEMPLATE_CONTENT_MAX, TEMPLATE_NAME_MAX } from '../constants/sheetTemplates.js'
import { useI18n } from './useI18n.js'
import { t } from '../lib/i18n/index.js'

/** @param {string} name @returns {string|null} */
function validateName(name) {
  const trimmed = name.trim()
  if (!trimmed) return t('templates.errors.nameRequired')
  if (trimmed.length > TEMPLATE_NAME_MAX) return t('templates.errors.nameTooLong', { max: TEMPLATE_NAME_MAX })
  return null
}

/** @param {string} content @returns {string|null} */
function validateContent(content) {
  if (!content.trim()) return t('templates.errors.contentEmpty')
  if (content.length > TEMPLATE_CONTENT_MAX) return t('templates.errors.contentTooLong', { max: TEMPLATE_CONTENT_MAX })
  return null
}

/**
 * @returns {{
 *   templates: import('../types/models.js').SheetTemplate[],
 *   all: import('../types/models.js').SheetTemplate[],
 *   loading: boolean,
 *   error: string|null,
 *   createTemplate: (name: string, content: string) => Promise<string|null>,
 *   renameTemplate: (id: string, name: string) => Promise<string|null>,
 *   updateTemplateContent: (id: string, content: string) => Promise<string|null>,
 *   deleteTemplate: (id: string) => Promise<string|null>,
 * }}
 */
export function useSheetTemplates() {
  const { lang } = useI18n()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    sheetTemplatesService
      .list(undefined, (cached) => {
        if (alive) setTemplates(cached)
      })
      .then(({ data, error: listError }) => {
        if (!alive) return
        setTemplates(data)
        setError(listError)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const all = useMemo(() => [...getFactoryTemplates(lang), ...templates], [templates, lang])

  const createTemplate = useCallback(async (name, content) => {
    const invalid = validateName(name) ?? validateContent(content)
    if (invalid) return invalid
    const { data, error: createError } = await sheetTemplatesService.create({ name, content_md: content })
    if (createError) return createError
    setTemplates((current) => [...current, data])
    return null
  }, [])

  const update = useCallback(async (id, values) => {
    const { data, error: updateError } = await sheetTemplatesService.update(id, values)
    if (updateError) return updateError
    setTemplates((current) => current.map((template) => (template.id === id ? data : template)))
    return null
  }, [])

  const renameTemplate = useCallback(async (id, name) => validateName(name) ?? update(id, { name: name.trim() }), [update])
  const updateTemplateContent = useCallback(
    async (id, content) => validateContent(content) ?? update(id, { content_md: content }),
    [update],
  )

  const deleteTemplate = useCallback(async (id) => {
    const { error: removeError } = await sheetTemplatesService.remove(id)
    if (removeError) return removeError
    setTemplates((current) => current.filter((template) => template.id !== id))
    return null
  }, [])

  return { templates, all, loading, error, createTemplate, renameTemplate, updateTemplateContent, deleteTemplate }
}
