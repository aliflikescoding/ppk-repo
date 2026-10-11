import { Link } from 'react-router-dom'
import { FiArrowUpRight } from 'react-icons/fi'
import BrandLogo from './BrandLogo.jsx'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="footer-main">
          <div>
            <BrandLogo />
            <p className="footer-description">Better spaces. Better campus days.</p>
            <p className="footer-detail">Find facilities, reserve a space, and help care for your campus.</p>
          </div>
          <nav aria-label="Footer navigation" className="footer-navigation">
            <p className="footer-heading">EXPLORE YOUR CAMPUS</p>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/facilities">Browse facilities <FiArrowUpRight aria-hidden="true" /></Link>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Revesrv. All rights reserved.</p>
          <p>Praktikum IF <span aria-hidden="true">·</span> Campus facility management</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
