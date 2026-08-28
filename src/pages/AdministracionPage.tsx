import { useState, useRef, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency, MEDIOS_PAGO, proyectoEstadoLabel, PROYECTO_ESTADO_COLORS } from '@/lib/utils'
import type { Cliente, Evento, MedioPago, Proyecto, RegistroAdmin } from '@/types'
import { Wallet, User, Phone, Mail, MapPin, FileText, X, Calendar, Package, CheckSquare, Image, FolderOpen } from 'lucide-react'

type Vista = 'todos' | 'curso' | 'completado'
type Seleccion = { evento: Evento; proyecto: Proyecto } | null

export function AdministracionPage() {
  const { currentUser, eventos, clientes, usuarios, registrosAdmin, getOrCreateRegistroAdmin, updateRegistroAdmin } = useAppStore()
  const [vista, setVista] = useState<Vista>('curso')
  const [seleccion, setSeleccion] = useState<Seleccion>(null)

  if (currentUser?.rol !== 'admin' && currentUser?.rol !== 'administrativo') return <Navigate to="/dashboard" replace />

  const registroDe = (proyectoId: string) => registrosAdmin.find(r => r.proyectoId === proyectoId)
  const estaCompletado = (proyectoId: string) => {
    const r = registroDe(proyectoId)
    return !!r?.pagado && !!r?.facturado
  }

  const filas = eventos
    .flatMap(e => e.proyectos.map(p => ({ evento: e, proyecto: p })))
    .filter(({ proyecto }) => {
      if (vista === 'todos') return true
      return vista === 'completado' ? estaCompletado(proyecto.id) : !estaCompletado(proyecto.id)
    })
    .sort((a, b) => new Date(b.evento.createdAt).getTime() - new Date(a.evento.createdAt).getTime())

  const total = filas.reduce((s, f) => s + f.proyecto.importe, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-gray-100">Administración</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total importes</p>
          <p className="text-lg font-bold text-gray-100">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="flex bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5 w-fit">
        {(['todos', 'curso', 'completado'] as Vista[]).map(v => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`px-3 py-1 rounded-md text-sm cursor-pointer transition-all ${
              vista === v ? 'bg-[var(--surface-2)] text-gray-100' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {v === 'todos' ? 'Todos' : v === 'curso' ? 'En curso' : 'Completado'}
          </button>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Importe</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Forma de Pago</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Facturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-s)]">
              {filas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                  {vista === 'completado' ? 'No hay proyectos completados' : vista === 'curso' ? 'No hay proyectos en curso' : 'No hay proyectos aún'}
                </td></tr>
              ) : filas.map(({ evento, proyecto }) => (
                <FilaAdministracion
                  key={proyecto.id}
                  evento={evento}
                  proyecto={proyecto}
                  cliente={clientes.find(c => c.id === proyecto.clienteId)}
                  registro={registroDe(proyecto.id)}
                  selected={seleccion?.proyecto.id === proyecto.id}
                  onSelect={() => setSeleccion(s => s?.proyecto.id === proyecto.id ? null : { evento, proyecto })}
                  getOrCreateRegistroAdmin={getOrCreateRegistroAdmin}
                  updateRegistroAdmin={updateRegistroAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {seleccion && (
        <ProyectoDetailPanel
          evento={seleccion.evento}
          proyecto={seleccion.proyecto}
          cliente={clientes.find(c => c.id === seleccion.proyecto.clienteId)}
          usuarios={usuarios}
          registro={registroDe(seleccion.proyecto.id)}
          getOrCreateRegistroAdmin={getOrCreateRegistroAdmin}
          updateRegistroAdmin={updateRegistroAdmin}
          onClose={() => setSeleccion(null)}
        />
      )}
    </div>
  )
}

function FilaAdministracion({ evento, proyecto, cliente, registro, selected, onSelect, getOrCreateRegistroAdmin, updateRegistroAdmin }: {
  evento: Pick<Evento, 'id' | 'titulo'>
  proyecto: Pick<Proyecto, 'id' | 'importe'>
  cliente?: Cliente
  registro?: RegistroAdmin
  selected: boolean
  onSelect: () => void
  getOrCreateRegistroAdmin: (proyectoId: string) => string
  updateRegistroAdmin: (id: string, data: Partial<Omit<RegistroAdmin, 'id' | 'proyectoId'>>) => void
}) {
  const [concepto, setConcepto] = useState(registro?.concepto || '')
  const formasPago = registro?.formasPago || []

  const ensureId = () => registro?.id || getOrCreateRegistroAdmin(proyecto.id)

  const handleConceptoBlur = () => {
    if (concepto === (registro?.concepto || '')) return
    updateRegistroAdmin(ensureId(), { concepto })
  }

  const toggleFormaPago = (forma: MedioPago) => {
    const next = formasPago.includes(forma) ? formasPago.filter(f => f !== forma) : [...formasPago, forma]
    updateRegistroAdmin(ensureId(), { formasPago: next })
  }

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors ${selected ? 'bg-brand-500/10' : 'hover:bg-[var(--surface-h)]'}`}
    >
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-200">
          {evento.titulo}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        <ClienteInfo cliente={cliente} />
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-300">{formatCurrency(proyecto.importe)}</td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <input
          value={concepto}
          onChange={e => setConcepto(e.target.value)}
          onBlur={handleConceptoBlur}
          placeholder="Concepto..."
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
        />
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1">
          {MEDIOS_PAGO.map(forma => {
            const active = formasPago.includes(forma as MedioPago)
            return (
              <button
                key={forma}
                onClick={() => toggleFormaPago(forma as MedioPago)}
                className={`px-2 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-500/15 text-brand-400 border-brand-500/40'
                    : 'bg-transparent text-gray-500 border-[var(--border)] hover:border-gray-500'
                }`}
              >
                {forma}
              </button>
            )
          })}
        </div>
      </td>
      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={registro?.pagado || false}
          onChange={e => updateRegistroAdmin(ensureId(), { pagado: e.target.checked })}
          className="w-4 h-4 accent-brand-500 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={registro?.facturado || false}
          onChange={e => updateRegistroAdmin(ensureId(), { facturado: e.target.checked })}
          className="w-4 h-4 accent-brand-500 cursor-pointer"
        />
      </td>
    </tr>
  )
}

function ProyectoDetailPanel({ evento, proyecto, cliente, usuarios, registro, getOrCreateRegistroAdmin, updateRegistroAdmin, onClose }: {
  evento: Evento
  proyecto: Proyecto
  cliente?: Cliente
  usuarios: import('@/types').Usuario[]
  registro?: RegistroAdmin
  getOrCreateRegistroAdmin: (proyectoId: string) => string
  updateRegistroAdmin: (id: string, data: Partial<Omit<RegistroAdmin, 'id' | 'proyectoId'>>) => void
  onClose: () => void
}) {
  const [concepto, setConcepto] = useState(registro?.concepto || '')
  const formasPago = registro?.formasPago || []
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setConcepto(registro?.concepto || '')
  }, [registro?.concepto])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const ensureId = () => registro?.id || getOrCreateRegistroAdmin(proyecto.id)

  const handleConceptoBlur = () => {
    if (concepto === (registro?.concepto || '')) return
    updateRegistroAdmin(ensureId(), { concepto })
  }

  const toggleFormaPago = (forma: MedioPago) => {
    const next = formasPago.includes(forma) ? formasPago.filter(f => f !== forma) : [...formasPago, forma]
    updateRegistroAdmin(ensureId(), { formasPago: next })
  }

  const responsable = usuarios.find(u => u.id === proyecto.responsableId)
  const tareasDone = proyecto.tareas.filter(t => t.completada).length
  const renders = proyecto.renders || []

  const formatDate = (iso?: string) => {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto w-full max-w-sm bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)] shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs text-gray-500 mb-1">{cliente?.nombre || '—'}</p>
            <h2 className="text-base font-bold text-gray-100 leading-snug">{evento.titulo}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Render thumbnail */}
          {renders.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] aspect-video bg-[var(--bg)]">
              <img src={renders[0]} alt="render" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Estado + importe */}
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border border-transparent ${PROYECTO_ESTADO_COLORS[proyecto.estado].bg} ${PROYECTO_ESTADO_COLORS[proyecto.estado].text}`}>
              {proyectoEstadoLabel(proyecto.estado)}
            </span>
            <span className="ml-auto text-lg font-bold text-gray-100">
              {formatCurrency(proyecto.importe)}
              {proyecto.importe > 0 && <span className="text-xs font-normal text-gray-500 ml-1">+ I.V.A.</span>}
            </span>
          </div>

          {/* Info básica */}
          <div className="space-y-2.5">
            {evento.lugar && (
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <MapPin size={14} className="text-gray-600 shrink-0" />
                <span>{evento.lugar}</span>
              </div>
            )}
            {responsable && (
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <User size={14} className="text-gray-600 shrink-0" />
                <span>{responsable.displayName || responsable.username}</span>
              </div>
            )}
            {proyecto.fabricacion && (
              <div className="flex items-start gap-2.5 text-sm text-gray-400">
                <Package size={14} className="text-gray-600 shrink-0 mt-0.5" />
                <span>{proyecto.fabricacion}</span>
              </div>
            )}
            {(evento.eventoInicio || evento.eventoFin) && (
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <Calendar size={14} className="text-gray-600 shrink-0" />
                <span>
                  {formatDate(evento.eventoInicio)}
                  {evento.eventoFin && evento.eventoFin !== evento.eventoInicio && ` → ${formatDate(evento.eventoFin)}`}
                </span>
              </div>
            )}
            {evento.carpetaServidor && (
              <div className="flex items-center gap-2.5 text-sm text-gray-400">
                <FolderOpen size={14} className="text-gray-600 shrink-0" />
                <span className="font-mono text-xs truncate">{evento.carpetaServidor}</span>
              </div>
            )}
          </div>

          {/* Tareas */}
          {proyecto.tareas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckSquare size={13} className="text-gray-600" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tareas — {tareasDone}/{proyecto.tareas.length}
                </p>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {proyecto.tareas.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 text-sm">
                    <div className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                      t.completada ? 'bg-brand-500/20 border-brand-500/60' : 'border-[var(--border)]'
                    }`}>
                      {t.completada && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                    </div>
                    <span className={t.completada ? 'text-gray-600 line-through' : 'text-gray-300'}>{t.titulo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renders adicionales */}
          {renders.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image size={13} className="text-gray-600" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Renders</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {renders.slice(1).map((r, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                    <img src={r} alt={`render ${i + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {proyecto.notas && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-gray-600" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</p>
              </div>
              <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{proyecto.notas}</p>
            </div>
          )}

          {/* Separador */}
          <div className="border-t border-[var(--border)]" />

          {/* Campos admin */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Administración</p>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Concepto</label>
              <input
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                onBlur={handleConceptoBlur}
                placeholder="Concepto..."
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
                onClick={e => e.stopPropagation()}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Forma de Pago</label>
              <div className="flex flex-wrap gap-1.5">
                {MEDIOS_PAGO.map(forma => {
                  const active = formasPago.includes(forma as MedioPago)
                  return (
                    <button
                      key={forma}
                      onClick={e => { e.stopPropagation(); toggleFormaPago(forma as MedioPago) }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        active
                          ? 'bg-brand-500/15 text-brand-400 border-brand-500/40'
                          : 'bg-transparent text-gray-500 border-[var(--border)] hover:border-gray-500'
                      }`}
                    >
                      {forma}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={registro?.pagado || false}
                  onChange={e => updateRegistroAdmin(ensureId(), { pagado: e.target.checked })}
                  className="w-4 h-4 accent-brand-500 cursor-pointer"
                />
                <span className="text-sm text-gray-400">Pagado</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={registro?.facturado || false}
                  onChange={e => updateRegistroAdmin(ensureId(), { facturado: e.target.checked })}
                  className="w-4 h-4 accent-brand-500 cursor-pointer"
                />
                <span className="text-sm text-gray-400">Facturado</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClienteInfo({ cliente }: { cliente?: Cliente }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!cliente) return <span>—</span>

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="text-brand-400 hover:text-brand-300 cursor-pointer transition-colors text-left">
        {cliente.nombre}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-4 space-y-2.5">
          <p className="text-sm font-semibold text-gray-200">{cliente.nombre}</p>
          {cliente.contacto && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <User size={12} className="text-gray-600 shrink-0" /> {cliente.contacto}
            </div>
          )}
          {cliente.telefono && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Phone size={12} className="text-gray-600 shrink-0" /> {cliente.telefono}
            </div>
          )}
          {cliente.email && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Mail size={12} className="text-gray-600 shrink-0" /> {cliente.email}
            </div>
          )}
          {cliente.direccion && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MapPin size={12} className="text-gray-600 shrink-0" /> {cliente.direccion}
            </div>
          )}
          {cliente.notas && (
            <div className="flex gap-2 text-xs text-gray-400 pt-2 border-t border-[var(--border)]">
              <FileText size={12} className="text-gray-600 shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{cliente.notas}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
