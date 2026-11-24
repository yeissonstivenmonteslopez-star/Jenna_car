import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CarFront, Check, X } from 'lucide-react'
import './customer-onboarding.css'

type Step = {
  target: string
  path: string
  title: string
  detail: string
  clickAdvances?: boolean
}

const customerSteps: Step[] = [
  { target: 'schedule', path: '/citas', title: 'Agenda tu visita', detail: 'Elige tu vehículo, el servicio y el horario que mejor te funcione.' },
  { target: 'appointments', path: '/mis-citas', title: 'Consulta tus citas', detail: 'Aquí puedes revisar la fecha, hora y estado de cada reserva.' },
  { target: 'repairs', path: '/mis-reparaciones', title: 'Sigue tu vehículo', detail: 'Revisa diagnósticos, avances y aprueba una cotización cuando sea necesario.' },
  { target: 'receipts', path: '/mis-recibos', title: 'Gestiona tus recibos', detail: 'Consulta cobros pendientes, comprobantes y pagos realizados.' },
  { target: 'profile', path: '/profile', title: 'Mantén tu perfil al día', detail: 'Actualiza tus datos y agrega la información que el taller necesita.' },
]

const mechanicSteps: Step[] = [
  { target: 'workshop', path: '/mechanic', title: 'Tu panel de taller', detail: 'Este es tu espacio de trabajo. Desde aquí atiendes únicamente las citas que administración te asignó.' },
  { target: 'mechanic-agenda', path: '/mechanic', title: 'Selecciona una cita asignada', detail: 'Busca por cliente, placa o servicio. Abre una cita para consultar el vehículo, el motivo de ingreso y la información del cliente.', clickAdvances: false },
  { target: 'mechanic-detail', path: '/mechanic', title: 'Registra el diagnóstico', detail: 'Después de revisar el vehículo, escribe el diagnóstico, las observaciones y la solución recomendada. El diagnóstico debe guardarse antes de agregar trabajos.', clickAdvances: false },
  { target: 'mechanic-detail', path: '/mechanic', title: 'Actualiza el trabajo realizado', detail: 'Con una orden activa puedes seleccionar el servicio, describir el trabajo, registrar cantidad y valor, y publicar avances con fotografías para el cliente.', clickAdvances: false },
  { target: 'profile', path: '/profile', title: 'Actualiza tu perfil', detail: 'Mantén tus datos personales al día para el equipo de Jenna Car.' },
  { target: 'notifications', path: '/notificaciones', title: 'Revisa tus notificaciones', detail: 'Consulta los avisos del taller y marca como leídos los que ya atendiste.' },
]

const adminSteps: Step[] = [
  { target: 'dashboard', path: '/admin/dashboard', title: 'Consulta el resumen del taller', detail: 'Revisa citas del día, actividad reciente y datos principales antes de iniciar la operación.' },
  { target: 'admin-appointments', path: '/admin/citas', title: 'Organiza la agenda', detail: 'Confirma o cancela reservas, cambia fechas cuando sea necesario y asigna el mecánico responsable.' },
  { target: 'admin-orders', path: '/admin/orders', title: 'Controla las órdenes', detail: 'Crea la orden del vehículo, agrega servicios, revisa la aprobación del cliente y envía el recibo.' },
  { target: 'admin-services', path: '/admin/servicios', title: 'Mantén el catálogo', detail: 'Crea y actualiza los servicios, sus precios, duración estimada y disponibilidad para las reservas.' },
  { target: 'admin-vehicles', path: '/admin/vehiculos', title: 'Consulta los vehículos', detail: 'Revisa los vehículos registrados y verifica a qué cliente pertenece cada uno.' },
  { target: 'admin-users', path: '/admin/users', title: 'Administra las cuentas', detail: 'Consulta clientes y mecánicos, revisa sus datos y controla el estado de acceso de cada cuenta.' },
  { target: 'admin-search', path: '/admin/search', title: 'Encuentra información rápidamente', detail: 'Usa la búsqueda para localizar clientes, vehículos y registros sin recorrer cada módulo.' },
  { target: 'admin-notifications', path: '/admin/notificaciones', title: 'Supervisa las notificaciones', detail: 'Consulta los avisos enviados por el sistema y comprueba comunicaciones importantes del taller.' },
]

function stepsFor(role?: string) {
  if (role === 'mecanico') return mechanicSteps
  if (role === 'admin') return adminSteps
  return customerSteps
}

type Rect = { top: number; left: number; width: number; height: number }

export default function CustomerOnboarding({ userId, role }: { userId?: number; role?: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const steps = stepsFor(role)
  const guideVersion = role === 'usuario' ? 'v1' : 'v2'
  const storageKey = `jenna_car_onboarding_${guideVersion}_${role || 'usuario'}_${userId || 'current'}`
  const started = useRef(false)
  const [step, setStep] = useState<number | null>(null)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (localStorage.getItem(storageKey)) return
    setStep(0)
    navigate(steps[0].path, { replace: true })
  }, [navigate, storageKey])

  useLayoutEffect(() => {
    if (step === null || pathname !== steps[step].path) return
    let activeTarget: HTMLElement | null = null
    const advanceFromTarget = (event: Event) => {
      event.preventDefault()
      next()
    }
    const updateTarget = () => {
      const element = document.querySelector<HTMLElement>(`[data-onboarding="${steps[step].target}"]`)
      if (!element) return
      if (element !== activeTarget && steps[step].clickAdvances !== false) {
        activeTarget?.removeEventListener('click', advanceFromTarget)
        element.addEventListener('click', advanceFromTarget)
        activeTarget = element
      }
      element.scrollIntoView({ block: 'nearest', inline: 'center' })
      const rect = element.getBoundingClientRect()
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }
    const frame = window.requestAnimationFrame(updateTarget)
    const observer = new MutationObserver(updateTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', updateTarget)
    return () => {
      window.cancelAnimationFrame(frame)
      activeTarget?.removeEventListener('click', advanceFromTarget)
      observer.disconnect()
      window.removeEventListener('resize', updateTarget)
    }
  }, [pathname, step])

  if (step === null) return null
  const currentStep = step
  const current = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  function finish() {
    localStorage.setItem(storageKey, 'true')
    setStep(null)
  }

  function next() {
    if (isLast) return finish()
    const nextStep = currentStep + 1
    setTargetRect(null)
    setStep(nextStep)
    navigate(steps[nextStep].path)
  }

  return (
    <div className="customer-onboarding" aria-live="polite">
      {targetRect && <div className="customer-onboarding__spotlight" aria-hidden="true" style={{ top: targetRect.top - 6, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 12 }} />}
      <section className="customer-onboarding__panel" role="dialog" aria-label={`Guía de Jenna Car, paso ${currentStep + 1} de ${steps.length}`}>
        <button type="button" className="customer-onboarding__close" onClick={finish} aria-label="Omitir guía"><X size={17} /></button>
        <div className="customer-onboarding__heading">
          <span className="customer-onboarding__car" aria-hidden="true"><CarFront size={19} /></span>
          <p className="customer-onboarding__count">PRIMEROS PASOS · {currentStep + 1}/{steps.length}</p>
        </div>
        <h2>{current.title}</h2>
        <p>{current.detail}</p>
        <div className="customer-onboarding__actions">
          <button type="button" onClick={finish}>Omitir</button>
          <button type="button" onClick={next} className="customer-onboarding__next">
            {isLast ? <><Check size={16} /> Entendido</> : <>Siguiente <ArrowRight size={16} /></>}
          </button>
        </div>
      </section>
    </div>
  )
}
