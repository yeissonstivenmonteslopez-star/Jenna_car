import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatCop(amount: number | string | null | undefined) {
  const parsed = Number(amount || 0)
  const value = Number.isFinite(parsed) ? parsed : 0
  return `COP $${value.toLocaleString('es-CO', { useGrouping: true, minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`
}
