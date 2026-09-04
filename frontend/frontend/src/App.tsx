import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import SiteShell from './components/site-shell'
import Home from './pages/Home'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/dashboard'
import AdminCitas from './pages/admin/citas'
import AdminNotificaciones from './pages/admin/notificaciones'
import AdminOrders from './pages/admin/orders'
import AdminSearch from './pages/admin/search'
import AdminServicios from './pages/admin/servicios'
import AdminUsers from './pages/admin/users'
import AdminVehiculos from './pages/admin/vehiculos'
import Citas from './pages/citas'
import ForgotPassword from './pages/forgot-password'
import MisCitas from './pages/mis-citas'
import MisRecibos from './pages/mis-recibos'
import Notificaciones from './pages/notificaciones'
import Profile from './pages/profile'
import Register from './pages/register'
import ResetPassword from './pages/reset-password'
import SignIn from './pages/sign-in'

export default function App() {
  return (
    <BrowserRouter>
      <SiteShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/mis-citas" element={<MisCitas />} />
          <Route path="/mis-recibos" element={<MisRecibos />} />
          <Route path="/notificaciones" element={<Notificaciones />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="citas" element={<AdminCitas />} />
            <Route path="notificaciones" element={<AdminNotificaciones />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="search" element={<AdminSearch />} />
            <Route path="servicios" element={<AdminServicios />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="vehiculos" element={<AdminVehiculos />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SiteShell>
    </BrowserRouter>
  )
}
