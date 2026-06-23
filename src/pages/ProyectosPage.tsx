import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { EventoForm } from '@/components/eventos/EventoForm'
import { ESTADO_COLORS, ESTADOS_EVENTO, estadoLabel, formatDate } from '@/lib/utils'
import type { EventoEstado } from '@/types'
import { Plus, Filter, ChevronRight, AlertCircle, ChevronDown, Check } from 'lucide-react'

function EstadoSelector({ eventoId, estado }: { eventoId: string; estado: EventoEstado }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { updateEvento } = useAppStore()
  const cols = ESTADO_COLORS[estado]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${cols.bg} ${cols.text}`}
      >
        {estadoLabel(estado)}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
          {ESTADOS_EVENTO.map(s => {
            const c = ESTADO_COLORS[s]
            return (
              <button
                key={s}
                onClick={() => { updateEvento(eventoId, { estado: s }); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-left"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                <span className={`flex-1 ${c.text}`}>{estadoLabel(s)}</span>
                {s === estado && <Check size={11} className="text-gray-500" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ProyectosPage() {
  const { eventos, clientes, usuarios, addEvento } = useAppStore()
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [filterEstados, setFilterEstados] = useState<Set<EventoEstado>>(
    new Set(ESTADOS_EVENTO.filter(e => e !== 'Finalizado' && e !== 'Cancelado'))
  )
  const [filterCliente, setFilterCliente] = useState('')

  const toggleEstado = (estado: EventoEstado) => {
    setFilterEstados(prev => {
      const next = new Set(prev)
      next.has(estado) ? next.delete(estado) : next.add(estado)
      return next
    })
  }

  const filtered = eventos.filter(e => {
    if (filterEstados.size > 0 && !filterEstados.has(e.estado)) return false
    if (filterCliente && e.clienteId !== filterCliente) return false
    return true
  }).sort((a, b) => {
    if (a.eventoInicio && b.eventoInicio) return new Date(a.eventoInicio).getTime() - new Date(b.eventoInicio).getTime()
    return 0
  })

  const handleNew = (data: Parameters<typeof addEvento>[0]) => {
    const id = addEvento(data)
    setShowNew(false)
    navigate(`/proyectos/${id}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Proyectos</h1>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <Plus size={15} /> Nuevo Evento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={14} className="text-gray-500 shrink-0" />
          {ESTADOS_EVENTO.map(estado => {
            const cols = ESTADO_COLORS[estado]
            const active = filterEstados.has(estado)
            return (
              <button
                key={estado}
                onClick={() => toggleEstado(estado)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  active
                    ? `${cols.bg} ${cols.text} border-transparent`
                    : 'bg-transparent text-gray-500 border-[var(--border)] hover:border-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? cols.dot : 'bg-gray-600'}`} />
                {estadoLabel(estado)}
              </button>
            )
          })}
          <div className="h-4 w-px bg-[var(--border)]" />
          <select
            value={filterCliente}
            onChange={e => setFilterCliente(e.target.value)}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {(filterEstados.size > 0 || filterCliente) && (
            <button onClick={() => { setFilterEstados(new Set()); setFilterCliente('') }} className="text-xs text-gray-500 hover:text-brand-400 cursor-pointer">
              Limpiar
            </button>
          )}
          <span className="ml-auto text-xs text-gray-600">{filtered.length} evento{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tarjetas — mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-10 text-center text-gray-500 text-sm">
            No se encontraron eventos
          </div>
        ) : filtered.map(e => {
          const cliente = clientes.find(c => c.id === e.clienteId)
          const tareasPend = e.tareas.filter(t => !t.completada).length
          return (
            <div
              key={e.id}
              onClick={() => navigate(`/proyectos/${e.id}`)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 cursor-pointer hover:bg-[var(--surface-h)] active:bg-[var(--surface-h)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-200 truncate">{e.titulo}</span>
                  {tareasPend > 0 && <AlertCircle size={13} className="text-amber-400 shrink-0" />}
                </div>
                <div className="shrink-0" onClick={ev => ev.stopPropagation()}>
                  <EstadoSelector eventoId={e.id} estado={e.estado} />
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {cliente && <span>{cliente.nombre}</span>}
                {e.lugar && <><span>·</span><span>{e.lugar}</span></>}
                {e.eventoInicio && <><span>·</span><span>{formatDate(e.eventoInicio)}</span></>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla — desktop */}
      <div className="hidden md:block bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Lugar</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Responsable</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-s)]">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">No se encontraron eventos</td></tr>
            ) : filtered.map(e => {
              const cliente = clientes.find(c => c.id === e.clienteId)
              const responsable = usuarios.find(u => u.id === e.responsableId)
              const tareasPend = e.tareas.filter(t => !t.completada).length
              return (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/proyectos/${e.id}`)}
                  className="hover:bg-[var(--surface-h)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{e.titulo}</span>
                      {tareasPend > 0 && (
                        <span title={`${tareasPend} tarea(s) pendiente(s)`}>
                          <AlertCircle size={13} className="text-amber-400" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{cliente?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{e.lugar || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">
                    {responsable ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center">
                          <span className="text-xs text-brand-400">{(responsable.displayName || responsable.username).slice(0,1)}</span>
                        </div>
                        <span>{responsable.displayName || responsable.username}</span>
                      </div>
                    ) : <span className="text-gray-600">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(e.eventoInicio)}</td>
                  <td className="px-4 py-3">
                    <EstadoSelector eventoId={e.id} estado={e.estado} />
                  </td>
                  <td className="px-4 py-3 text-gray-600"><ChevronRight size={15} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Kanban por estado */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400">Vista por estado</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ESTADOS_EVENTO.slice(0,4).map(estado => {
            const cols = ESTADO_COLORS[estado]
            const count = eventos.filter(e => e.estado === estado).length
            return (
              <div key={estado} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${cols.dot}`} />
                  <span className="text-xs font-medium text-gray-400">{estadoLabel(estado)}</span>
                  <Badge className={`${cols.bg} ${cols.text} ml-auto`}>{count}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={showNew} onClose={() => setShowNew(false)} title="Nuevo Evento" size="lg">
        <EventoForm onSubmit={handleNew} onCancel={() => setShowNew(false)} submitLabel="Crear Evento" />
      </Dialog>
    </div>
  )
}
