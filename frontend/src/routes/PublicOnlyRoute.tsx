import { JSX } from 'react'
import { Navigate } from 'react-router-dom'

export default function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) return <Navigate to="/dashboard" replace />
  return children
}
