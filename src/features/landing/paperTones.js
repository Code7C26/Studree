import { DEFAULT_COLOR } from '../../constants/palette.js'
import { getSubjectTones } from '../../constants/subjectTones.js'

/**
 * Verde de los títulos sobre el papel crema. Sale de los tonos de materia de la app (ADR-018),
 * que pasan contraste AA; `accent-hover` solo llega a 3.1:1 sobre el papel.
 */
export const PAPER_HEADING = getSubjectTones(DEFAULT_COLOR).onPaper
