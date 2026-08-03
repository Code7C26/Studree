import { useCallback, useEffect, useState } from 'react'
import {
  getFolders,
  createFolder as createFolderSvc,
  updateFolder as updateFolderSvc,
  deleteFolder as deleteFolderSvc,
} from '../services/folders.service'

/**
 * Estado + acciones de carpetas (carreras/cursos).
 * @returns {{
 *   folders: import('../types/models.js').Folder[],
 *   loading: boolean,
 *   createFolder: (data: {name:string, color?:string}) => void,
 *   updateFolder: (id: string, updates: object) => void,
 *   removeFolder: (id: string) => void,
 * }}
 */
export function useFolders() {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setFolders(getFolders())
  }, [])

  useEffect(() => {
    refresh()
    setLoading(false)
  }, [refresh])

  const createFolder = useCallback(
    (data) => {
      createFolderSvc(data)
      refresh()
    },
    [refresh],
  )

  const updateFolder = useCallback(
    (id, updates) => {
      updateFolderSvc(id, updates)
      refresh()
    },
    [refresh],
  )

  const removeFolder = useCallback(
    (id) => {
      deleteFolderSvc(id)
      refresh()
    },
    [refresh],
  )

  return { folders, loading, createFolder, updateFolder, removeFolder }
}
