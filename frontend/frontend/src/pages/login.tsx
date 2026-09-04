import { redirect } from 'react-router-dom'

export default function LoginPage() {
  redirect('/sign-in?message=Debes%20iniciar%20sesión%20para%20agendar%20una%20cita.')
}
