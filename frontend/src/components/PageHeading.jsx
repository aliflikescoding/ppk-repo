export default function PageHeading({ children, eyebrow = 'CAMPUS MANAGEMENT' }) {
  return (
    <div className="workspace-heading">
      <p className="auth-eyebrow">{eyebrow}</p>
      <h1>{children}</h1>
    </div>
  )
}
