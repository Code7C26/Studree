// Escáner de castellano suelto: solo lo usan los tests (noSpanishLeft.test.js). La app no lo
// importa, así que no entra al bundle. Heurística, no un parser: detecta texto visible en
// literales y en JSX, e ignora comentarios, `console.*` e imports.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Textos que son castellano legítimo y no se traducen (identificadores guardados, nombres de idioma). */
export const ALLOWED_LITERALS = Object.freeze(['aprobada', 'cursando', 'pendiente', 'cursar', 'rendir', 'Castellano', 'English'])

/** Palabras comunes de la interfaz que no llevan tilde. */
export const COMMON_WORDS = Object.freeze([
  'Cancelar', 'Guardar', 'Borrar', 'Eliminar', 'Crear', 'Nueva', 'Nuevo', 'Agregar', 'Cerrar',
  'Volver', 'Buscar', 'Aceptar', 'Rechazar', 'Cargando',
  'Resumen', 'Examen', 'Registro', 'Materia', 'Materias', 'Carrera', 'Carreras', 'Hoja', 'Hojas',
  'Tema', 'Temas', 'Pregunta', 'Preguntas', 'Respuesta', 'Estudio', 'Tarea', 'Tareas', 'Inicio',
  'Perfil', 'Notas', 'Fecha', 'Nombre', 'Todas', 'Todos', 'Ninguna', 'Papelera', 'Adjuntos',
  'Plantilla', 'Plantillas', 'Importar', 'Exportar', 'Editar', 'Renombrar', 'Mover', 'Abrir',
  'Salir', 'Entrar', 'Enviar', 'Siguiente', 'Anterior', 'Empezar', 'Terminar', 'Resultado',
  'Puntaje', 'Correcta', 'Incorrecta', 'Verdadero', 'Falso',
])

const ACCENTS = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/
const WORDS = new RegExp(`\\b(${COMMON_WORDS.join('|')})\\b`, 'i')

/** @param {string} text */
function isSpanish(text) {
  const clean = text.trim()
  if (!/[A-Za-zÁ-ú]/.test(clean) || ALLOWED_LITERALS.includes(clean)) return false
  return ACCENTS.test(clean) || WORDS.test(clean)
}

/**
 * Recorre el código una vez: junta los literales de texto y arma una copia "enmascarada"
 * (comentarios y contenido de literales reemplazados por espacios) para buscar texto de JSX.
 * @param {string} source
 */
function tokenize(source) {
  const literals = []
  let masked = ''
  let line = 1
  let i = 0
  const blank = (text) => text.replace(/[^\n]/g, ' ')
  while (i < source.length) {
    const char = source[i]
    const next = source[i + 1]
    if (char === '/' && next === '/') {
      let end = source.indexOf('\n', i)
      if (end === -1) end = source.length
      masked += blank(source.slice(i, end))
      i = end
    } else if (char === '/' && next === '*') {
      let end = source.indexOf('*/', i + 2)
      end = end === -1 ? source.length : end + 2
      const chunk = source.slice(i, end)
      masked += blank(chunk)
      line += (chunk.match(/\n/g) ?? []).length
      i = end
    } else if (char === "'" || char === '"' || char === '`') {
      const startLine = line
      let j = i + 1
      while (j < source.length) {
        if (source[j] === '\\') { j += 2; continue }
        if (source[j] === char) break
        if (source[j] === '\n') {
          if (char !== '`') break
          line += 1
        }
        j += 1
      }
      const body = source.slice(i + 1, j)
      literals.push({ text: body, line: startLine })
      masked += `${char}${blank(body)}${source[j] === char ? char : ''}`
      i = source[j] === char ? j + 1 : j
    } else {
      if (char === '\n') line += 1
      masked += char
      i += 1
    }
  }
  return { literals, masked }
}

/**
 * Castellano visible en un fuente.
 * @param {string} source
 * @returns {Array<{text: string, line: number}>}
 */
export function findSpanish(source) {
  const lines = source.split('\n')
  const { literals, masked } = tokenize(source)
  const hits = []

  for (const literal of literals) {
    const lineText = lines[literal.line - 1] ?? ''
    if (/console\./.test(lineText) || /^\s*(import|export)\b.*\bfrom\b/.test(lineText) || /\bimport\(/.test(lineText)) continue
    if (isSpanish(literal.text)) hits.push({ text: literal.text.trim(), line: literal.line })
  }

  for (const match of masked.matchAll(/>([^<>{}]*)</g)) {
    const text = match[1]
    if (!isSpanish(text)) continue
    const before = masked.slice(0, match.index + 1)
    const lead = text.length - text.trimStart().length
    hits.push({ text: text.trim().replace(/\s+/g, ' '), line: (before.match(/\n/g) ?? []).length + 1 + (text.slice(0, lead).match(/\n/g) ?? []).length })
  }

  return hits.sort((a, b) => a.line - b.line)
}

/**
 * Recorre un directorio y devuelve los hallazgos con ruta relativa y barras normales.
 * Excluye tests, `src/lib/i18n/` (los diccionarios son castellano a propósito) y `src/types/`.
 * @param {string} root
 * @returns {Array<{file: string, line: number, text: string}>}
 */
export function scanSourceTree(root) {
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      const posix = path.split('\\').join('/')
      if (statSync(path).isDirectory()) {
        if (posix === 'src/lib/i18n' || posix === 'src/types') continue
        walk(path)
      } else if (/\.(js|jsx)$/.test(name) && !/\.test\.js$/.test(name)) {
        for (const hit of findSpanish(readFileSync(path, 'utf8'))) out.push({ file: posix, ...hit })
      }
    }
  }
  walk(root)
  return out
}
