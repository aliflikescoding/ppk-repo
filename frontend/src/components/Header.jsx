import { Link } from 'react-router-dom'
import { roles, useAuth } from '../auth/auth.js'

function Header() {
  const { user, loading, logout } = useAuth()
  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="navbar mx-auto max-w-6xl flex-wrap gap-2 px-4 sm:px-6">
        <Link to="/" className="text-xl font-bold text-primary">
          Revesrv
        </Link>
        <nav aria-label="Main navigation" className="ml-auto">
          <Link to="/" className="btn btn-ghost btn-sm">
            Home
          </Link>
          <Link to="/facilities" className="btn btn-ghost btn-sm">
            Facilities
          </Link>
          {!loading && (user ? (
            <>
              <Link to={roles[user.role].dashboard} className="btn btn-ghost btn-sm">Dashboard</Link>
              <button type="button" onClick={logout} className="btn btn-ghost btn-sm">Sign out</button>
            </>
          ) : <Link to="/login" className="btn btn-primary btn-sm">Login</Link>)}
        </nav>
      </div>
    </header>
  )
}

export default Header
