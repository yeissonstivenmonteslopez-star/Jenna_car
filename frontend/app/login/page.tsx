import { redirect } from 'next/navigation'

export default function LoginPage() {
  redirect('/sign-in?message=Debes%20iniciar%20sesión%20para%20agendar%20una%20cita.')
}
