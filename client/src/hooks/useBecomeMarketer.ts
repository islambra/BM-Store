import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function useBecomeMarketer() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [promptOpen, setPromptOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const open = useCallback(() => {
    if (!user) {
      navigate('/marketer/signup')
    } else if (user.role === 'MARKETER') {
      navigate('/marketer')
    } else if (user.role === 'USER') {
      setPromptOpen(true)
    }
  }, [user, navigate])

  const confirmLogoutAndContinue = useCallback(async () => {
    setBusy(true)
    try {
      await logout()
    } catch {
      /* best-effort, local state is cleared */
    } finally {
      setBusy(false)
      setPromptOpen(false)
      window.setTimeout(() => navigate('/marketer/signup', { replace: true }), 0)
    }
  }, [logout, navigate])

  return { open, promptOpen, setPromptOpen, busy, confirmLogoutAndContinue }
}