import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BackLink() {
  return <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-white/70"><ArrowLeft size={16} />Volver al inicio</Link>
}
