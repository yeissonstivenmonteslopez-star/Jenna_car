import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatCop(amount: number | string | null | undefined) {
  return `COP $${Number(amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}
