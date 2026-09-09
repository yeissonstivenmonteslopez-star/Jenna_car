
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ArrowLeft, BadgeCheck, CalendarDays, Camera, Mail, Phone, ReceiptText, ShieldCheck, UserRound } from 'lucide-react'
import { buildAssetUrl } from '@/services/apiClient'
import { getPerfil, updatePerfil, uploadFotoPerfil } from '@/features/usuarios/services/usuariosService'

type User = {
  id: number
  nombre: string
  apellido: string
  email: string
  telefono?: string
  foto_perfil?: string
  rol?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('jenna_car_token') || '' : ''))

  useEffect(() => {
    if (!token) {
      window.location.href = '/sign-in'
      return
    }

    getPerfil(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('jenna_car_token')
        window.location.href = '/sign-in'
      })
  }, [])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !token) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage('La imagen debe pesar menos de 5MB.')
      event.target.value = ''
      return
    }

    try {
      const data = await uploadFotoPerfil(file, token)
      setUser(data.user)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      setMessage('Foto actualizada correctamente.')
      event.target.value = ''
    } catch {
      setMessage('No fue posible subir la imagen.')
      event.target.value = ''
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const telefono = String(formData.get('telefono') || '').trim()
    if (!/^\d{10}$/.test(telefono)) {
      setMessage('El teléfono debe tener exactamente 10 números.')
      return
    }
    try {
      const data = await updatePerfil(formData, token)
      setUser(data.user)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      setMessage('Perfil actualizado correctamente.')
    } catch {
      setMessage('Error al actualizar el perfil.')
    }
  }

  if (!user) return <main className="min-h-screen bg-primary p-12 text-primary-foreground">Cargando perfil...</main>

  const avatar = buildAssetUrl(user.foto_perfil)

  return (
    <main
      className="min-h-screen bg-[#0b0b0b] px-4 py-8 text-white sm:px-6 sm:py-12"
      style={{ backgroundImage: 'radial-gradient(circle at top, rgba(239, 68, 68, 0.12), transparent 32%), linear-gradient(180deg, #0b0b0b 0%, #111111 100%)' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white">
            <ArrowLeft size={14} /> Inicio
          </a>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">Jenna Car Studio</span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-[28px] border border-red-500/20 bg-[#141414]/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400">Cuenta Jenna Car</p>
            <div className="mt-7 flex flex-col items-center text-center">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="Foto de perfil" className="h-28 w-28 rounded-full border-2 border-red-500/40 object-cover shadow-[0_0_0_7px_rgba(239,68,68,0.08)]" />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-800 text-4xl font-semibold text-white shadow-[0_0_0_7px_rgba(239,68,68,0.08)]">
                    {user.nombre.charAt(0).toUpperCase()}
                  </span>
                )}
                <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-red-300/40 bg-red-600 text-white shadow-lg transition hover:bg-red-500" title="Cambiar foto">
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
                  <Camera size={15} />
                </label>
              </div>
              <h1 className="mt-6 font-serif text-3xl text-white">{user.nombre} {user.apellido}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-white/55"><Mail size={14} className="text-red-400" /> {user.email}</p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                <BadgeCheck size={14} className="text-red-400" /> {user.rol === 'admin' ? 'Administrador' : 'Cliente verificado'}
              </span>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Accesos rápidos</p>
              <div className="grid gap-2">
                <a href="/mis-citas" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white"><span className="flex items-center gap-3"><CalendarDays size={16} className="text-red-400" /> Mis citas</span><span className="text-red-400">→</span></a>
                <a href="/mis-recibos" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white"><span className="flex items-center gap-3"><ReceiptText size={16} className="text-red-400" /> Recibos y pagos</span><span className="text-red-400">→</span></a>
                {user.rol === 'admin' && <a href="/admin/dashboard" className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100 transition hover:bg-red-500/20"><span className="flex items-center gap-3"><ShieldCheck size={16} className="text-red-400" /> Panel administrativo</span><span className="text-red-300">→</span></a>}
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-red-500/20 bg-[#141414]/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400"><UserRound size={21} /></div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400">Información personal</p>
                <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Tu perfil</h2>
                <p className="mt-2 text-sm text-white/55">Mantén tus datos de contacto actualizados para una atención más ágil.</p>
              </div>
            </div>

            <form onSubmit={updateProfile} className="mt-8 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Nombre
                  <input type="text" name="nombre" defaultValue={user.nombre} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3.5 text-sm font-normal normal-case tracking-normal text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/15" />
                </label>
                <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Apellido
                  <input type="text" name="apellido" defaultValue={user.apellido} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3.5 text-sm font-normal normal-case tracking-normal text-white outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/15" />
                </label>
              </div>

              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Correo electrónico
                <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-normal normal-case tracking-normal text-white/60"><Mail size={16} className="text-red-400" /> {user.email}</span>
              </label>

              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Teléfono
                <span className="relative"><Phone size={16} className="pointer-events-none absolute left-4 top-3.5 text-red-400" /><input required type="tel" name="telefono" defaultValue={user.telefono || ''} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10 números" title="Ingresa exactamente 10 números" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10) }} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] py-3.5 pl-11 pr-4 text-sm font-normal normal-case tracking-normal text-white placeholder:text-white/30 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/15" /></span>
              </label>

              <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/45">Tu información está protegida y solo se usa para gestionar tu servicio.</p>
                <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(220,38,38,0.28)] transition hover:bg-red-500"><BadgeCheck size={15} /> Guardar cambios</button>
              </div>
            </form>

            {message && <p className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{message}</p>}
          </section>
        </div>
      </div>
    </main>
  )
}
