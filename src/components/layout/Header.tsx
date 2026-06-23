import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Menu, CheckSquare } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function Header() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()
  const { eventos, clientes, sidebarOpen, setSidebarOpen } = useAppStore()
  const tareasPendientes = useAppStore(s => s.tareasUsuario.filter(t => !t.completada).length)

  const results = query.trim().length > 1
    ? [
        ...eventos.filter(e => {
          const c = clientes.find(c => c.id === e.clienteId)
          const q = query.toLowerCase()
          return e.titulo.toLowerCase().includes(q) ||
            e.lugar.toLowerCase().includes(q) ||
            c?.nombre.toLowerCase().includes(q)
        }).slice(0, 5).map(e => {
          const c = clientes.find(c => c.id === e.clienteId)
          return { type: 'evento' as const, id: e.id, label: e.titulo, sub: c?.nombre || '' }
        }),
        ...clientes.filter(c => {
          const q = query.toLowerCase()
          return c.nombre.toLowerCase().includes(q) || c.contacto?.toLowerCase().includes(q)
        }).slice(0, 3).map(c => ({ type: 'cliente' as const, id: c.id, label: c.nombre, sub: c.contacto || '' })),
      ]
    : []

  const handleSelect = (r: { type: 'evento' | 'cliente'; id: string }) => {
    setQuery('')
    setFocused(false)
    if (r.type === 'evento') navigate(`/proyectos/${r.id}`)
    else navigate(`/clientes/${r.id}`)
  }

  return (
    <header className="h-12 border-b border-[var(--border-s)] flex items-center px-4 gap-3 bg-[var(--bg-dark)] shrink-0">
      {/* Hamburger — desktop collapsed sidebar only */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:flex p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)] transition-all cursor-pointer shrink-0"
        aria-label="Menú"
      >
        <Menu size={18} />
      </button>
      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Buscar eventos, clientes..."
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-600 focus:border-brand-500/40 focus:outline-none transition-all"
        />
        {focused && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-40 py-1 overflow-hidden">
            {results.map(r => (
              <button
                key={`${r.type}-${r.id}`}
                onMouseDown={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-2)] text-left transition-colors cursor-pointer"
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.type === 'evento' ? 'bg-brand-500/15 text-brand-400' : 'bg-blue-500/15 text-blue-400'}`}>
                  {r.type === 'evento' ? 'Evento' : 'Cliente'}
                </span>
                <div>
                  <p className="text-sm text-gray-200">{r.label}</p>
                  {r.sub && <p className="text-xs text-gray-500">{r.sub}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tareas pendientes */}
      {tareasPendientes > 0 && (
        <button
          onClick={() => navigate('/mis-tareas')}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Ver mis tareas pendientes"
        >
          <CheckSquare size={14} className="text-red-400" />
          <span className="text-sm font-semibold text-red-400">{tareasPendientes}</span>
          <span className="hidden sm:inline text-xs text-red-400/80">pendiente{tareasPendientes !== 1 ? 's' : ''}</span>
        </button>
      )}
    </header>
  )
}
