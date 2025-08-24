// import axios from 'axios'
// const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'
// export const api = axios.create({ baseURL: base })

// export function setToken(t?: string) {
//   if (t) localStorage.setItem('token', t)
//   else localStorage.removeItem('token')

//   const token = localStorage.getItem('token')
//   if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
//   else delete api.defaults.headers.common['Authorization']

//   window.dispatchEvent(new Event('token-changed'))
// }

// export function initAuthFromStorage() {
//   const token = localStorage.getItem('token')
//   if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
// }

// frontend/src/lib/api.ts
import axios from "axios"

/**
 * In development, leave baseURL empty so requests go to the Vite dev server
 * (http://localhost:5173) and get proxied to Flask. This avoids CORS entirely.
 * In production, point to your deployed API via VITE_API_URL.
 */
const baseURL = import.meta.env.DEV
  ? ""                                   // use Vite proxy in dev
  : (import.meta.env.VITE_API_URL ?? "") // absolute URL in prod, e.g. https://api.example.com

export const api = axios.create({
  baseURL,
  // If your API needs cookies, flip this to true and configure CORS accordingly on the backend.
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

export function setToken(t?: string) {
  if (t) localStorage.setItem("token", t)
  else localStorage.removeItem("token")

  const token = localStorage.getItem("token")
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common["Authorization"]
  }

  // let the app react (e.g., show/hide auth-only UI)
  window.dispatchEvent(new Event("token-changed"))
}

export function initAuthFromStorage() {
  const token = localStorage.getItem("token")
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`
}
