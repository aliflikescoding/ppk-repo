import { Link } from 'react-router-dom'
import { FiArrowRight, FiArrowUpRight, FiCalendar, FiCheckCircle, FiMapPin, FiSearch, FiTool } from 'react-icons/fi'
import { roles, useAuth } from '../auth/auth.js'

const features = [
  { icon: FiSearch, title: 'Find your space', description: 'Explore campus facilities by location, type, and capacity to find a fit for your plans.', tag: 'DISCOVER' },
  { icon: FiCalendar, title: 'Make it happen', description: 'Check a facility’s schedule and submit a reservation for your next meeting or activity.', tag: 'RESERVE' },
  { icon: FiTool, title: 'Keep campus at its best', description: 'Report facility issues and follow their progress, all from your account.', tag: 'CARE' },
]

function Home() {
  const { user, loading } = useAuth()
  const accountPath = user ? roles[user.role].dashboard : '/register'
  const accountLabel = user ? 'Go to dashboard' : 'Create an account'

  return (
    <div className="landing-page">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-pill"><FiMapPin aria-hidden="true" /> YOUR CAMPUS, CONNECTED</p>
          <h1 id="hero-title">Better spaces.<br /><span>Better campus days.</span></h1>
          <p className="landing-intro">A place to meet. Room to create. Space to make things happen. Discover and reserve campus facilities with Revesrv.</p>
          <div className="landing-actions">
            <Link to="/facilities" className="btn auth-submit">Explore facilities <FiArrowRight aria-hidden="true" /></Link>
            {!loading && <Link to={accountPath} className="landing-text-link">{accountLabel} <FiArrowUpRight aria-hidden="true" /></Link>}
          </div>
          <p className="landing-hero-note"><FiCheckCircle aria-hidden="true" /> Discover spaces before you sign up.</p>
        </div>
        <div className="landing-hero-art">
          <div className="landing-art-label"><span aria-hidden="true" /> MAKE ROOM FOR WHAT’S NEXT</div>
          <img src="/images/auth-campus.svg" alt="Students enjoying a green campus with modern facilities" width="640" height="440" fetchPriority="high" />
          <div className="landing-art-caption"><span><FiCalendar aria-hidden="true" /> Your next plan starts here.</span><FiArrowUpRight aria-hidden="true" /></div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="features-title">
        <div className="landing-section-heading">
          <div><p className="auth-eyebrow">LESS SEARCHING. MORE DOING.</p><h2 id="features-title">One place for your campus plans.</h2></div>
          <p>From finding the right room to keeping it ready for the next person.</p>
        </div>
        <div className="landing-features">
          {features.map(({ icon: Icon, title, description, tag }) => (
            <article key={tag} className="landing-feature">
              <div className="landing-feature-top"><span className="landing-feature-icon"><Icon aria-hidden="true" /></span><span className="auth-eyebrow">{tag}</span></div>
              <h3>{title}</h3><p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-how" aria-labelledby="how-title">
        <div><p className="auth-eyebrow">A LITTLE PLANNING GOES A LONG WAY</p><h2 id="how-title">Your next space,<br />in three simple steps.</h2><Link to="/facilities" className="landing-text-link">Find a facility <FiArrowRight aria-hidden="true" /></Link></div>
        <ol className="landing-steps">
          <li><span aria-hidden="true">01</span><div><h3>Explore the possibilities</h3><p>Browse facilities and check their capacity, location, and schedule.</p></div></li>
          <li><span aria-hidden="true">02</span><div><h3>Get your account ready</h3><p>Register and wait for admin activation before signing in.</p></div></li>
          <li><span aria-hidden="true">03</span><div><h3>Send your reservation</h3><p>Choose your time, submit a request, and track its status in your dashboard.</p></div></li>
        </ol>
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <div><p className="landing-cta-eyebrow">ROOM FOR YOUR NEXT BIG IDEA</p><h2 id="cta-title">Make yourself at home.</h2><p>Your campus has possibilities. Let’s find yours.</p></div>
        <Link to={loading ? '/facilities' : accountPath} className="btn landing-cta-button">{loading ? 'Explore facilities' : accountLabel}<FiArrowRight aria-hidden="true" /></Link>
      </section>
    </div>
  )
}

export default Home
