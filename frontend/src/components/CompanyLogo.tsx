import { cn } from '@/lib/utils'
import './company-logo.css'

export default function CompanyLogo({ variant = 'auto', className = '' }: {
  variant?: 'auto' | 'dark' | 'light'; className?: string
}) {
  return <span className={cn('company-logo', className)} data-variant={variant}>
    {variant !== 'light' && <img src="/brand/logo-white-red.png" className="logo-on-dark" alt="Jena Car Services" width={639} height={507} />}
    {variant !== 'dark' && <img src="/brand/logo-black.png" className="logo-on-light" alt="Jena Car Services" width={664} height={526} />}
  </span>
}
