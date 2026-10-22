import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

/** Carrega dados de uma rota GET e expõe `reload` para atualizar após mutações. */
export function useApi(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!path) return Promise.resolve()
    setLoading(true)
    return api
      .get(path)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, setData, error, loading, reload }
}
