// src/App.tsx
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

function useAuthToken() {
  const [token, setTokenState] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  )
  useEffect(() => {
    const handler = () => setTokenState(localStorage.getItem('token'))
    window.addEventListener('token-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('token-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])
  return token
}

export default function App() {
  const nav = useNavigate()
  const token = useAuthToken()
  const authed = !!token

  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()

  // close mobile menu on route/hash change
  useEffect(() => setOpen(false), [pathname, hash])

  const logout = () => {
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('token-changed'))
    nav('/login')
  }

  const linkBase =
    'px-3 py-1.5 rounded-xl border border-transparent text-sm hover:bg-neutral-100'
  const linkActive = 'bg-neutral-100 text-neutral-900'
  const linkInactive = 'text-neutral-700'

  // --- Insights dropdown that closes on click outside / selection ---
  const [insightsOpen, setInsightsOpen] = useState(false)
  const ddRef = useRef<HTMLDetailsElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ddRef.current) return
      if (e.target instanceof Node && !ddRef.current.contains(e.target)) {
        setInsightsOpen(false)
        ddRef.current.open = false
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // close dropdown when route/hash changes
  useEffect(() => {
    if (ddRef.current) ddRef.current.open = false
    setInsightsOpen(false)
  }, [pathname, hash])

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* ---------- Top Bar ---------- */}
      <header className="border-b bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Brand + mobile burger */}
            <div className="flex items-center gap-3">
              {authed && (
                <button
                  className="lg:hidden inline-flex items-center justify-center rounded-xl border px-2.5 py-1 text-sm"
                  onClick={() => setOpen((s) => !s)}
                  aria-label="Toggle menu"
                >
                  ☰
                </button>
              )}
              <Link to={authed ? '/dashboard' : '/login'} className="font-semibold">
                QuickInsights Copilot
              </Link>
            </div>

            {/* Desktop nav — only when authed */}
            {authed && (
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink
                  to="/dashboard#brush"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                  title="Zoom/Brush + Filters"
                >
                  Explore
                </NavLink>

                <details
                  ref={ddRef}
                  className="relative group"
                  open={insightsOpen}
                  onToggle={(e) =>
                    setInsightsOpen((e.target as HTMLDetailsElement).open)
                  }
                >
                  <summary
                    className={`${linkBase} ${linkInactive} list-none cursor-pointer select-none`}
                    role="button"
                    aria-haspopup="true"
                    aria-expanded={insightsOpen}
                  >
                    Insights ▾
                  </summary>
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg p-1"
                    role="menu"
                  >
                    <MenuItem
                      to="/dashboard#correlation"
                      label="Correlation map"
                      onSelect={() => {
                        setInsightsOpen(false)
                        if (ddRef.current) ddRef.current.open = false
                      }}
                    />
                    <MenuItem
                      to="/dashboard#narrative"
                      label="AI narrative"
                      onSelect={() => {
                        setInsightsOpen(false)
                        if (ddRef.current) ddRef.current.open = false
                      }}
                    />
                    <MenuItem
                      to="/dashboard#anomalies"
                      label="Anomaly detection"
                      onSelect={() => {
                        setInsightsOpen(false)
                        if (ddRef.current) ddRef.current.open = false
                      }}
                    />
                  </div>
                </details>

                <NavLink
                  to="/dashboard#upload"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                  title="Jump to upload card"
                >
                  Upload
                </NavLink>

                <NavLink
                  to="/help"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkInactive}`
                  }
                >
                  Help
                </NavLink>
              </nav>
            )}

            {/* Auth buttons */}
            <div className="flex items-center gap-2">
              {authed ? (
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50"
                >
                  Logout
                </button>
              ) : (
                <div className="hidden lg:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile drawer — only when authed */}
          {authed && open && (
            <div className="lg:hidden mt-2 border-t pt-2 flex flex-col gap-1">
              <MobileItem to="/dashboard#brush" label="Explore" />
              <div className="pl-1 text-xs uppercase tracking-wide text-neutral-500 mt-2">
                Insights
              </div>
              <MobileItem to="/dashboard#correlation" label="Correlation map" />
              <MobileItem to="/dashboard#narrative" label="AI narrative" />
              <MobileItem to="/dashboard#anomalies" label="Anomaly detection" />
              <MobileItem to="/dashboard#upload" label="Upload" />
              <MobileItem to="/help" label="Help" />
            </div>
          )}
        </div>
      </header>

      {/* ---------- Page Body ---------- */}
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}

/* ------------- small helpers for menu items -------------- */
function MenuItem({
  to,
  label,
  onSelect,
}: {
  to: string
  label: string
  onSelect?: () => void
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-lg text-sm ${
          isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100'
        }`
      }
      role="menuitem"
      onClick={onSelect}
    >
      {label}
    </NavLink>
  )
}

function MobileItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-xl text-sm ${
          isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
}
