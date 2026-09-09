import { Navigate, Route, Routes } from 'react-router-dom'
import Home from '@/pages/Home'
import AdminLayout from '@/layouts/AdminLayout'
import AdminDashboard from '@/features/dashboard/pages/AdminDashboardPage'
import AdminCitas from '@/features/citas/pages/AdminCitasPage'
import AdminNotificaciones from '@/features/notificaciones/pages/AdminNotificacionesPage'
import AdminOrders from '@/features/ordenes/pages/AdminOrdersPage'
import AdminSearch from '@/features/search/pages/AdminSearchPage'
import AdminServicios from '@/features/servicios/pages/AdminServiciosPage'
import AdminUsers from '@/features/usuarios/pages/AdminUsersPage'
import AdminUsuariosRedirect from '@/features/usuarios/pages/AdminUsuariosRedirect'
import AdminVehiculos from '@/features/vehiculos/pages/AdminVehiculosPage'
import Citas from '@/features/citas/pages/CitasPage'
import ForgotPassword from '@/features/auth/pages/ForgotPasswordPage'
import LoginRedirect from '@/features/auth/pages/LoginRedirect'
import MisCitas from '@/features/citas/pages/MisCitasPage'
import MisRecibos from '@/features/recibos/pages/MisRecibosPage'
import Notificaciones from '@/features/notificaciones/pages/NotificacionesPage'
import Profile from '@/features/usuarios/pages/ProfilePage'
import Register from '@/features/auth/pages/RegisterPage'
import ResetPassword from '@/features/auth/pages/ResetPasswordPage'
import SignIn from '@/features/auth/pages/SignInPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginRedirect />} />
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
        <Route path="usuarios" element={<AdminUsuariosRedirect />} />
        <Route path="vehiculos" element={<AdminVehiculos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
