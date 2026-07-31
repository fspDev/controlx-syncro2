import { NavLink, Link } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderKanban, Calendar, Users, Briefcase,
  ChevronLeft, ChevronRight, LogOut, Shield, Sun, Moon, Monitor, CheckSquare, Wallet, Receipt
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
  { to: '/mis-tareas', icon: CheckSquare, label: 'Mis Tareas' },
  { to: '/calendario', icon: Calendar, label: 'Calendario' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/trabajos', icon: Briefcase, label: 'Trabajos Externos' },
]

const THEME_OPTS = [
  { value: 'dark' as const,   icon: Moon,    label: 'Oscuro' },
  { value: 'light' as const,  icon: Sun,     label: 'Claro' },
  { value: 'system' as const, icon: Monitor, label: 'Sistema' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentUser, logout, theme, setTheme } = useAppStore()

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const logoSrc = isDark
    ? `${import.meta.env.BASE_URL}logo1.svg`
    : `${import.meta.env.BASE_URL}logo2.svg`

  return (
    <aside className={cn(
      'flex flex-col bg-[var(--bg-dark)] border-r border-[var(--border-s)] transition-all duration-300 shrink-0 overflow-hidden',
      // Mobile: fixed overlay, slides in/out
      'fixed inset-y-0 left-0 z-40 lg:relative lg:inset-auto lg:z-auto',
      sidebarOpen ? 'w-52' : '-translate-x-full lg:translate-x-0 lg:w-14'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 h-12 shrink-0 border-b border-[var(--border-s)]', !sidebarOpen && 'lg:justify-center lg:px-0')}>
        <Link to="/dashboard">
          <img src={logoSrc} alt="Logo" className="h-8 w-auto object-contain shrink-0 cursor-pointer" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {(currentUser?.rol === 'admin' || currentUser?.rol === 'administrativo') && (
          <NavLink
            to="/administracion"
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              isActive
                ? 'bg-brand-500/15 text-brand-400 font-medium'
                : 'text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)]',
              !sidebarOpen && 'lg:justify-center lg:px-0'
            )}
            title={!sidebarOpen ? 'Administración' : undefined}
          >
            <Wallet size={17} className="shrink-0" />
            {sidebarOpen && <span>Administración</span>}
          </NavLink>
        )}

        {currentUser?.permisos?.ctaCteProv === true && (
          <NavLink
            to="/cta-cte-prov"
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              isActive
                ? 'bg-brand-500/15 text-brand-400 font-medium'
                : 'text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)]',
              !sidebarOpen && 'lg:justify-center lg:px-0'
            )}
            title={!sidebarOpen ? 'Cta Cte Proveedores' : undefined}
          >
            <Receipt size={17} className="shrink-0" />
            {sidebarOpen && <span>Cta Cte Proveedores</span>}
          </NavLink>
        )}

        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              isActive
                ? 'bg-brand-500/15 text-brand-400 font-medium'
                : 'text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)]',
              !sidebarOpen && 'lg:justify-center lg:px-0'
            )}
            title={!sidebarOpen ? label : undefined}
          >
            <Icon size={17} className="shrink-0" />
            {sidebarOpen && <span className="flex-1">{label}</span>}
          </NavLink>
        ))}

        {currentUser?.rol === 'admin' && (
          <NavLink
            to="/admin"
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              isActive
                ? 'bg-brand-500/15 text-brand-400 font-medium'
                : 'text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)]',
              !sidebarOpen && 'lg:justify-center lg:px-0'
            )}
            title={!sidebarOpen ? 'Admin' : undefined}
          >
            <Shield size={17} className="shrink-0" />
            {sidebarOpen && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--border-s)] p-2 flex flex-col gap-1">
        {/* Theme toggle */}
        {sidebarOpen ? (
          <div className="flex items-center gap-1 px-2 py-1">
            {THEME_OPTS.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={label}
                className={cn(
                  'flex-1 flex items-center justify-center py-1.5 rounded-md text-xs transition-all cursor-pointer',
                  theme === value
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)]'
                )}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => {
              const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
              setTheme(next)
            }}
            className="hidden lg:flex items-center justify-center py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-all"
            title={`Tema: ${theme}`}
          >
            {theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <Monitor size={14} />}
          </button>
        )}

        {/* User info */}
        {sidebarOpen && currentUser && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-brand-400">
                {(currentUser.displayName || currentUser.username).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">{currentUser.displayName || currentUser.username}</p>
              <p className="text-xs text-gray-600 capitalize">{currentUser.rol}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer',
            !sidebarOpen && 'lg:justify-center'
          )}
          title="Cerrar sesión"
        >
          <LogOut size={15} />
          {sidebarOpen && <span>Cerrar sesión</span>}
        </button>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] transition-all cursor-pointer',
            !sidebarOpen && 'justify-center'
          )}
        >
          {sidebarOpen ? <><ChevronLeft size={15} /><span>Colapsar</span></> : <ChevronRight size={15} />}
        </button>
      </div>
    </aside>
  )
}
