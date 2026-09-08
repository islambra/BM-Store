import { Link } from 'react-router-dom'
import logo from '../../assets/logo.jpg'

export default function Logo({
  showName = false,
  className = '',
}: {
  showName?: boolean
  className?: string
}) {
  return (
    <Link to="/" className={`inline-flex shrink-0 items-center gap-2.5 ${className}`} aria-label="BM Store">
      <img src={logo} alt="BM Store logo" className="h-9 w-auto object-contain sm:h-10" />
      {showName && (
        <span className="font-display text-xl font-extrabold tracking-tight text-ink-900">
          BM Store
        </span>
      )}
    </Link>
  )
}