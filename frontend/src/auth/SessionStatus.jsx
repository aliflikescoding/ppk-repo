import { useAuth } from './auth.js'

export default function SessionStatus() {
  const { loading, error, retry } = useAuth()
  if (loading) return <p role="status">Checking your session…</p>
  if (error) return (
    <div className="space-y-4">
      <p role="alert">{error}</p>
      <button type="button" className="btn btn-primary" onClick={retry}>Try again</button>
    </div>
  )
  return null
}
