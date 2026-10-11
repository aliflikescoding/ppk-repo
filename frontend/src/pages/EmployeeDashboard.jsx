import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth.js'
import { FiArrowRight, FiCalendar, FiClipboard, FiGrid, FiMail, FiUser } from 'react-icons/fi'

const shortcuts = [
  { path: '/employee/facilities', icon: FiGrid, label: 'CAMPUS SPACES', title: 'Facility availability', description: 'Review campus facilities and manage their availability for upcoming activities.', action: 'Manage availability' },
  { path: '/employee/reservations', icon: FiCalendar, label: 'BOOKING REQUESTS', title: 'Resolve reservations', description: 'Review facility bookings and approve or reject reservation requests.', action: 'Review reservations' },
  { path: '/employee/reports', icon: FiClipboard, label: 'CAMPUS CARE', title: 'Resolve reports', description: 'Review reported issues and update their progress to keep campus at its best.', action: 'Review reports' },
]

export default function EmployeeDashboard() {
  const { user } = useAuth()

  return (
    <div className="user-dashboard">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div>
          <p className="auth-eyebrow">YOUR EMPLOYEE WORKSPACE</p>
          <h1 id="dashboard-title">Hello, {user.user_name}.</h1>
          <p className="dashboard-intro">Keep campus running smoothly. Manage facility availability, review booking requests, and follow up on reported issues.</p>
          <Link to="/employee/facilities" className="btn auth-submit mt-6">Manage facilities <FiArrowRight aria-hidden="true" /></Link>
        </div>
        <img src="/images/auth-campus.svg" alt="A welcoming campus with students, green spaces, and modern facilities" width="640" height="440" className="dashboard-illustration" />
      </section>

      <section className="dashboard-shortcuts" aria-labelledby="shortcuts-title">
        <div className="facilities-results-heading"><h2 id="shortcuts-title">Keep your campus moving.</h2></div>
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
          <div><dt><FiUser aria-hidden="true" /> Account role</dt><dd><span className="dashboard-role">Employee</span></dd></div>
        </dl>
      </section>
    </div>
  )
}
