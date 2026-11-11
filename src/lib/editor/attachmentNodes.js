/**
 * Adjuntos dentro del editor (Fase 13, ver docs/features/attachments.md).
 *
 * - `AttachmentImage`: la imagen guarda `src="adjunto:<id>"` en el documento
 *   (así el Markdown no cambia) y en la VISTA lo cambia por un link firmado.
 *   Mientras sube muestra "Subiendo…"; si no existe, "Adjunto no disponible".
 * - `AttachmentLinkClick`: click en un link `adjunto:` → abre el archivo.
 */

import Image from '@tiptap/extension-image'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { attachmentHref, parseAttachmentHref } from '../attachments/refs.js'
import { getLang, tIn } from '../i18n/index.js'

export const AttachmentImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      /** @type {(id: string) => Promise<string|null>} */
      resolveAttachment: async () => null,
      /** @type {(id: string) => boolean} */
      isUploading: () => false,
    }
  },

  addNodeView() {
    const options = this.options
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.className = 'sheet-attachment-image'
      const img = document.createElement('img')
      img.alt = node.attrs.alt ?? ''
      if (node.attrs.title) img.title = node.attrs.title

      const id = parseAttachmentHref(node.attrs.src)
      if (!id) {
        img.src = node.attrs.src
        dom.append(img)
        return { dom }
      }

      const status = document.createElement('span')
      status.className = 'sheet-attachment-status'
      status.textContent = options.isUploading(id)
        ? tIn(getLang(), 'folder.attachments.uploading', { name: img.alt || tIn(getLang(), 'folder.attachments.imageName') })
        : tIn(getLang(), 'folder.attachments.loadingImage')
      dom.append(status)

      let alive = true
      options.resolveAttachment(id).then((url) => {
        if (!alive) return
        if (!url) {
          status.textContent = tIn(getLang(), 'folder.attachments.missing')
          dom.dataset.state = 'missing'
          return
        }
        img.onload = () => status.remove()
        img.onerror = () => {
          status.textContent = tIn(getLang(), 'folder.attachments.missing')
        }
        img.src = url
        dom.append(img)
      }).catch(() => {
        if (!alive) return
        status.textContent = tIn(getLang(), 'folder.attachments.missing')
        dom.dataset.state = 'missing'
      })

      return {
        dom,
        destroy: () => {
          alive = false
        },
      }
    }
  },
})

export const AttachmentLinkClick = Extension.create({
  name: 'attachmentLinkClick',

  addOptions() {
    return { /** @type {(id: string) => void} */ onOpen: () => {} }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: new PluginKey('attachmentLinkClick'),
        props: {
          handleClick(_view, _pos, event) {
            const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
            const id = parseAttachmentHref(anchor?.getAttribute('href'))
            if (!id) return false
            event.preventDefault()
            options.onOpen(id)
            return true
          },
        },
      }),
    ]
  },
})

/**
 * Inserta la referencia en la posición del cursor: imagen en el texto o link.
 * @param {import('@tiptap/react').Editor} editor
 * @param {{id: string, name: string, isImage: boolean}} attachment
 */
export function insertAttachment(editor, { id, name, isImage }) {
  const href = attachmentHref(id)
  const content = isImage
    ? { type: 'image', attrs: { src: href, alt: name } }
    : [{ type: 'text', text: name, marks: [{ type: 'link', attrs: { href } }] }, { type: 'text', text: ' ' }]
  editor.chain().focus().insertContent(content).run()
}

/**
 * Saca del documento todas las referencias a un adjunto (subida fallida).
 * @param {import('@tiptap/react').Editor} editor
 * @param {string} id
 */
export function removeAttachment(editor, id) {
  if (!editor || editor.isDestroyed) return
  const href = attachmentHref(id)
  const ranges = []
  editor.state.doc.descendants((node, pos) => {
    const isImage = node.type.name === 'image' && node.attrs.src === href
    const isLink = node.isText && node.marks.some((mark) => mark.type.name === 'link' && mark.attrs.href === href)
    if (isImage || isLink) ranges.push([pos, pos + node.nodeSize])
  })
  if (ranges.length === 0) return
  const tr = editor.state.tr
  for (const [from, to] of ranges.reverse()) tr.delete(from, to)
  editor.view.dispatch(tr)
}
