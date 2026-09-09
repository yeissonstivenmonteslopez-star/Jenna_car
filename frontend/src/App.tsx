import { BrowserRouter } from 'react-router-dom'
import SiteShell from './components/site-shell'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <SiteShell>
        <AppRoutes />
      </SiteShell>
    </BrowserRouter>
  )
}
