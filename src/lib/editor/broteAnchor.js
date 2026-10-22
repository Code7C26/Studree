/**
 * Ancla de la tarjeta del Brote dentro de una hoja (Fase 14.1, spec § 3): la
 * respuesta de un atajo se mete en el papel debajo del bloque donde terminó la
 * selección y empuja hacia abajo lo que sigue. Ver docs/features/folder.md.
 *
 * Es una DECORACIÓN widget de ProseMirror: no forma parte del documento ni del
 * Markdown que se guarda (ADR-011). El nodo del widget lo arma la carpeta y
 * React dibuja la tarjeta adentro con un portal.
 */

import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/** @typedef {{pos: number, dom: HTMLElement}} BroteAnchor */

const broteAnchorKey = new PluginKey('studreeBroteAnchor')

/**
 * Posición justo después del bloque de primer nivel que contiene `pos` (un
 * párrafo, una lista entera, una cita). Entre bloques (profundidad 0) es `pos`.
 * @param {import('@tiptap/pm/model').Node} doc
 * @param {number} pos
 * @returns {number}
 */
export function blockEndPos(doc, pos) {
  const resolved = doc.resolve(pos)
  return resolved.depth === 0 ? pos : resolved.after(1)
}

/**
 * Plugin con el ancla de la tarjeta (`{pos, dom}` o `null`). El meta
 * `{pos, dom}|null` la fija o la borra. Con cambios en el documento la posición
 * sigue al texto; si se borró lo que estaba justo antes (el bloque de arriba),
 * el ancla se borra y se llama a `onRemoved()` una vez.
 * @param {{onRemoved: () => void}} options
 * @returns {Plugin}
 */
export function createBroteAnchorPlugin({ onRemoved }) {
  return new Plugin({
    key: broteAnchorKey,
    state: {
      init: () => null,
      /** @returns {BroteAnchor|null} */
      apply(tr, previous) {
        const meta = tr.getMeta(broteAnchorKey)
        if (meta !== undefined) {
          if (!meta) return null
          return { pos: Math.max(0, Math.min(meta.pos, tr.doc.content.size)), dom: meta.dom }
        }
        if (!previous || !tr.docChanged) return previous
        const mapped = tr.mapping.mapResult(previous.pos, -1)
        if (mapped.deletedBefore) {
          onRemoved()
          return null
        }
        return mapped.pos === previous.pos ? previous : { pos: mapped.pos, dom: previous.dom }
      },
    },
    props: {
      decorations(state) {
        const anchor = broteAnchorKey.getState(state)
        if (!anchor) return DecorationSet.empty
        const { dom } = anchor
        return DecorationSet.create(state.doc, [
          // La misma `key` hace que ProseMirror reutilice el nodo al redibujar (no se remonta la tarjeta).
          Decoration.widget(anchor.pos, () => dom, {
            key: 'brote-inline',
            side: -1,
            // Clicks, teclas y la selección dentro de la tarjeta son de la tarjeta, no del editor.
            stopEvent: () => true,
            ignoreSelection: true,
          }),
        ])
      },
    },
  })
}

/**
 * Opciones: `onRemoved()` — se borró el bloque de arriba de la tarjeta.
 */
export const BroteAnchorExtension = Extension.create({
  name: 'studreeBroteAnchor',

  addOptions() {
    return { onRemoved: () => {} }
  },

  addProseMirrorPlugins() {
    const extension = this
    return [createBroteAnchorPlugin({ onRemoved: () => extension.options.onRemoved() })]
  },
})

/**
 * Pone (o con `null` saca) el ancla de la tarjeta en este editor.
 *
 * Si ya había un ancla con OTRO nodo, primero la saca: ProseMirror da por
 * iguales dos widgets con la misma `key` y reutilizaría el nodo viejo, así que
 * la tarjeta nueva se dibujaría en un nodo que no está en la página.
 * @param {import('@tiptap/react').Editor|null} editor
 * @param {BroteAnchor|null} anchor
 */
export function setBroteAnchor(editor, anchor) {
  if (!editor || editor.isDestroyed) return
  const current = broteAnchorKey.getState(editor.state)
  if (anchor && current && current.dom !== anchor.dom) {
    editor.view.dispatch(editor.state.tr.setMeta(broteAnchorKey, null))
  }
  editor.view.dispatch(editor.state.tr.setMeta(broteAnchorKey, anchor ?? null))
}

/**
 * Dónde está el ancla de este editor (o `null` si no tiene).
 * @param {import('@tiptap/react').Editor|null} editor
 * @returns {{pos: number}|null}
 */
export function getBroteAnchor(editor) {
  if (!editor || editor.isDestroyed) return null
  const anchor = broteAnchorKey.getState(editor.state)
  return anchor ? { pos: anchor.pos } : null
}
