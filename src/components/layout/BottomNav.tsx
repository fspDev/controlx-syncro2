import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, CheckSquare, Calendar, MoreHorizontal, Users, Briefcase, Shield, Wallet, Receipt, LogOut, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const MAIN_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Inicio' },
  { to: '/proyectos',   icon: FolderKanban,    label: 'Proyectos' },
  { to: '/mis-tareas',  icon: CheckSquare,     label: 'Tareas' },
  { to: '/calendario',  icon: Calendar,        label: 'Agenda' },
]

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { currentUser, logout, tareasUsuario } = useAppStore()
  const navigate = useNavigate()
  const tareasPendientes = tareasUsuario.filter(t => !t.completada).length

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-[var(--bg-dark)] border-t border-[var(--border-s)] rounded-t-2xl p-4 pb-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Más secciones</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                ...((currentUser?.rol === 'admin' || currentUser?.rol === 'administrativo') ? [{ to: '/administracion', icon: Wallet, label: 'Administración' }] : []),
                ...(currentUser?.permisos?.ctaCteProv === true ? [{ to: '/cta-cte-prov', icon: Receipt, label: 'Cta Cte Prov' }] : []),
                { to: '/clientes', icon: Users,    label: 'Clientes' },
                { to: '/trabajos', icon: Briefcase, label: 'Trabajos' },
                ...(currentUser?.rol === 'admin' ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
              ].map(({ to, icon: Icon, label }) => (
                <button
                  key={to}
                  onClick={() => { navigate(to); setMoreOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-h)] transition-colors cursor-pointer"
                >
                  <Icon size={20} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{label}</span>
                </button>
              ))}
            </div>
            {currentUser && (
              <div className="flex items-center justify-between px-2 py-2.5 border-t border-[var(--border-s)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-brand-400">
                      {(currentUser.displayName || currentUser.username).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-300">{currentUser.displayName || currentUser.username}</p>
                    <p className="text-xs text-gray-600 capitalize">{currentUser.rol}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-dark)] border-t border-[var(--border-s)] flex items-stretch h-16 safe-area-bottom">
        {MAIN_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative cursor-pointer',
              isActive ? 'text-brand-400' : 'text-gray-500'
            )}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={20} />
                  {to === '/mis-tareas' && tareasPendientes > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {tareasPendientes > 9 ? '9+' : tareasPendientes}
                    </span>
                  )}
                </div>
                <span className={isActive ? 'text-brand-400' : 'text-gray-500'}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer',
            moreOpen ? 'text-brand-400' : 'text-gray-500'
          )}
        >
          <MoreHorizontal size={20} />
          <span>Más</span>
        </button>
      </nav>
    </>
  )
}
