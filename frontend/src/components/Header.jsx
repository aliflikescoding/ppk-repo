import { Link } from 'react-router-dom'

function Header() {
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
        </nav>
      </div>
    </header>
  )
}

export default Header
