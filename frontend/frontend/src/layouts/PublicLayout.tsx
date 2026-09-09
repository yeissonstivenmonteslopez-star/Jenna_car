import { Outlet, Link } from 'react-router-dom'

/**
 * PublicLayout — agrupa header/footer para páginas públicas
 * (Home, Citas, Mis-citas, Mis-recibos, Notificaciones, Profile).
 *
 * Evaluación: Sí tiene sentido. Antes cada página pública repetía
 * el header con logo/nav y el footer de contacto. Este layout centraliza:
 * - Header con navegación principal (Servicios, Nosotros, Contacto)
 * - Footer común (dirección, teléfonos, copyright)
 * Así se reduce duplicación y se facilita cambios de branding.
 *
 * Nota: SiteShell se mantiene para lógica de autenticación (NotificationBell,
 * menú de usuario). PublicLayout puede componerse dentro de SiteShell o
 * reemplazarlo progresivamente si se migra toda la navegación aquí.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" className="font-serif text-xl tracking-[0.18em]">
            JENNA <span className="text-accent">CAR</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70 md:flex">
            <a href="/#servicios" className="transition hover:text-primary-foreground">Servicios</a>
            <a href="/#nosotros" className="transition hover:text-primary-foreground">Nosotros</a>
            <a href="/#contacto" className="transition hover:text-primary-foreground">Contacto</a>
          </nav>
          <Link to="/sign-in" className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-foreground/70 hover:text-accent">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-secondary px-6 py-8 lg:px-10 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <span className="font-serif tracking-[0.18em] text-secondary-foreground">JENNA <span className="text-accent">CAR</span></span>
          <span className="text-[10px] uppercase tracking-[0.15em]">© 2026 Jenna Car Studio · Bogotá</span>
        </div>
      </footer>
    </div>
  )
}
