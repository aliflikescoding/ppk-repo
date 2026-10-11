import { FiArrowUpRight, FiCalendar, FiCheckCircle } from 'react-icons/fi'
import BrandLogo from './BrandLogo.jsx'

export default function AuthLayout({ children, registration = false }) {
  return (
    <section className="auth-shell">
      <aside className="auth-visual">
        <div className="auth-brand"><BrandLogo /><span className="auth-brand-tag">CAMPUS SPACES</span></div>
        <div className="auth-story">
          <p className="auth-eyebrow">A BETTER CAMPUS STARTS HERE</p>
          <h2>Your campus.<br />Your possibilities.</h2>
          <p>Find your next space, plan your day, and help keep campus at its best.</p>
        </div>
        <img src="/images/auth-campus.svg" alt="Illustration of a welcoming campus with modern buildings, trees, and students" className="auth-illustration" width="640" height="440" />
        <div className="auth-features">
          <span><FiCalendar aria-hidden="true" /> Reserve a space</span>
          <span><FiCheckCircle aria-hidden="true" /> Report an issue</span>
        </div>
        <div className="auth-visual-footer"><span>{registration ? 'Make room for what’s next.' : 'Everything you need. One place.'}</span><FiArrowUpRight aria-hidden="true" /></div>
      </aside>
      <div className="auth-form-panel">{children}</div>
    </section>
  )
}
