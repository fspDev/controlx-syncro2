import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ESTADO_COLORS, estadoLabel, formatDate } from '@/lib/utils'
import type { EventoEstado } from '@/types'
import { FolderKanban, CheckCircle2, Clock, AlertCircle, Users } from 'lucide-react'

const ESTADO_ORDER: EventoEstado[] = ['Negociacion', 'Confirmado', 'Armado', 'Finalizado', 'Cancelado']

export function DashboardPage() {
  const { eventos, clientes, currentUser } = useAppStore()
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

  // Solo tareas del usuario actual sin completar
  const tareasPropias = eventos.flatMap(e =>
    e.tareas.filter(t => !t.completada && t.responsableId === currentUser?.id)
  )

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
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Mis tareas pendientes</p>
              <p className="text-2xl font-bold text-gray-100">{tareasPropias.length}</p>
              {tareasPropias.length === 0 && (
                <p className="text-xs text-emerald-400 mt-0.5">Al día ✓</p>
              )}
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
          {tareasPropias.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Mis tareas</h2>
              <Card className="p-4 space-y-2">
                {tareasPropias.slice(0, 5).map(t => {
                  const evento = eventos.find(e => e.tareas.some(ta => ta.id === t.id))
                  return (
                    <div
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => evento && navigate(`/proyectos/${evento.id}`)}
                    >
                      <p className="text-xs text-gray-400 truncate">{t.titulo}</p>
                      {evento && <p className="text-xs text-gray-600">{evento.titulo}</p>}
                    </div>
                  )
                })}
                {tareasPropias.length > 5 && (
                  <p className="text-xs text-gray-600">+{tareasPropias.length - 5} más</p>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
