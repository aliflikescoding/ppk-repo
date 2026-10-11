import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth.js'
import { FiArrowRight, FiCalendar, FiClipboard, FiGrid, FiMail, FiUser } from 'react-icons/fi'

const shortcuts = [
  { path: '/facilities', icon: FiGrid, label: 'DISCOVER', title: 'Find your next space', description: 'Explore facilities and check their schedules before planning your next reservation.', action: 'Explore facilities' },
  { path: '/user/reservations', icon: FiCalendar, label: 'YOUR PLANS', title: 'Reservation history', description: 'Keep your campus plans in view. Review your reservations and follow their status.', action: 'View reservations' },
  { path: '/user/reports', icon: FiClipboard, label: 'CAMPUS CARE', title: 'Report history', description: 'See the issues you’ve reported and check how they’re progressing.', action: 'View reports' },
]

export default function UserDashboard() {
  const { user } = useAuth()

  return (
    <div className="user-dashboard">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div>
          <p className="auth-eyebrow">YOUR CAMPUS, CONNECTED</p>
          <h1 id="dashboard-title">Hello, {user.user_name}.</h1>
          <p className="dashboard-intro">Welcome to your corner of campus. Find a space for your next plan and keep track of what’s happening.</p>
          <Link to="/facilities" className="btn auth-submit mt-6">Explore facilities <FiArrowRight aria-hidden="true" /></Link>
        </div>
        <img src="/images/auth-campus.svg" alt="A welcoming campus with students, green spaces, and modern facilities" width="640" height="440" className="dashboard-illustration" />
      </section>

      <section className="dashboard-shortcuts" aria-labelledby="shortcuts-title">
        <div className="facilities-results-heading"><h2 id="shortcuts-title">Make the most of your campus.</h2></div>
        <div className="landing-features">
          {shortcuts.map(({ path, icon: Icon, label, title, description, action }) => (
            <article key={path} className="landing-feature facility-card dashboard-action-card">
              <div className="landing-feature-top"><span className="landing-feature-icon"><Icon aria-hidden="true" /></span><span className="auth-eyebrow">{label}</span></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={path} className="facility-details-link"><span className="facility-animated-text">{action}</span><FiArrowRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-account" aria-labelledby="account-title">
        <div className="dashboard-account-heading"><span className="landing-feature-icon"><FiUser aria-hidden="true" /></span><div><p className="auth-eyebrow">YOUR PROFILE</p><h2 id="account-title">Account details</h2></div></div>
        <dl className="dashboard-account-details">
          <div><dt><FiMail aria-hidden="true" /> Email address</dt><dd>{user.email}</dd></div>
          <div><dt><FiUser aria-hidden="true" /> Account role</dt><dd><span className="dashboard-role">User</span></dd></div>
        </dl>
      </section>
    </div>
  )
}
