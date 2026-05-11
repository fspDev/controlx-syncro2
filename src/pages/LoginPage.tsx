import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Lock, User, Sun, Moon, Monitor } from 'lucide-react'

const THEME_OPTS = [
  { value: 'dark' as const,   icon: Moon,    label: 'Oscuro' },
  { value: 'light' as const,  icon: Sun,     label: 'Claro' },
  { value: 'system' as const, icon: Monitor, label: 'Sistema' },
]

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, currentUser, theme, setTheme } = useAppStore()

  if (currentUser) return <Navigate to="/dashboard" replace />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const ok = login(username.trim(), password)
    if (!ok) setError('Usuario o contraseña incorrectos')
  }

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Theme toggle — top right */}
      <div className="fixed top-4 right-4 flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
        {THEME_OPTS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-all cursor-pointer ${
              theme === value
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)]'
            }`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {(() => {
            const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            return <img src={isDark ? '/logo1.png' : '/logo2.png'} alt="Logo" className="h-20 w-auto object-contain mb-2" />
          })()}
        </div>

        <div
          className="rounded-2xl p-6 border"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-400">Usuario</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="usuario"
                  autoComplete="username"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
                  className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-400">Contraseña</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
                  className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all cursor-pointer mt-1"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
