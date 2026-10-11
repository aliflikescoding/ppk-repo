import { useAuth } from './auth.js'

export default function SessionStatus() {
  const { loading, error, retry } = useAuth()
  if (loading) return <div role="status" className="facilities-state"><span className="loading loading-spinner text-primary" aria-hidden="true" /><p>Checking your session…</p></div>
  if (error) return (
    <div className="facilities-state">
      <p role="alert">{error}</p>
      <button type="button" className="btn auth-submit" onClick={retry}>Try again</button>
    </div>
  )
  return null
}
