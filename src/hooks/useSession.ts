import { useState, useEffect, useCallback } from 'react'
import type { SessionContext } from '@/lib/types'
import { getSessionContext, onWindowShown } from '@/lib/ipc'

interface UseSessionReturn {
  context: SessionContext | null
  refreshContext: () => void
}

export function useSession(): UseSessionReturn {
  const [context, setContext] = useState<SessionContext | null>(null)

  const refreshContext = useCallback(() => {
    getSessionContext().then(setContext)
  }, [])

  useEffect(() => {
    refreshContext()
    const cleanup = onWindowShown(refreshContext)
    return cleanup
  }, [refreshContext])

  return { context, refreshContext }
}
