import { useState, useRef, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import {
  formatCurrency, formatDate, genId,
  montoPagadoAdmin, estadoPagoAdmin, ESTADO_PAGO_ADMIN_COLORS,
  proyectoEstadoLabel, PROYECTO_ESTADO_COLORS, MEDIOS_PAGO,
  type EstadoPagoAdmin,
} from '@/lib/utils'

const ESTADOS_PAGO: EstadoPagoAdmin[] = ['Pendiente', 'Parcial', 'Pagado']
import { MontoInput } from '@/components/ui/MontoInput'
import type { Cliente, Evento, MedioPago, PagoAdmin, Proyecto, RegistroAdmin, Usuario } from '@/types'
import {
  Wallet, User, Phone, Mail, MapPin, FileText, X, Calendar, Package, CheckSquare, Image, FolderOpen,
  LayoutGrid, List, Plus, Trash2, ChevronDown, ChevronRight, Edit2, Check,
} from 'lucide-react'

type Vista = 'planilla' | 'clientes'
type Seleccion = { evento: Evento; proyecto: Proyecto } | null

interface Fila {
  evento: Evento
  proyecto: Proyecto
  cliente?: Cliente
  registro?: RegistroAdmin
}

type FiltroFacturacion = 'facturado' | 'sin_facturar'

interface Filtros {
  clienteId: string
  concepto: string
  fechaDesde: string
  fechaHasta: string
  estados: EstadoPagoAdmin[]         // vacío = todos los estados
  facturacion: FiltroFacturacion[]   // vacío = facturados y sin facturar
}

const FILTROS_VACIOS: Filtros = { clienteId: '', concepto: '', fechaDesde: '', fechaHasta: '', estados: [], facturacion: [] }

const FACTURACION_OPTS: { value: FiltroFacturacion; label: string }[] = [
  { value: 'facturado', label: 'Facturado' },
  { value: 'sin_facturar', label: 'Sin facturar' },
]

// Los eventos anteriores a esta fecha ya se marcaron como cobrados/facturados
// en bloque (ver commit de la migración) y no tienen que verse ni poder
// tocarse desde esta sección — quedan afuera antes de cualquier filtro del
// usuario, no solo ocultos por default.
const CORTE_ADMINISTRACION = '2026-08-01'

export function AdministracionPage() {
  const { currentUser, eventos, clientes, usuarios, registrosAdmin, getOrCreateRegistroAdmin, updateRegistroAdmin } = useAppStore()
  const [vista, setVista] = useState<Vista>('planilla')
  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)

  const registroDe = (proyectoId: string) => registrosAdmin.find(r => r.proyectoId === proyectoId)
  // Algunos clienteId legados quedaron con una mayúscula distinta a la del id
  // real del cliente (ej. "Vespasiani" vs "vespasiani") — sin este fallback,
  // esos proyectos aparecerían sin cliente pese a tenerlo cargado.
  const clientePorId = (clienteId: string) =>
    clientes.find(c => c.id === clienteId) || clientes.find(c => c.id.toLowerCase() === clienteId.toLowerCase())

  // Todas las filas (proyecto = fila administrativa), ordenadas por fecha de
  // evento más cercana primero — el objetivo es ver el flujo de caja que se
  // viene, no un historial. Sin fecha cargada quedan al final.
  const todasLasFilas: Fila[] = useMemo(() => {
    const filas = eventos
      .filter(e => !e.eventoInicio || e.eventoInicio >= CORTE_ADMINISTRACION)
      .flatMap(e => e.proyectos.map(p => ({
        evento: e, proyecto: p, cliente: clientePorId(p.clienteId), registro: registroDe(p.id),
      })))
    return filas.sort((a, b) => {
      if (!a.evento.eventoInicio && !b.evento.eventoInicio) return 0
      if (!a.evento.eventoInicio) return 1
      if (!b.evento.eventoInicio) return -1
      return a.evento.eventoInicio < b.evento.eventoInicio ? -1 : a.evento.eventoInicio > b.evento.eventoInicio ? 1 : 0
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, clientes, registrosAdmin])

  const hayFiltrosActivos = filtros.clienteId !== '' || filtros.concepto.trim() !== '' || filtros.fechaDesde !== '' ||
    filtros.fechaHasta !== '' || filtros.estados.length > 0 || filtros.facturacion.length > 0

  const filtradas = todasLasFilas.filter(({ evento, proyecto, cliente, registro }) => {
    if (filtros.clienteId && cliente?.id !== filtros.clienteId) return false
    if (filtros.concepto.trim() && !(registro?.concepto || '').toLowerCase().includes(filtros.concepto.trim().toLowerCase())) return false
    if (filtros.fechaDesde && (!evento.eventoInicio || evento.eventoInicio < filtros.fechaDesde)) return false
    if (filtros.fechaHasta && (!evento.eventoInicio || evento.eventoInicio > filtros.fechaHasta)) return false
    const estado = estadoPagoAdmin(registro?.pagos || [], proyecto.importe)
    if (filtros.estados.length > 0 && !filtros.estados.includes(estado)) return false
    if (filtros.facturacion.length > 0) {
      const facturado = Boolean(registro?.facturado)
      const match = (facturado && filtros.facturacion.includes('facturado')) ||
        (!facturado && filtros.facturacion.includes('sin_facturar'))
      if (!match) return false
    }
    return true
  })

  const totales = useMemo(() => {
    const total = filtradas.reduce((s, f) => s + f.proyecto.importe, 0)
    const cobrado = filtradas.reduce((s, f) => s + Math.min(montoPagadoAdmin(f.registro?.pagos || []), f.proyecto.importe), 0)
    return { total, cobrado, pendiente: total - cobrado, cantidad: filtradas.length }
  }, [filtradas])

  const abrir = (evento: Evento, proyecto: Proyecto) => setSeleccion(s => s?.proyecto.id === proyecto.id ? null : { evento, proyecto })

  // El early-return de permisos va después de todos los hooks: si estuviera
  // antes, un usuario sin acceso vería un orden de hooks distinto al de un
  // admin en el próximo render (viola las reglas de hooks).
  if (currentUser?.rol !== 'admin' && currentUser?.rol !== 'administrativo') return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-gray-100">Administración</h1>
        </div>
        <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5">
          <button
            onClick={() => setVista('planilla')}
            title="Vista planilla"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${vista === 'planilla' ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <List size={14} /> Planilla
          </button>
          <button
            onClick={() => setVista('clientes')}
            title="Vista por clientes"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${vista === 'clientes' ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutGrid size={14} /> Clientes
          </button>
        </div>
      </div>

      {/* Métricas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-lg font-bold text-gray-100 tabular-nums">{formatCurrency(totales.total)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Cobrado</p>
          <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(totales.cobrado)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Pendiente</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">{formatCurrency(totales.pendiente)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Proyectos</p>
          <p className="text-lg font-bold text-gray-200 tabular-nums">{totales.cantidad}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-admin-cliente" className="text-xs text-gray-500">Cliente</label>
            <select
              id="filtro-admin-cliente"
              value={filtros.clienteId}
              onChange={e => setFiltros(f => ({ ...f, clienteId: e.target.value }))}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-black"
            >
              <option value="">Todos los clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-admin-concepto" className="text-xs text-gray-500">Concepto contiene</label>
            <input
              id="filtro-admin-concepto"
              value={filtros.concepto}
              onChange={e => setFiltros(f => ({ ...f, concepto: e.target.value }))}
              placeholder="Buscar..."
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-admin-desde" className="text-xs text-gray-500">Desde</label>
            <input
              id="filtro-admin-desde" type="date"
              min={CORTE_ADMINISTRACION}
              value={filtros.fechaDesde}
              onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-admin-hasta" className="text-xs text-gray-500">Hasta</label>
            <input
              id="filtro-admin-hasta" type="date"
              value={filtros.fechaHasta}
              onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Por estado</span>
          {ESTADOS_PAGO.map(estado => {
            const activo = filtros.estados.includes(estado)
            const cols = ESTADO_PAGO_ADMIN_COLORS[estado]
            return (
              <label key={estado} className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={e => setFiltros(f => ({
                    ...f,
                    estados: e.target.checked ? [...f.estados, estado] : f.estados.filter(x => x !== estado),
                  }))}
                  className="accent-brand-500 cursor-pointer"
                />
                <span className={`inline-flex items-center gap-1.5 ${activo ? cols.text : ''}`}>
                  <span className={`w-2 h-2 rounded-full ${cols.dot}`} />
                  {estado}
                </span>
              </label>
            )
          })}

          <span className="w-px h-4 bg-[var(--border)]" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">Facturación</span>
          {FACTURACION_OPTS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.facturacion.includes(value)}
                onChange={e => setFiltros(f => ({
                  ...f,
                  facturacion: e.target.checked ? [...f.facturacion, value] : f.facturacion.filter(x => x !== value),
                }))}
                className="accent-brand-500 cursor-pointer"
              />
              {label}
            </label>
          ))}

          {hayFiltrosActivos && (
            <button onClick={() => setFiltros(FILTROS_VACIOS)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-400 cursor-pointer transition-colors ml-auto">
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {vista === 'planilla' ? (
        <PlanillaView filas={filtradas} seleccion={seleccion} onSelect={abrir} getOrCreateRegistroAdmin={getOrCreateRegistroAdmin} updateRegistroAdmin={updateRegistroAdmin} hayFiltrosActivos={hayFiltrosActivos} onLimpiar={() => setFiltros(FILTROS_VACIOS)} />
      ) : (
        <ClientesView filas={filtradas} seleccion={seleccion} onSelect={abrir} hayFiltrosActivos={hayFiltrosActivos} onLimpiar={() => setFiltros(FILTROS_VACIOS)} />
      )}

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

// ─── Vista planilla ───────────────────────────────────────────────────────────

function PlanillaView({ filas, seleccion, onSelect, getOrCreateRegistroAdmin, updateRegistroAdmin, hayFiltrosActivos, onLimpiar }: {
  filas: Fila[]
  seleccion: Seleccion
  onSelect: (evento: Evento, proyecto: Proyecto) => void
  getOrCreateRegistroAdmin: (proyectoId: string) => string
  updateRegistroAdmin: (id: string, data: Partial<Omit<RegistroAdmin, 'id' | 'proyectoId'>>) => void
  hayFiltrosActivos: boolean
  onLimpiar: () => void
}) {
  const usuarios = useAppStore(s => s.usuarios)
  const responsableNombre = (id?: string) => {
    if (!id) return '—'
    const u = usuarios.find(x => x.id === id)
    return u ? (u.displayName || u.username) : '—'
  }

  if (filas.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-12 text-center text-gray-500 text-sm">
        Ningún proyecto coincide con los filtros aplicados.
        {hayFiltrosActivos && <> <button onClick={onLimpiar} className="text-brand-400 hover:text-brand-300 cursor-pointer underline">Limpiar filtros</button></>}
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-[var(--surface-2)]">
              <Th>Evento</Th>
              <Th>Cliente</Th>
              <Th>Stand</Th>
              <Th>Fecha</Th>
              <Th>Responsable</Th>
              <Th align="right">Monto</Th>
              <Th>Concepto</Th>
              <Th align="center">Estado</Th>
              <Th align="center">Facturado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-s)]">
            {filas.map(({ evento, proyecto, cliente, registro }) => (
              <FilaAdministracion
                key={proyecto.id}
                evento={evento}
                proyecto={proyecto}
                cliente={cliente}
                registro={registro}
                responsableNombre={responsableNombre(proyecto.responsableId)}
                selected={seleccion?.proyecto.id === proyecto.id}
                onSelect={() => onSelect(evento, proyecto)}
                getOrCreateRegistroAdmin={getOrCreateRegistroAdmin}
                updateRegistroAdmin={updateRegistroAdmin}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={`px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-[var(--border)] ${
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    }`}>
      {children}
    </th>
  )
}

function EstadoPagoBadge({ pagos, importe }: { pagos: PagoAdmin[]; importe: number }) {
  const estado = estadoPagoAdmin(pagos, importe)
  const cols = ESTADO_PAGO_ADMIN_COLORS[estado]
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cols.bg} ${cols.text}`}>{estado}</span>
}

function FilaAdministracion({ evento, proyecto, cliente, registro, responsableNombre, selected, onSelect, getOrCreateRegistroAdmin, updateRegistroAdmin }: {
  evento: Pick<Evento, 'id' | 'titulo' | 'eventoInicio'>
  proyecto: Pick<Proyecto, 'id' | 'importe' | 'nombreStand'>
  cliente?: Cliente
  registro?: RegistroAdmin
  responsableNombre: string
  selected: boolean
  onSelect: () => void
  getOrCreateRegistroAdmin: (proyectoId: string) => string
  updateRegistroAdmin: (id: string, data: Partial<Omit<RegistroAdmin, 'id' | 'proyectoId'>>) => void
}) {
  const [concepto, setConcepto] = useState(registro?.concepto || '')
  // Ajuste de estado durante el render (no en un efecto): si el concepto
  // guardado cambió desde afuera, resincroniza el input antes de pintar.
  const [conceptoSincronizado, setConceptoSincronizado] = useState(registro?.concepto)
  if (registro?.concepto !== conceptoSincronizado) {
    setConceptoSincronizado(registro?.concepto)
    setConcepto(registro?.concepto || '')
  }

  const [nroFactura, setNroFactura] = useState(registro?.nroFactura || '')
  const [nroFacturaSincronizado, setNroFacturaSincronizado] = useState(registro?.nroFactura)
  if (registro?.nroFactura !== nroFacturaSincronizado) {
    setNroFacturaSincronizado(registro?.nroFactura)
    setNroFactura(registro?.nroFactura || '')
  }

  const ensureId = () => registro?.id || getOrCreateRegistroAdmin(proyecto.id)

  const handleConceptoBlur = () => {
    if (concepto === (registro?.concepto || '')) return
    updateRegistroAdmin(ensureId(), { concepto })
  }

  const handleNroFacturaBlur = () => {
    if (nroFactura === (registro?.nroFactura || '')) return
    updateRegistroAdmin(ensureId(), { nroFactura })
  }

  return (
    <tr onClick={onSelect} className={`cursor-pointer transition-colors ${selected ? 'bg-brand-500/10' : 'hover:bg-[var(--surface-h)]'}`}>
      <td className="px-4 py-3 text-sm font-medium text-gray-200">{evento.titulo}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{cliente?.nombre || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{proyecto.nombreStand || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(evento.eventoInicio)}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{responsableNombre}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-300 text-right tabular-nums">{formatCurrency(proyecto.importe)}</td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <input
          value={concepto}
          onChange={e => setConcepto(e.target.value)}
          onBlur={handleConceptoBlur}
          placeholder="Concepto de factura..."
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
        />
      </td>
      <td className="px-4 py-3 text-center"><EstadoPagoBadge pagos={registro?.pagos || []} importe={proyecto.importe} /></td>
      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-1.5">
          <input
            type="checkbox"
            checked={registro?.facturado || false}
            onChange={e => updateRegistroAdmin(ensureId(), { facturado: e.target.checked })}
            className="w-4 h-4 accent-brand-500 cursor-pointer"
          />
          {registro?.facturado && (
            <input
              value={nroFactura}
              onChange={e => setNroFactura(e.target.value)}
              onBlur={handleNroFacturaBlur}
              placeholder="N° factura"
              className="w-28 bg-[var(--bg)] border border-[var(--border)] rounded px-1.5 py-1 text-xs text-gray-200 placeholder:text-gray-600 text-center focus:border-brand-500/50 focus:outline-none transition-all"
            />
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Vista por clientes ───────────────────────────────────────────────────────

function ClientesView({ filas, seleccion, onSelect, hayFiltrosActivos, onLimpiar }: {
  filas: Fila[]
  seleccion: Seleccion
  onSelect: (evento: Evento, proyecto: Proyecto) => void
  hayFiltrosActivos: boolean
  onLimpiar: () => void
}) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const toggle = (clienteId: string) => setAbiertos(prev => {
    const next = new Set(prev)
    if (next.has(clienteId)) next.delete(clienteId)
    else next.add(clienteId)
    return next
  })

  // Agrupa preservando el orden cronológico ya aplicado en `filas` — la
  // tarjeta de cada cliente queda ubicada según su evento más próximo.
  const grupos = useMemo(() => {
    const porCliente = new Map<string, { cliente?: Cliente; filas: Fila[] }>()
    for (const f of filas) {
      // Agrupa por el id real del cliente ya resuelto (f.cliente), no por el
      // clienteId crudo del proyecto — así dos proyectos con distinta
      // mayúscula en el mismo cliente legado no terminan en tarjetas separadas.
      const key = f.cliente?.id || '—sin-cliente—'
      if (!porCliente.has(key)) porCliente.set(key, { cliente: f.cliente, filas: [] })
      porCliente.get(key)!.filas.push(f)
    }
    return [...porCliente.entries()].map(([clienteId, g]) => ({ clienteId, ...g }))
  }, [filas])

  if (grupos.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-12 text-center text-gray-500 text-sm">
        Ningún cliente coincide con los filtros aplicados.
        {hayFiltrosActivos && <> <button onClick={onLimpiar} className="text-brand-400 hover:text-brand-300 cursor-pointer underline">Limpiar filtros</button></>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {grupos.map(({ clienteId, cliente, filas: filasCliente }) => (
        <ClienteCard
          key={clienteId}
          cliente={cliente}
          filas={filasCliente}
          open={abiertos.has(clienteId)}
          onToggle={() => toggle(clienteId)}
          seleccion={seleccion}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function ClienteCard({ cliente, filas, open, onToggle, seleccion, onSelect }: {
  cliente?: Cliente
  filas: Fila[]
  open: boolean
  onToggle: () => void
  seleccion: Seleccion
  onSelect: (evento: Evento, proyecto: Proyecto) => void
}) {
  const total = filas.reduce((s, f) => s + f.proyecto.importe, 0)
  const cobrado = filas.reduce((s, f) => s + Math.min(montoPagadoAdmin(f.registro?.pagos || []), f.proyecto.importe), 0)
  const pendiente = total - cobrado
  const proximaFecha = filas.find(f => f.evento.eventoInicio)?.evento.eventoInicio

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-[var(--surface-h)] transition-colors cursor-pointer text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-400">{(cliente?.nombre || '—').slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-200 text-sm truncate">{cliente?.nombre || '— Sin cliente —'}</p>
          <p className="text-xs text-gray-600">{filas.length} evento{filas.length !== 1 ? 's' : ''}{proximaFecha ? ` · próximo ${formatDate(proximaFecha)}` : ''}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-500">Cobrado</p>
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">{formatCurrency(cobrado)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Pendiente</p>
            <p className="text-sm font-semibold text-red-400 tabular-nums">{formatCurrency(pendiente)}</p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-[var(--border)] divide-y divide-[var(--border-s)]">
          {filas.map(({ evento, proyecto, registro }) => {
            const activo = seleccion?.proyecto.id === proyecto.id
            return (
              <button
                key={proyecto.id}
                onClick={() => onSelect(evento, proyecto)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors ${activo ? 'bg-brand-500/10' : 'hover:bg-[var(--surface-h)]'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-200 truncate">{evento.titulo}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(evento.eventoInicio)}
                    {proyecto.nombreStand && <span className="text-gray-400"> · Stand: {proyecto.nombreStand}</span>}
                  </p>
                </div>
                <span className="text-sm text-gray-300 tabular-nums shrink-0">{formatCurrency(proyecto.importe)}</span>
                <div className="shrink-0"><EstadoPagoBadge pagos={registro?.pagos || []} importe={proyecto.importe} /></div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Panel de detalle + pagos ─────────────────────────────────────────────────

function ProyectoDetailPanel({ evento, proyecto, cliente, usuarios, registro, getOrCreateRegistroAdmin, updateRegistroAdmin, onClose }: {
  evento: Evento
  proyecto: Proyecto
  cliente?: Cliente
  usuarios: Usuario[]
  registro?: RegistroAdmin
  getOrCreateRegistroAdmin: (proyectoId: string) => string
  updateRegistroAdmin: (id: string, data: Partial<Omit<RegistroAdmin, 'id' | 'proyectoId'>>) => void
  onClose: () => void
}) {
  const [concepto, setConcepto] = useState(registro?.concepto || '')
  const [nroFactura, setNroFactura] = useState(registro?.nroFactura || '')
  const [pagos, setPagos] = useState<PagoAdmin[]>(registro?.pagos || [])
  // Borrador del próximo pago a registrar — no se guarda nada hasta tocar
  // "Confirmar pago", así se pueden cargar varios pagos seguidos sin que
  // cada tecleo dispare un guardado a mitad de completar el formulario.
  const [draft, setDraft] = useState<{ formaPago?: MedioPago; monto: number; fecha?: string }>({ monto: 0 })
  // Edición de un pago ya registrado: se abre a pedido (no autoguarda cada
  // tecleo) — mismo criterio que el borrador de pago nuevo, con su propio
  // "Guardar cambios" / "Cancelar".
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<PagoAdmin | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Ajuste de estado durante el render (no en un efecto). Cada campo se
  // resincroniza solo cuando SU propio valor guardado cambia — comparar el
  // registro completo haría que confirmar un pago (que crea un nuevo objeto
  // registro) pisara texto de concepto todavía sin confirmar (onBlur).
  const [conceptoSincronizado, setConceptoSincronizado] = useState(registro?.concepto)
  if (registro?.concepto !== conceptoSincronizado) {
    setConceptoSincronizado(registro?.concepto)
    setConcepto(registro?.concepto || '')
  }
  const [nroFacturaSincronizado, setNroFacturaSincronizado] = useState(registro?.nroFactura)
  if (registro?.nroFactura !== nroFacturaSincronizado) {
    setNroFacturaSincronizado(registro?.nroFactura)
    setNroFactura(registro?.nroFactura || '')
  }
  const [pagosSincronizados, setPagosSincronizados] = useState(registro?.pagos)
  if (registro?.pagos !== pagosSincronizados) {
    setPagosSincronizados(registro?.pagos)
    setPagos(registro?.pagos || [])
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const ensureId = () => registro?.id || getOrCreateRegistroAdmin(proyecto.id)

  const handleConceptoBlur = () => {
    if (concepto === (registro?.concepto || '')) return
    updateRegistroAdmin(ensureId(), { concepto })
  }

  const handleNroFacturaBlur = () => {
    if (nroFactura === (registro?.nroFactura || '')) return
    updateRegistroAdmin(ensureId(), { nroFactura })
  }

  const commitPagos = (next: PagoAdmin[]) => { setPagos(next); updateRegistroAdmin(ensureId(), { pagos: next }) }
  const eliminarPago = (id: string) => {
    commitPagos(pagos.filter(p => p.id !== id))
    if (editandoId === id) { setEditandoId(null); setEditDraft(null) }
  }

  const confirmarPagoDraft = () => {
    if (draft.monto <= 0) return
    commitPagos([...pagos, { id: genId(), ...draft }])
    setDraft({ monto: 0 })
  }

  const iniciarEdicionPago = (p: PagoAdmin) => { setEditandoId(p.id); setEditDraft(p) }
  const cancelarEdicionPago = () => { setEditandoId(null); setEditDraft(null) }
  const guardarEdicionPago = () => {
    if (!editDraft) return
    commitPagos(pagos.map(p => p.id === editDraft.id ? editDraft : p))
    setEditandoId(null)
    setEditDraft(null)
  }

  const responsable = usuarios.find(u => u.id === proyecto.responsableId)
  const tareasDone = proyecto.tareas.filter(t => t.completada).length
  const renders = proyecto.renders || []

  const totalPagado = montoPagadoAdmin(pagos)
  const saldoPendiente = Math.max(0, proyecto.importe - totalPagado)
  const estado = estadoPagoAdmin(pagos, proyecto.importe)
  const estadoCols = ESTADO_PAGO_ADMIN_COLORS[estado]

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto w-full max-w-sm bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)] shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Evento</p>
            <h2 className="text-base font-bold text-gray-100 leading-snug mb-2">{evento.titulo}</h2>
            <div className="text-xs text-gray-500"><ClienteInfo cliente={cliente} /></div>
            {proyecto.nombreStand && (
              <p className="text-xs text-gray-400 mt-1">
                <span className="text-gray-500">Stand:</span> {proyecto.nombreStand}
              </p>
            )}
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
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Administración</p>
              <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={registro?.facturado || false}
                  onChange={e => updateRegistroAdmin(ensureId(), { facturado: e.target.checked })}
                  className="w-4 h-4 accent-brand-500 cursor-pointer"
                />
                <span className="text-xs text-gray-400">Facturado</span>
              </label>
            </div>

            {registro?.facturado && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500">N° de factura</label>
                <input
                  value={nroFactura}
                  onChange={e => setNroFactura(e.target.value)}
                  onBlur={handleNroFacturaBlur}
                  placeholder="Ej: 0001-00001234"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">Concepto (factura)</label>
              <input
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                onBlur={handleConceptoBlur}
                placeholder="Concepto..."
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Pagos parciales */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Pagos</label>

              {pagos.length === 0 ? (
                <p className="text-xs text-gray-600 italic">Sin pagos registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {pagos.map(pago => editandoId === pago.id && editDraft ? (
                    // Edición: mismo formato que el borrador de pago nuevo, con
                    // guardar/cancelar explícitos — no autoguarda por tecleo.
                    <div key={pago.id} className="bg-[var(--bg)] border border-brand-500/40 rounded-lg p-2.5 space-y-2" onClick={e => e.stopPropagation()}>
                      <select
                        value={editDraft.formaPago || ''}
                        onChange={e => setEditDraft(d => d && ({ ...d, formaPago: (e.target.value || undefined) as MedioPago | undefined }))}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-black"
                      >
                        <option value="">— Forma de pago —</option>
                        {MEDIOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="flex items-center gap-1.5">
                        <MontoInput
                          value={editDraft.monto}
                          onChange={n => setEditDraft(d => d && ({ ...d, monto: n }))}
                          ariaLabel="Monto del pago"
                          placeholder="Monto"
                          blankWhenZero
                          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-200 text-right focus:border-brand-500/50 transition-all"
                        />
                        <input
                          type="date"
                          value={editDraft.fecha || ''}
                          onChange={e => setEditDraft(d => d && ({ ...d, fecha: e.target.value || undefined }))}
                          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={cancelarEdicionPago} className="flex-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-[var(--surface-2)] rounded-lg transition-colors cursor-pointer">
                          Cancelar
                        </button>
                        <button onClick={guardarEdicionPago} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                          <Check size={12} /> Guardar cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Vista: el pago ya registrado se lista como un dato fijo,
                    // no como un formulario en curso — editar es una acción aparte.
                    <div key={pago.id} className="flex items-center gap-2 bg-[var(--bg)]/60 border border-[var(--border-s)] rounded-lg px-3 py-2" onClick={e => e.stopPropagation()}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-200 truncate">{pago.formaPago || '— Sin forma —'}</p>
                        <p className="text-xs text-gray-600">{pago.fecha ? formatDate(pago.fecha) : 'Sin fecha'}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400 tabular-nums shrink-0">{formatCurrency(pago.monto)}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => iniciarEdicionPago(pago)} className="p-1.5 text-gray-600 hover:text-brand-400 cursor-pointer transition-colors" title="Editar pago">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => eliminarPago(pago.id)} className="p-1.5 text-gray-600 hover:text-red-400 cursor-pointer transition-colors" title="Eliminar pago">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Borrador del próximo pago — no se guarda nada hasta "Confirmar pago" */}
              <div className="bg-[var(--bg)] border border-dashed border-[var(--border-h)] rounded-lg p-2.5 space-y-2" onClick={e => e.stopPropagation()}>
                <select
                  value={draft.formaPago || ''}
                  onChange={e => setDraft(d => ({ ...d, formaPago: (e.target.value || undefined) as MedioPago | undefined }))}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-black"
                >
                  <option value="">— Forma de pago —</option>
                  {MEDIOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex items-center gap-1.5">
                  <MontoInput
                    value={draft.monto}
                    onChange={n => setDraft(d => ({ ...d, monto: n }))}
                    ariaLabel="Monto del nuevo pago"
                    placeholder="Monto"
                    blankWhenZero
                    className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-200 text-right focus:border-brand-500/50 transition-all"
                  />
                  <input
                    type="date"
                    value={draft.fecha || ''}
                    onChange={e => setDraft(d => ({ ...d, fecha: e.target.value || undefined }))}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none"
                  />
                </div>
                <button
                  onClick={confirmarPagoDraft}
                  disabled={draft.monto <= 0}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={13} /> Confirmar pago
                </button>
              </div>

              {/* Resumen de cobro */}
              <div className="pt-2 mt-2 border-t border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Cobrado</span>
                  <span className="text-emerald-400 font-medium tabular-nums">{formatCurrency(totalPagado)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Saldo pendiente</span>
                  <span className="text-red-400 font-medium tabular-nums">{formatCurrency(saldoPendiente)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">Estado</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoCols.bg} ${estadoCols.text}`}>{estado}</span>
                </div>
              </div>
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
