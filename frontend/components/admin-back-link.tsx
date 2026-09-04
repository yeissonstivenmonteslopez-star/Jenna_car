import { ArrowLeft } from 'lucide-react'

export default function AdminBackLink() {
  return (
    <a
      href="/admin/dashboard"
      className="inline-flex items-center gap-2 rounded-full border border-[#f87171]/50 bg-[#f87171]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f87171] transition hover:border-[#f87171] hover:bg-[#f87171]/20"
    >
      <ArrowLeft size={14} />
      Volver al panel
    </a>
  )
}