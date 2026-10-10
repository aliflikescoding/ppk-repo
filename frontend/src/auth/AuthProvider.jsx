import { useEffect, useState } from 'react'
import api from '../api/index.js'
import { AuthContext, roles } from './auth.js'

const storageKey = 'revesrv-token'

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function restoreSession() {
      try {
        if (token) {
          const { data } = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          if (!Object.hasOwn(roles, data.user?.role)) throw new Error('Unsupported account role.')
          setUser(data.user)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        if (err.response?.status === 401 || err.message === 'Unsupported account role.') {
          sessionStorage.removeItem(storageKey)
          setToken(null)
          setUser(null)
        } else {
          setError('Unable to verify your session. Check your connection and try again.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    restoreSession()
    return () => controller.abort()
  }, [token, attempt])

  async function login(credentials, expectedRole) {
    const { data } = await api.post('/users/login', credentials)
    if (data.user?.role !== expectedRole) {
      throw new Error(`This account cannot access the ${roles[expectedRole].label.toLowerCase()} login.`)
    }
    if (typeof data.token !== 'string' || !data.token) throw new Error('The server returned an invalid session.')
    sessionStorage.setItem(storageKey, data.token)
    setError('')
    setUser(data.user)
    setToken(data.token)
  }

  function logout() {
    sessionStorage.removeItem(storageKey)
    setToken(null)
    setUser(null)
    setError('')
  }

  function retry() {
    setError('')
    setLoading(true)
    setAttempt((value) => value + 1)
  }

  return <AuthContext.Provider value={{ user, loading, error, login, logout, retry }}>{children}</AuthContext.Provider>
}
