import { roles, useAuth } from '../auth/auth.js'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiBarChart2, FiCalendar, FiCheckCircle, FiClipboard, FiGrid, FiLayers, FiMail, FiMapPin, FiTag, FiUser, FiUsers } from 'react-icons/fi'

const groups = [
  { title: 'Campus operations', description: 'Keep spaces, bookings, and reported issues in view.', tools: [
    { path: '/admin/facilities', icon: FiGrid, label: 'CAMPUS SPACES', title: 'Facilities', description: 'View and manage the spaces that keep campus moving.', action: 'View facilities' },
    { path: '/admin/reservations', icon: FiCalendar, label: 'BOOKINGS', title: 'Reservations', description: 'Review campus bookings and manage reservation records.', action: 'View reservations' },
    { path: '/admin/reports', icon: FiClipboard, label: 'CAMPUS CARE', title: 'Reports', description: 'Review facility issues and keep track of their progress.', action: 'View reports' },
  ] },
  { title: 'People & insights', description: 'Manage access and understand how campus spaces are used.', tools: [
    { path: '/admin/users', icon: FiUsers, label: 'ACCOUNTS', title: 'Users', description: 'Review user accounts and manage their details.', action: 'View users' },
    { path: '/admin/approve-users', icon: FiCheckCircle, label: 'ACCOUNT ACCESS', title: 'Approve users', description: 'Review new registrations and activate approved accounts.', action: 'Review registrations' },
    { path: '/admin/facility-recap', icon: FiBarChart2, label: 'CAMPUS INSIGHTS', title: 'Facility recap', description: 'Review occupancy and damage across campus facilities.', action: 'Rekap okupansi & kerusakan' },
  ] },
  { title: 'Campus organization', description: 'Keep facility references and report categories up to date.', tools: [
    { path: '/admin/facility-types', icon: FiLayers, label: 'SPACE TYPES', title: 'Facility types', description: 'Organize facilities by the kinds of spaces they offer.', action: 'Manage types' },
    { path: '/admin/facility-locations', icon: FiMapPin, label: 'LOCATIONS', title: 'Facility locations', description: 'Manage the locations used to organize campus spaces.', action: 'Manage locations' },
    { path: '/admin/report-categories', icon: FiTag, label: 'ISSUE TYPES', title: 'Report categories', description: 'Manage categories for reporting campus facility issues.', action: 'Manage categories' },
  ] },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div className="user-dashboard">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div>
          <p className="auth-eyebrow">YOUR ADMIN WORKSPACE</p>
          <h1 id="dashboard-title">Hello, {user.user_name}.</h1>
          <p className="dashboard-intro">Keep your campus connected. Manage spaces, oversee bookings and reports, and help your community get started.</p>
          <Link to="/admin/facility-recap" className="btn auth-submit mt-6">View facility recap <FiArrowRight aria-hidden="true" /></Link>
        </div>
        <img src="/images/auth-campus.svg" alt="A welcoming campus with students, green spaces, and modern facilities" width="640" height="440" className="dashboard-illustration" />
      </section>

      {groups.map(({ title, description, tools }, index) => (
        <section key={title} className="dashboard-shortcuts" aria-labelledby={`admin-group-${index}`}>
          <div className="facilities-results-heading admin-group-heading"><h2 id={`admin-group-${index}`}>{title}</h2><p>{description}</p></div>
          <div className="landing-features">
            {tools.map(({ path, icon: Icon, label, title: toolTitle, description: toolDescription, action }) => (
              <article key={path} className="landing-feature facility-card dashboard-action-card">
                <div className="landing-feature-top"><span className="landing-feature-icon"><Icon aria-hidden="true" /></span><span className="auth-eyebrow">{label}</span></div>
                <h3>{toolTitle}</h3><p>{toolDescription}</p>
                <Link to={path} className="facility-details-link"><span className="facility-animated-text">{action}</span><FiArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="dashboard-account" aria-labelledby="account-title">
        <div className="dashboard-account-heading"><span className="landing-feature-icon"><FiUser aria-hidden="true" /></span><div><p className="auth-eyebrow">YOUR PROFILE</p><h2 id="account-title">Account details</h2></div></div>
        <dl className="dashboard-account-details">
          <div><dt><FiMail aria-hidden="true" /> Email address</dt><dd>{user.email}</dd></div>
          <div><dt><FiUser aria-hidden="true" /> Account role</dt><dd><span className="dashboard-role">{roles[user.role].label}</span></dd></div>
        </dl>
      </section>
    </div>
  )
}
