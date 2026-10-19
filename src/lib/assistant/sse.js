// COPIA DELIBERADA de supabase/functions/assistant/sse.js: el servidor corre en
// Deno y el cliente en el navegador (Vite), así que no pueden compartir el
// archivo. Mismo contrato: `createSseParser() → {push(chunk), flush()}`.
// Si se cambia uno, cambiar el otro.

// Parser de Server-Sent Events. Recibe trozos de texto (que pueden cortar a
// mitad de línea) y devuelve los eventos `data:` ya parseados como JSON.
// Tolera CRLF, comentarios (`:`), `[DONE]` y JSON inválido (se descartan).

/** Tope del buffer sin salto de línea: evita crecer sin límite con basura. */
const MAX_BUFFER = 1_000_000

/**
 * @returns {{push: (chunk: string) => unknown[], flush: () => unknown[]}}
 */
export function createSseParser() {
  let buffer = ''
  let dataLines = []

  function finishEvent(out) {
    if (!dataLines.length) return
    const raw = dataLines.join('\n')
    dataLines = []
    if (raw === '[DONE]') return
    try {
      out.push(JSON.parse(raw))
    } catch {
      // evento inválido: se descarta
    }
  }

  function consumeLine(line, out) {
    if (line === '') return finishEvent(out)
    if (line.startsWith(':')) return
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }

  return {
    push(chunk) {
      const out = []
      buffer += chunk
      let idx
      while ((idx = buffer.search(/\r\n|\n|\r(?!$)/)) !== -1) {
        const m = buffer.slice(idx).match(/^(\r\n|\n|\r)/)
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + m[0].length)
        consumeLine(line, out)
      }
      if (buffer.length > MAX_BUFFER) buffer = ''
      return out
    },
    /** Al cerrar el stream: procesa lo que haya quedado sin salto final. */
    flush() {
      const out = []
      if (buffer) consumeLine(buffer, out)
      buffer = ''
      finishEvent(out)
      return out
    },
  }
}
