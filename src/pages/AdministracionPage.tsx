import { useState, useRef, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { formatCurrency, MEDIOS_PAGO } from '@/lib/utils'
import type { Cliente, Evento, MedioPago, Proyecto, RegistroAdmin } from '@/types'
import { Wallet, User, Phone, Mail, MapPin, FileText } from 'lucide-react'

type Vista = 'todos' | 'curso' | 'completado'

export function AdministracionPage() {
  const { currentUser, eventos, clientes, registrosAdmin, getOrCreateRegistroAdmin, updateRegistroAdmin } = useAppStore()
  const navigate = useNavigate()
  const [vista, setVista] = useState<Vista>('curso')

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
                  getOrCreateRegistroAdmin={getOrCreateRegistroAdmin}
                  updateRegistroAdmin={updateRegistroAdmin}
                  onNavigate={() => navigate(`/proyectos/${evento.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilaAdministracion({ evento, proyecto, cliente, registro, getOrCreateRegistroAdmin, updateRegistroAdmin, onNavigate }: {
  evento: Pick<Evento, 'id' | 'titulo'>
  proyecto: Pick<Proyecto, 'id' | 'importe'>
  cliente?: Cliente
  registro?: RegistroAdmin
  getOrCreateRegistroAdmin: (proyectoId: string) => string
  updateRegistroAdmin: (id: string, data: Partial<Omit<RegistroAdmin, 'id' | 'proyectoId'>>) => void
  onNavigate: () => void
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
    <tr className="hover:bg-[var(--surface-h)] transition-colors">
      <td className="px-4 py-3">
        <button onClick={onNavigate} className="text-sm font-medium text-brand-400 hover:text-brand-300 cursor-pointer transition-colors text-left">
          {evento.titulo}
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        <ClienteInfo cliente={cliente} />
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-300">{formatCurrency(proyecto.importe)}</td>
      <td className="px-4 py-3">
        <input
          value={concepto}
          onChange={e => setConcepto(e.target.value)}
          onBlur={handleConceptoBlur}
          placeholder="Concepto..."
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
        />
      </td>
      <td className="px-4 py-3">
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
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={registro?.pagado || false}
          onChange={e => updateRegistroAdmin(ensureId(), { pagado: e.target.checked })}
          className="w-4 h-4 accent-brand-500 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 text-center">
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
