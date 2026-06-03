import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { CheckSquare, Plus, X, Check, ChevronRight, Flag } from 'lucide-react'
import type { TareaUsuarioPrioridad } from '@/types'

const PRIORIDAD_COLORS: Record<TareaUsuarioPrioridad, { text: string; dot: string; label: string }> = {
  alta:  { text: 'text-red-400',    dot: 'bg-red-400',    label: 'Alta' },
  media: { text: 'text-amber-400',  dot: 'bg-amber-400',  label: 'Media' },
  baja:  { text: 'text-gray-500',   dot: 'bg-gray-500',   label: 'Baja' },
}

export function MisTareasPage() {
  const { tareasUsuario, eventos, addTareaUsuario, updateTareaUsuario, deleteTareaUsuario } = useAppStore()
  const navigate = useNavigate()

  const [titulo, setTitulo] = useState('')
  const [prioridad, setPrioridad] = useState<TareaUsuarioPrioridad>('media')
  const [eventoId, setEventoId] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'completadas'>('pendientes')
  const [filtroEvento, setFiltroEvento] = useState('')

  const tareasFiltradas = tareasUsuario
    .filter(t => {
      if (filtro === 'pendientes' && t.completada) return false
      if (filtro === 'completadas' && !t.completada) return false
      if (filtroEvento && t.eventoId !== filtroEvento) return false
      return true
    })
    .sort((a, b) => {
      if (a.completada !== b.completada) return a.completada ? 1 : -1
      const ord: Record<TareaUsuarioPrioridad, number> = { alta: 0, media: 1, baja: 2 }
      return ord[a.prioridad] - ord[b.prioridad]
    })

  const pendientes = tareasUsuario.filter(t => !t.completada).length

  const handleAdd = () => {
    if (!titulo.trim()) return
    addTareaUsuario({
      titulo: titulo.trim(),
      completada: false,
      prioridad,
      eventoId: eventoId || undefined,
      fechaVencimiento: fechaVencimiento || undefined,
    })
    setTitulo('')
    setPrioridad('media')
    setEventoId('')
    setFechaVencimiento('')
    setMostrarForm(false)
  }

  // Agrupar por proyecto para la vista
  const sinProyecto = tareasFiltradas.filter(t => !t.eventoId)
  const conProyecto = tareasFiltradas.filter(t => t.eventoId)
  const porProyecto = conProyecto.reduce<Record<string, typeof conProyecto>>((acc, t) => {
    const key = t.eventoId!
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-100">Mis Tareas</h1>
          {pendientes > 0 && (
            <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-medium">
              {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={14} /> Nueva tarea
        </button>
      </div>

      {/* Formulario nueva tarea */}
      {mostrarForm && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
          <input
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="¿Qué tenés que hacer?"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
          />
          <div className="flex gap-2 flex-wrap">
            {/* Prioridad */}
            <select
              value={prioridad}
              onChange={e => setPrioridad(e.target.value as TareaUsuarioPrioridad)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="alta">Prioridad: Alta</option>
              <option value="media">Prioridad: Media</option>
              <option value="baja">Prioridad: Baja</option>
            </select>
            {/* Proyecto */}
            <select
              value={eventoId}
              onChange={e => setEventoId(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer flex-1"
            >
              <option value="">Sin proyecto</option>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
            </select>
            {/* Fecha */}
            <input
              type="date"
              value={fechaVencimiento}
              onChange={e => setFechaVencimiento(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setMostrarForm(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-200 cursor-pointer transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!titulo.trim()}
              className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['pendientes', 'todas', 'completadas'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer capitalize ${
              filtro === f
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="h-3 w-px bg-[var(--border)] mx-1" />
        <select
          value={filtroEvento}
          onChange={e => setFiltroEvento(e.target.value)}
          className="bg-transparent border-none text-xs text-gray-500 focus:outline-none cursor-pointer"
        >
          <option value="">Todos los proyectos</option>
          {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-600">{tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? 's' : ''}</span>
      </div>

      {tareasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
          {filtro === 'pendientes' ? 'No tenés tareas pendientes' : 'No hay tareas'}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Tareas sin proyecto */}
          {sinProyecto.length > 0 && (
            <TareaGroup
              titulo="Sin proyecto"
              tareas={sinProyecto}
              eventos={eventos}
              onToggle={id => updateTareaUsuario(id, { completada: !tareasUsuario.find(t => t.id === id)?.completada })}
              onDelete={deleteTareaUsuario}
              onNavigate={navigate}
            />
          )}
          {/* Tareas agrupadas por proyecto */}
          {Object.entries(porProyecto).map(([evId, tareas]) => {
            const evento = eventos.find(e => e.id === evId)
            return (
              <TareaGroup
                key={evId}
                titulo={evento?.titulo || 'Proyecto eliminado'}
                eventoId={evId}
                tareas={tareas}
                eventos={eventos}
                onToggle={id => updateTareaUsuario(id, { completada: !tareasUsuario.find(t => t.id === id)?.completada })}
                onDelete={deleteTareaUsuario}
                onNavigate={navigate}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function TareaGroup({
  titulo, eventoId, tareas, onToggle, onDelete, onNavigate
}: {
  titulo: string
  eventoId?: string
  tareas: ReturnType<typeof useAppStore.getState>['tareasUsuario']
  eventos: ReturnType<typeof useAppStore.getState>['eventos']
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (path: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{titulo}</span>
        {eventoId && (
          <button
            onClick={() => onNavigate(`/proyectos/${eventoId}`)}
            className="text-gray-600 hover:text-brand-400 transition-colors cursor-pointer"
            title="Ir al proyecto"
          >
            <ChevronRight size={13} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {tareas.map(t => {
          const p = PRIORIDAD_COLORS[t.prioridad]
          const vencida = t.fechaVencimiento && !t.completada && new Date(t.fechaVencimiento) < new Date()
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                t.completada ? 'border-[var(--border-s)] opacity-50' : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <button
                onClick={() => onToggle(t.id)}
                className={`w-4 h-4 rounded shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all cursor-pointer ${
                  t.completada ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border-h)] hover:border-brand-500'
                }`}
              >
                {t.completada && <Check size={10} className="text-white" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${t.completada ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {t.titulo}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Flag size={10} className={p.text} />
                  <span className={`text-xs ${p.text}`}>{p.label}</span>
                  {t.fechaVencimiento && (
                    <span className={`text-xs ${vencida ? 'text-red-400' : 'text-gray-600'}`}>
                      · {new Date(t.fechaVencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      {vencida && ' (vencida)'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-0.5 shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
