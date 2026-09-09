import { Outlet, Link } from 'react-router-dom'

/**
 * AuthLayout — agrupa páginas de autenticación (sign-in, register, forgot-password, reset-password).
 *
 * Evaluación: Sí tiene sentido. Las páginas de auth comparten:
 * - Fondo oscuro (bg-primary / bg-[#090909])
 * - Panel hero a la izquierda (imagen jenna-car-hero.png + branding) en desktop
 * - Panel de formulario a la derecha con link "Volver al inicio" y copyright
 * Extraer este shell evita duplicar el hero, el manejo del script de Google
 * y los estilos de borde/tipografía en cada página.
 *
 * Uso futuro: envolver rutas /sign-in, /register, /forgot-password, /reset-password
 * con <Route element={<AuthLayout />}> y que cada página solo renderice el formulario.
 * Por ahora se provee como componente disponible sin romper el routing existente.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-primary text-primary-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Panel izquierdo — hero branding (solo desktop) */}
        <section className="relative hidden overflow-hidden lg:block">
          <img src="/jenna-car-hero.png" alt="Vehículo premium en Jenna Car" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/45 to-primary/20" />
          <div className="relative flex h-full flex-col justify-between p-16">
            <Link to="/" className="font-serif text-xl tracking-[0.18em]">
              JENNA <span className="text-accent">CAR</span>
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Área cliente</p>
              <h2 className="mt-4 font-serif text-6xl leading-none">Todo tu cuidado<br /><em className="text-accent">en un lugar.</em></h2>
            </div>
          </div>
        </section>

        {/* Panel derecho — contenido de la página (formulario) */}
        <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
          <Link to="/" className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/55 hover:text-primary-foreground">
            ← Volver al inicio
          </Link>
          <div className="flex flex-1 items-center">
            <div className="w-full">
              <Outlet />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-primary-foreground/30">© 2026 Jenna Car Studio</p>
        </section>
      </div>
    </div>
  )
}
