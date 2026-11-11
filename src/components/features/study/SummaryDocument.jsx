import { Link } from 'react-router-dom'
import { subjectFolderPath } from '../../../constants/routes'
import { parseSummaryBody } from '../../../lib/assistant/summaryBlocks.js'
import { basedOnLabel, formatUtcDate, summaryScopeLabel } from '../../../lib/assistant/summaryDoc.js'
import { useI18n } from '../../../hooks/useI18n.js'
import { formatNumericDate } from '../../../lib/format/dateParts.js'

/** @typedef {import('../../../lib/assistant/summaryBlocks.js').Inline} Inline */

/** @param {{inlines: Inline[]}} props */
function Inlines({ inlines }) {
  return inlines.map((part, index) => (part.bold ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>))
}

/**
 * Cuerpo de una sección: párrafos y listas como elementos de React. Lo que
 * vino del modelo es siempre texto: nunca se interpreta como HTML.
 * @param {{body: string}} props
 */
function SectionBody({ body }) {
  return parseSummaryBody(body).map((block, index) => {
    if (block.type === 'p') {
      return (
        <p key={index} className="break-words">
          <Inlines inlines={block.inlines} />
        </p>
      )
    }
    const List = block.type === 'ul' ? 'ul' : 'ol'
    return (
      <List key={index} className={`ml-5 space-y-0.5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'}`}>
        {block.items.map((item, i) => (
          <li key={i} className="break-words">
            <Inlines inlines={item} />
          </li>
        ))}
      </List>
    )
  })
}

/**
 * Resumen del Brote como documento: título, fecha, "basado en N hojas", si usó
 * conocimiento externo, secciones numeradas, conceptos clave y las hojas
 * usadas. Presentacional: lo usan la ventana del resumen, Mi estudio y la
 * impresión (`print`: sin links).
 * @param {Object} props
 * @param {import('../../../lib/assistant/summaryDoc.js').SummaryDoc} props.doc
 * @param {boolean} [props.print]  Versión para imprimir: sin links.
 * @param {() => void} [props.onNavigate]  Se llama al ir a una hoja (la ventana se cierra).
 */
export function SummaryDocument({ doc, print = false, onNavigate }) {
  const { t, lang } = useI18n()
  const created = new Date(doc.createdAt)
  const date = formatNumericDate(created, lang, true)
  const heading = 'summary-heading font-display text-lg font-bold text-accent-hover'
  return (
    <article className="summary-doc space-y-4 text-sm leading-relaxed text-ink">
      <header>
        <h3 className="font-display text-2xl font-bold">{doc.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>
            {date} · {summaryScopeLabel(doc.scopeType)} · {basedOnLabel(doc.sheetCount, doc.totalSheets)}
          </span>
          {doc.external && (
            <span className="rounded-full border border-ink-muted/50 px-2 py-0.5">{t('study.summary.external')}</span>
          )}
        </p>
      </header>

      {doc.sections.map((section, index) => (
        <section key={index} className="summary-section space-y-1.5">
          <h4 className={heading}>
            {index + 1}. {section.heading}
          </h4>
          <SectionBody body={section.body} />
        </section>
      ))}

      {doc.keyConcepts.length > 0 && (
        <section className="summary-section space-y-1.5">
          <h4 className={heading}>{t('study.summary.keyConcepts')}</h4>
          <dl className="space-y-1">
            {doc.keyConcepts.map((concept, index) => (
              <div key={index} className="break-words">
                <dt className="inline font-semibold">{concept.term}</dt>
                <dd className="inline">: {concept.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {doc.sheets.length > 0 && (
        <section className="summary-section space-y-1.5">
          <h4 className={heading}>{t('study.summary.sheetsUsed')}</h4>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {doc.sheets.map((sheet, index) => (
              <li key={`${sheet.sheetId}-${index}`}>
                {print ? (
                  formatUtcDate(sheet.date, lang)
                ) : (
                  <Link
                    to={subjectFolderPath(sheet.subjectId, sheet.sheetId)}
                    onClick={onNavigate}
                    className="underline decoration-ink-muted/50 underline-offset-2 hover:text-accent-hover"
                  >
                    {formatUtcDate(sheet.date, lang)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
