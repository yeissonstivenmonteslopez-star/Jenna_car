import BackLink from '@/components/BackLink'

import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { BadgeCheck, CalendarDays, Camera, Mail, Phone, ReceiptText, ShieldCheck, CarFront, Wrench, ArrowUpRight, Plus } from 'lucide-react'
import { getMisCitas } from '@/features/citas/services/citasService'
import { getVehiculos } from '@/features/vehiculos/services/vehiculosService'
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

type ProfileVehicle = { id: number; marca: string; modelo: string; placa: string; anio?: number; color?: string; estado?: string }
type ProfileAppointment = { id: number; fecha: string; hora: string; estado: string; vehiculo: ProfileVehicle; servicio: { name?: string; nombre?: string } }

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<'actividad' | 'datos'>('actividad')
  const [vehicles, setVehicles] = useState<ProfileVehicle[]>([])
  const [appointments, setAppointments] = useState<ProfileAppointment[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [vehicleError, setVehicleError] = useState('')
  const [appointmentError, setAppointmentError] = useState('')
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
  }, [token])

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.allSettled([getVehiculos(token), getMisCitas(token)]).then(([cars, visits]) => {
      if (!active) return
      if (cars.status === 'fulfilled') setVehicles(cars.value.data || [])
      else setVehicleError('No fue posible cargar tus vehículos. Intenta de nuevo más tarde.')
      if (visits.status === 'fulfilled') setAppointments(visits.value.data || [])
      else setAppointmentError('No fue posible cargar tus citas. Puedes consultarlas en Mis citas.')
      setActivityLoading(false)
    })
    return () => { active = false }
  }, [token])

  function applyUser(updated: User) {
    setUser(updated)
    try { localStorage.setItem('jenna_car_user', JSON.stringify(updated)) } catch { /* Saved on the server; local caching is optional. */ }
    window.dispatchEvent(new CustomEvent('jenna-profile-updated', { detail: updated }))
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !token || saving || uploading) return
    const input = event.currentTarget

    if (file.size > 5 * 1024 * 1024) {
      setMessage('La imagen debe pesar menos de 5MB.')
      input.value = ''
      return
    }

    setUploading(true)
    setMessage('')
    try {
      const data = await uploadFotoPerfil(file, token)
      applyUser(data.user)
      setMessage('Foto actualizada correctamente.')
      input.value = ''
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible subir la imagen.')
    } finally { setUploading(false); input.value = '' }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || uploading) return
    const formData = new FormData(event.currentTarget)
    const telefono = String(formData.get('telefono') || '').trim()
    if (!/^\d{10}$/.test(telefono)) {
      setMessage('El teléfono debe tener exactamente 10 números.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const data = await updatePerfil(formData, token)
      applyUser(data.user)
      setMessage('Perfil actualizado correctamente.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al actualizar el perfil.')
    } finally { setSaving(false) }
  }

  if (!user) return <main className="min-h-screen bg-primary p-12 text-primary-foreground">Cargando perfil...</main>

  const avatar = buildAssetUrl(user.foto_perfil)

  const recent = [...appointments].sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)).slice(0, 4)
  const pending = appointments.filter((item) => ['pendiente', 'confirmada'].includes(item.estado)).length
  const roleLabel = user.rol === 'admin' ? 'Administrador' : user.rol === 'mecanico' ? 'Mecánico' : 'Cliente Jenna Car'

  return <main className="profile-social">
    <div className="profile-container">
      <BackLink />
      <section className="profile-identity" aria-label="Mi perfil">
        <div className="profile-identity-body">
          <div className="profile-avatar-wrap">
            {avatar ? <img src={avatar} alt={`Foto de ${user.nombre}`} className="profile-avatar" /> : <span className="profile-avatar profile-initial">{user.nombre.charAt(0).toUpperCase()}</span>}
            <label className="profile-camera" title="Cambiar foto de perfil"><input disabled={saving || uploading} type="file" aria-label="Cambiar foto de perfil" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={upload} /><Camera size={17} /></label>{uploading && <span role="status" className="profile-photo-status">Guardando foto…</span>}
          </div>
          <div className="profile-name"><h1>{user.nombre} {user.apellido}</h1><p><BadgeCheck size={15} /> {roleLabel}</p></div>
          {tab === 'actividad' && <button type="button" className="profile-outline" onClick={() => setTab('datos')}>Editar perfil <ArrowUpRight size={15} /></button>}
        </div>
        <div className="profile-summary" aria-label="Resumen de mi cuenta">
          <div><strong>{activityLoading || vehicleError ? '—' : vehicles.length}</strong><span>Vehículos</span></div>
          <div><strong>{activityLoading || appointmentError ? '—' : appointments.length}</strong><span>Citas registradas</span></div>
          <div><strong>{activityLoading || appointmentError ? '—' : pending}</strong><span>Citas activas</span></div>
        </div>

      </section>
      {message && <p role="status" className="profile-notice">{message}</p>}
      <div className="profile-columns">
        <aside className="profile-side">
          <section className="profile-panel"><h2>Sobre mí</h2><p className="profile-muted">Tu información de contacto con el taller.</p><p className="profile-contact"><Mail size={16} /><span>{user.email}</span></p><p className="profile-contact"><Phone size={16} /><span>{user.telefono || 'Agrega tu teléfono en Datos personales'}</span></p></section>
          <section className="profile-panel"><h2>Mi taller, a un clic</h2><div className="profile-shortcuts"><a href="/mis-reparaciones"><Wrench size={17} /> Seguir reparaciones <ArrowUpRight size={14} /></a><a href="/mis-recibos"><ReceiptText size={17} /> Recibos y pagos <ArrowUpRight size={14} /></a>{user.rol === 'admin' && <a href="/admin/dashboard"><ShieldCheck size={17} /> Administración <ArrowUpRight size={14} /></a>}{user.rol === 'mecanico' && <a href="/mechanic"><Wrench size={17} /> Panel mecánico <ArrowUpRight size={14} /></a>}</div></section>
        </aside>
        <div className="profile-feed">
          {tab === 'datos' ? <section className="profile-panel"><button type="button" className="profile-text-link" onClick={() => setTab('actividad')}>← Volver a mi perfil</button><p className="profile-eyebrow">INFORMACIÓN PERSONAL</p><h2>Tu perfil</h2><p className="profile-muted">Actualiza tus datos para mantenerte en contacto con el taller.</p>
            <form key={`${user.nombre}-${user.apellido}-${user.telefono}`} onSubmit={updateProfile} className="mt-8 grid gap-5" aria-busy={saving}><fieldset disabled={saving || uploading} className="contents">
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
                <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(220,38,38,0.28)] transition hover:bg-red-500"><BadgeCheck size={15} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </fieldset></form>
          </section> : <>
            {tab === 'actividad' && <section className="profile-panel"><div className="profile-section-heading"><div><p className="profile-eyebrow">TU AGENDA</p><h2>Citas y actividad reciente</h2></div><a href="/citas" className="profile-primary"><Plus size={15} /> Agendar cita</a></div>
              {activityLoading ? <p role="status" className="profile-empty">Cargando tus citas…</p> : appointmentError ? <p role="alert" className="profile-empty">{appointmentError}</p> : recent.length ? <div className="profile-activity">{recent.map((item) => <article key={item.id}><div className="profile-activity-icon"><CalendarDays size={19} /></div><div className="profile-activity-content"><span className="profile-status">{item.estado}</span><h3>{item.servicio?.name || item.servicio?.nombre || 'Cita de servicio'}</h3><p>{item.vehiculo?.marca} {item.vehiculo?.modelo} · {item.vehiculo?.placa}</p><time dateTime={`${item.fecha}T${item.hora}`}>{new Date(`${item.fecha}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} · {item.hora.slice(0, 5)}</time></div></article>)}</div> : <div className="profile-empty"><CalendarDays size={28} /><h3>Tu próxima visita empieza aquí</h3><p>Aún no tienes citas registradas. Cuando agendes, aparecerán en tu perfil.</p></div>}
              <a href="/mis-citas" className="profile-text-link">Ver todas mis citas →</a>
            </section>}
            <section className="profile-panel"><div className="profile-section-heading"><div><p className="profile-eyebrow">MI GARAJE</p><h2>Mis vehículos</h2></div></div>
              {activityLoading ? <p role="status" className="profile-empty">Cargando tus vehículos…</p> : vehicleError ? <p role="alert" className="profile-empty">{vehicleError}</p> : vehicles.length ? <div className="profile-garage">{vehicles.map((vehicle) => <article key={vehicle.id} className="profile-vehicle"><div className="profile-vehicle-art"><CarFront size={52} strokeWidth={1.1} /><span>{vehicle.placa}</span></div><h3>{vehicle.marca} {vehicle.modelo}</h3><p>{[vehicle.anio, vehicle.color].filter(Boolean).join(' · ') || 'Vehículo registrado'}{vehicle.estado ? ` · ${vehicle.estado.replace('_', ' ')}` : ''}</p></article>)}</div> : <div className="profile-empty"><CarFront size={30} /><h3>Un espacio para tus vehículos</h3><p>Registra tu vehículo al agendar tu primera cita.</p></div>}

            </section>
          </>}
        </div>
      </div>
    </div>
  </main>
}
