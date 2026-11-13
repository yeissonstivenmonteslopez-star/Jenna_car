import { lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import SiteShell from './components/site-shell'
import Loader from './components/Loader'
import NavigationRefresh from './components/NavigationRefresh'

const AppRoutes = lazy(() => import('./routes/AppRoutes'))

export default function App() {
  return (
    <BrowserRouter>
      <NavigationRefresh />
      <SiteShell>
        <Suspense fallback={<Loader text="Cargando JENNACAR…" />}>
          <AppRoutes />
        </Suspense>
      </SiteShell>
    </BrowserRouter>
  )
}
