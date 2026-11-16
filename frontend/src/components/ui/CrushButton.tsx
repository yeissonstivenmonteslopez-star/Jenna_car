import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CrushButtonProps = {
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'submit' | 'button' | 'reset'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
}

export default function CrushButton({
  children = 'Iniciar Sesión', onClick, type = 'submit', disabled = false,
  loading = false, fullWidth = true, className = '',
}: CrushButtonProps) {
  return <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    aria-busy={loading}
    className={cn('btn-crush flex h-[50px] cursor-pointer items-center justify-center border border-zinc-800 bg-black px-6 text-[17px] font-bold tracking-wide text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600', fullWidth ? 'w-full' : 'min-w-[180px]', className)}
  >
    <span aria-live="polite">{loading ? 'Ingresando...' : children}</span>
  </button>
}
