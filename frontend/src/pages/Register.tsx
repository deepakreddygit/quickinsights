import React, { useState } from 'react'
import axios from 'axios'
import { api, setToken } from '../lib/api'
import { useNavigate, Link } from 'react-router-dom'

interface ErrorResponse { error?: string }

const Register: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      const { data } = await api.post<{ token: string }>('/auth/register', { email, password })
      setToken(data.token)
      nav('/dashboard')
    } catch (e: unknown) {
      let msg = 'Register failed'
      if (axios.isAxiosError(e)) {
        const body = e.response?.data as ErrorResponse | undefined
        if (body?.error) msg = body.error
      }
      setErr(msg)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-6 rounded-2xl shadow text-neutral-900 dark:text-neutral-900">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-xl p-3"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-xl p-3"
          placeholder="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700">
    Create account
    </button>

      </form>
      <p className="text-sm mt-3">
        Have an account?{' '}
        <Link to="/login" className="text-brand-700">Login</Link>
      </p>
    </div>
  )
}

export default Register


