import type { ReactNode } from 'react'
import { CheckCircle2, CircleX, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shortError } from '@/lib/feedback'

export type FeedbackType = 'error' | 'success' | 'warning'

export default function KeycapAlert({ type = 'error', title, message, onClose, className = '' }: {
  type?: FeedbackType; title?: string; message: ReactNode; onClose?: () => void; className?: string
}) {
  const Icon = type === 'success' ? CheckCircle2 : type === 'warning' ? TriangleAlert : CircleX
  const content = type === 'error' && typeof message === 'string' ? shortError(message) : message
  return <div role="alert" aria-live="polite" aria-atomic="true" className={cn('alert-keycap', `alert-keycap--${type}`, className)}>
    <div className="alert-keycap-face">
      <Icon className="alert-keycap-icon" size={21} aria-hidden="true" />
      <div className="alert-keycap-content">{type !== 'error' && title && <strong className="alert-keycap-title">{title}</strong>}{content}</div>
      {onClose && <button type="button" className="alert-keycap-close" onClick={onClose} aria-label="Cerrar mensaje"><X size={18} aria-hidden="true" /></button>}
    </div>
  </div>
}
