import { Link } from 'react-router-dom'
import { Icon } from '../../ui/Icon'
import { subjectFolderPath } from '../../../constants/routes'
import { formatSheetDateLong } from '../../../lib/format/sheetDate.js'
import { answerText } from '../../../lib/assistant/quizRecord.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * @typedef {import('../../../lib/assistant/quizRecord.js').RecordQuestion} RecordQuestion
 */

/**
 * Registro de un examen: puntaje y TODAS las preguntas (✔ / ✘ / "Sin corregir");
 * en las falladas y sin corregir, tu respuesta, la correcta o de referencia, la
 * devolución, la explicación y el link a la hoja. Presentacional: lo usan la
 * ventana del examen y la página de Mi estudio. Todo lo del modelo va como texto.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.createdAt]  ISO del intento.
 * @param {{total: number, correct: number}} props.score
 * @param {RecordQuestion[]|null} props.questions  `null` = prueba anterior, sin detalle.
 * @param {import('react').Ref<HTMLHeadingElement>} [props.headingRef]  Para llevar el foco al resultado.
 * @param {() => void} [props.onNavigate]  Se llama al ir a una hoja (la ventana del examen se cierra).
 */
export function QuizRecordView({ title, createdAt, score, questions, headingRef, onNavigate }) {
  const { t } = useI18n()
  return (
    <div className="space-y-4 text-sm">
      <header>
        <p className="text-xs text-text-muted">
          {title}
          {createdAt ? ` · ${formatSheetDateLong(createdAt)}` : ''}
        </p>
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold">
          {t('study.record.score', { correct: score.correct, total: score.total })}
        </h3>
      </header>

      {questions === null ? (
        <p className="text-text-muted">{t('study.record.noDetail')}</p>
      ) : (
        <ol className="space-y-3">
          {questions.map((q) => {
            const reference = q.type === 'open' ? t('study.record.referenceOpen') : t('study.record.referenceAnswer')
            return (
              <li key={q.id} className="rounded-lg border border-border p-3">
                <p className="flex items-start gap-1.5 font-medium">
                  {q.correct === true && <Icon name="check" size={14} className="mt-0.5 shrink-0 text-accent-soft" />}
                  {q.correct === false && <Icon name="close" size={14} className="mt-0.5 shrink-0 text-red-300" />}
                  <span className="sr-only">
                    {q.correct === true ? t('study.record.correct') : q.correct === false ? t('study.record.wrong') : t('study.record.ungradedPrefix')}
                  </span>
                  <span className="whitespace-pre-wrap break-words">{q.prompt}</span>
                </p>
                {q.correct === null && <p className="mt-1 text-xs text-warn">{t('study.record.ungraded')}</p>}
                {q.correct === true && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-text-muted">{t('study.record.yourAnswer', { answer: answerText(q, q.given) })}</p>
                )}
                {q.correct !== true && (
                  <>
                    <p className="mt-2 whitespace-pre-wrap break-words text-text-muted">{t('study.record.yourAnswer', { answer: answerText(q, q.given) })}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {reference}: {answerText(q, q.answer)}
                    </p>
                    {q.feedback && <p className="mt-2 whitespace-pre-wrap break-words text-text-muted">{q.feedback}</p>}
                    <p className="mt-2 whitespace-pre-wrap break-words text-text-muted">{q.explanation}</p>
                    {q.sheetId && q.subjectId && (
                      <Link
                        to={subjectFolderPath(q.subjectId, q.sheetId)}
                        onClick={onNavigate}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent-soft hover:underline"
                      >
                        <Icon name="file-text" size={12} />
                        {q.sheetDate ? t('study.record.sheetOf', { date: formatSheetDateLong(q.sheetDate) }) : t('study.record.seeSheet')}
                      </Link>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
