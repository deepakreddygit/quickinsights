import { Navigate } from 'react-router-dom'

export default function StartRoute() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
}
