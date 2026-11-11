// Bucle de conversación con herramientas. No conoce Gemini: recibe `callModel`.
// Las `modelParts` del modelo se agregan SIN tocar (firmas de razonamiento) y
// las respuestas de herramientas van en un turno `user` con una
// `functionResponse` por llamada, en el mismo orden.

/** Pasos máximos (llamadas al modelo) y llamadas a herramientas por paso. */
export const MAX_STEPS = 6
export const MAX_CALLS_PER_STEP = 8

/**
 * @param {{
 *  callModel: (contents: object[]) => Promise<{text: string, calls: Array<{id?: string, name: string, args: object}>, modelParts: object[]}>,
 *  runTool: (name: string, args: object) => Promise<{result: object, proposal?: object}>,
 *  contents: object[],
 *  emit: (event: object) => void,
 *  maxSteps?: number,
 * }} p
 * @returns {Promise<{contents: object[], finalText: string}>}
 */
export async function runConversation({ callModel, runTool, contents, emit, maxSteps = MAX_STEPS }) {
  const history = [...contents]
  for (let step = 0; step < maxSteps; step++) {
    const { text, calls, modelParts } = await callModel(history)
    if (!calls.length) return { contents: history, finalText: text }

    history.push({ role: 'model', parts: modelParts })
    const responses = []
    for (let i = 0; i < calls.length; i++) {
      const { id, name, args } = calls[i]
      const idKey = id ? { id } : {}
      if (i >= MAX_CALLS_PER_STEP) {
        responses.push({ functionResponse: { ...idKey, name, response: { error: 'demasiadas llamadas en un turno' } } })
        continue
      }
      emit({ type: 'tool', name })
      let out
      try {
        out = await runTool(name, args)
      } catch {
        out = { result: { error: 'falló la herramienta' } }
      }
      if (out.proposal) emit({ type: 'proposal', proposal: out.proposal })
      responses.push({ functionResponse: { ...idKey, name, response: out.result ?? {} } })
    }
    history.push({ role: 'user', parts: responses })
  }
  emit({ type: 'error', code: 'steps' })
  return { contents: history, finalText: '' }
}
