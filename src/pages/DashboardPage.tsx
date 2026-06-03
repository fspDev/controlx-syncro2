import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ESTADO_COLORS, estadoLabel, formatDate } from '@/lib/utils'
import type { EventoEstado, TareaUsuarioPrioridad } from '@/types'
import { FolderKanban, CheckCircle2, Clock, AlertCircle, Users, Flag } from 'lucide-react'

const PRIORIDAD_COLORS: Record<TareaUsuarioPrioridad, { text: string; label: string }> = {
  alta:  { text: 'text-red-400',   label: 'Alta' },
  media: { text: 'text-amber-400', label: 'Media' },
  baja:  { text: 'text-gray-500',  label: 'Baja' },
}

const ESTADO_ORDER: EventoEstado[] = ['Negociacion', 'Confirmado', 'Armado', 'Finalizado', 'Cancelado']

export function DashboardPage() {
  const { eventos, clientes, currentUser, tareasUsuario } = useAppStore()
  const navigate = useNavigate()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const proximos = eventos
    .filter(e => e.eventoInicio && e.estado !== 'Cancelado' && e.estado !== 'Finalizado' && new Date(e.eventoInicio) >= today)
    .sort((a, b) => new Date(a.eventoInicio!).getTime() - new Date(b.eventoInicio!).getTime())
    .slice(0, 5)

  const estadoCounts = ESTADO_ORDER.reduce((acc, estado) => {
    acc[estado] = eventos.filter(e => e.estado === estado).length
    return acc
  }, {} as Record<EventoEstado, number>)

  // Tareas de proyecto asignadas al usuario actual
  const tareasDeProyecto = eventos.flatMap(e =>
    e.tareas
      .filter(t => !t.completada && t.responsableId === currentUser?.id)
      .map(t => ({ ...t, eventoTitulo: e.titulo, eventoId: e.id, tipo: 'proyecto' as const }))
  )

  // Tareas personales pendientes del usuario actual
  const tareasPersonalesPend = tareasUsuario
    .filter(t => !t.completada)
    .map(t => {
      const ev = t.eventoId ? eventos.find(e => e.id === t.eventoId) : undefined
      return { ...t, eventoTitulo: ev?.titulo, tipo: 'personal' as const }
    })
    .sort((a, b) => {
      const ord: Record<TareaUsuarioPrioridad, number> = { alta: 0, media: 1, baja: 2 }
      return ord[a.prioridad] - ord[b.prioridad]
    })

  const totalTareasPendientes = tareasDeProyecto.length + tareasPersonalesPend.length

  const proxArmados = eventos
    .filter(e => e.armadoInicio && e.estado !== 'Cancelado' && e.estado !== 'Finalizado')
    .filter(e => {
      const d = new Date(e.armadoInicio!)
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
      return diff >= 0 && diff <= 7
    })
    .sort((a, b) => new Date(a.armadoInicio!).getTime() - new Date(b.armadoInicio!).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500">Bienvenido, {currentUser?.displayName || currentUser?.username}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Eventos activos</p>
              <p className="text-2xl font-bold text-gray-100">
                {eventos.filter(e => e.estado !== 'Cancelado' && e.estado !== 'Finalizado').length}
              </p>
            </div>
            <div className="p-2 bg-brand-500/15 rounded-lg"><FolderKanban size={18} className="text-brand-400" /></div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:border-[var(--border-h)] transition-colors" onClick={() => navigate('/mis-tareas')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Mis tareas pendientes</p>
              <p className="text-2xl font-bold text-gray-100">{totalTareasPendientes}</p>
              {totalTareasPendientes === 0
                ? <p className="text-xs text-emerald-400 mt-0.5">Al día ✓</p>
                : <p className="text-xs text-gray-600 mt-0.5">{tareasPersonalesPend.length} personal · {tareasDeProyecto.length} proyecto</p>
              }
            </div>
            <div className="p-2 bg-amber-500/15 rounded-lg"><Clock size={18} className="text-amber-400" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Clientes</p>
              <p className="text-2xl font-bold text-gray-100">{clientes.length}</p>
            </div>
            <div className="p-2 bg-blue-500/15 rounded-lg"><Users size={18} className="text-blue-400" /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos eventos */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">Próximos Eventos</h2>
          {proximos.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay eventos próximos</p>
            </Card>
          ) : (
            proximos.map(e => {
              const cliente = clientes.find(c => c.id === e.clienteId)
              const cols = ESTADO_COLORS[e.estado]
              const tareasPend = e.tareas.filter(t => !t.completada).length
              return (
                <Card key={e.id} className="p-4 cursor-pointer hover:border-[var(--border-h)] transition-colors" onClick={() => navigate(`/proyectos/${e.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${cols.bg} ${cols.text}`}>{estadoLabel(e.estado)}</Badge>
                        {tareasPend > 0 && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertCircle size={11} />{tareasPend} tarea{tareasPend > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-200 truncate">{e.titulo}</p>
                      <p className="text-xs text-gray-500">{cliente?.nombre || '—'} · {e.lugar}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">Evento</p>
                      <p className="text-sm font-medium text-gray-300">{formatDate(e.eventoInicio)}</p>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Por estado */}
          <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Por Estado</h2>
            <Card className="p-4 space-y-3">
              {ESTADO_ORDER.slice(0, 4).map(estado => {
                const cols = ESTADO_COLORS[estado]
                return (
                  <div key={estado} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cols.dot}`} />
                      <span className="text-sm text-gray-400">{estadoLabel(estado)}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-300">{estadoCounts[estado]}</span>
                  </div>
                )
              })}
            </Card>
          </div>

          {/* Armados esta semana */}
          {proxArmados.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Armados esta semana</h2>
              <Card className="p-4 space-y-3">
                {proxArmados.map(e => (
                  <div key={e.id} className="cursor-pointer" onClick={() => navigate(`/proyectos/${e.id}`)}>
                    <p className="text-sm text-gray-300 hover:text-brand-400 transition-colors truncate">{e.titulo}</p>
                    <p className="text-xs text-gray-600">{formatDate(e.armadoInicio)}</p>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Mis tareas pendientes */}
          {totalTareasPendientes > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">Mis tareas</h2>
                <button onClick={() => navigate('/mis-tareas')} className="text-xs text-brand-400 hover:text-brand-300 cursor-pointer transition-colors">
                  Ver todas
                </button>
              </div>
              <Card className="p-3 space-y-1">
                {tareasPersonalesPend.slice(0, 5).map(t => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 py-1.5 px-1 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                    onClick={() => t.eventoId ? navigate(`/proyectos/${t.eventoId}`) : navigate('/mis-tareas')}
                  >
                    <Flag size={10} className={`${PRIORIDAD_COLORS[t.prioridad].text} mt-1 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{t.titulo}</p>
                      {t.eventoTitulo && <p className="text-xs text-gray-600 truncate">{t.eventoTitulo}</p>}
                    </div>
                  </div>
                ))}
                {tareasDeProyecto.slice(0, Math.max(0, 5 - tareasPersonalesPend.length)).map(t => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 py-1.5 px-1 rounded-lg hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                    onClick={() => navigate(`/proyectos/${t.eventoId}`)}
                  >
                    <AlertCircle size={10} className="text-amber-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{t.titulo}</p>
                      <p className="text-xs text-gray-600 truncate">{t.eventoTitulo}</p>
                    </div>
                  </div>
                ))}
                {totalTareasPendientes > 5 && (
                  <button onClick={() => navigate('/mis-tareas')} className="text-xs text-gray-600 hover:text-brand-400 cursor-pointer transition-colors pt-1 w-full text-left px-1">
                    +{totalTareasPendientes - 5} más
                  </button>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
