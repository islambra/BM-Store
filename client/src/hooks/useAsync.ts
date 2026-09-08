import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../services/api'

export function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fnRef.current())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run()
  }, [run])

  return { data, loading, error, reload: run }
}