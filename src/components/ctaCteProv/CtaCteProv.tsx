import { useState } from 'react'
import { cn, formatMontoProv, soloDigitos, montoDesdeDigitos, formatCurrency } from '@/lib/utils'
import { FORMAS_PAGO_PROV } from '@/types'
import type { FormaPagoProv, Proveedor } from '@/types'
import { Plus, X, Loader2, AlertCircle } from 'lucide-react'
import { useCtaCteProv, type EstadoFila, type MovimientoConSaldo } from './useCtaCteProv'

interface CtaCteProvProps {
  readOnly?: boolean
}

// Anchos fijos por columna — sin esto una descripción larga en "Servicio"
// ensancha su columna y desalinea la grilla respecto de las filas vecinas.
const COL_WIDTHS = {
  proveedor: 160, servicio: 240, formaPago: 150, fecha: 120,
  aPagar: 130, pagado: 130, saldo: 130, estado: 36,
}

const inputBase = 'w-full bg-transparent border border-transparent rounded px-2 py-1.5 text-sm text-gray-200 ' +
  'hover:border-[var(--border)] focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/20 ' +
  'motion-safe:transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

export function CtaCteProv({ readOnly = false }: CtaCteProvProps) {
  const {
    proveedores, proveedoresActivos, nombrePorProveedorId,
    loading, error,
    filasConSaldo, totales,
    filtros, setFiltros, hayFiltrosActivos, limpiarFiltros,
    proveedorFiltrado,
    estadoFilas,
    agregarProveedor, errorProveedor, setErrorProveedor,
    agregarFila, actualizarFila,
    hayMovimientos,
  } = useCtaCteProv()

  const [nuevoProveedor, setNuevoProveedor] = useState('')
  const [agregandoProveedor, setAgregandoProveedor] = useState(false)

  const handleAgregarProveedor = async () => {
    setAgregandoProveedor(true)
    const ok = await agregarProveedor(nuevoProveedor)
    setAgregandoProveedor(false)
    if (ok) setNuevoProveedor('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> Cargando cuenta corriente...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        <AlertCircle size={15} className="shrink-0" /> {error}
      </div>
    )
  }

  const saldoLabel = proveedorFiltrado ? `Saldo con ${proveedorFiltrado.nombre}` : 'Saldo'

  return (
    <div className="space-y-4">
      {/* Banner de contexto — el requisito más importante: qué significa "saldo" ahora mismo */}
      <div
        role="status"
        className={cn(
          'text-sm rounded-xl px-4 py-3 border',
          proveedorFiltrado
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
            : 'bg-blue-500/10 border-blue-500/25 text-blue-200'
        )}
      >
        {proveedorFiltrado ? (
          <>Mostrando la cuenta corriente con <strong>{proveedorFiltrado.nombre}</strong> — el saldo de abajo es lo que la empresa le debe a este proveedor puntual, no el saldo general de la empresa.</>
        ) : (
          <>Mostrando la cuenta corriente general de la empresa (todos los proveedores). Filtrá por proveedor para ver su cuenta individual.</>
        )}
      </div>

      {/* Métricas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">{formatCurrency(totales.aPagar)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total pagado</p>
          <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(totales.pagado)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{saldoLabel}</p>
          <p className="text-lg font-bold text-gray-200 tabular-nums">{formatCurrency(totales.saldo)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Movimientos</p>
          <p className="text-lg font-bold text-gray-200 tabular-nums">{totales.cantidad}</p>
        </div>
      </div>

      {/* Alta de proveedor */}
      {!readOnly && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                value={nuevoProveedor}
                onChange={e => { setNuevoProveedor(e.target.value); if (errorProveedor) setErrorProveedor(null) }}
                onKeyDown={e => e.key === 'Enter' && handleAgregarProveedor()}
                placeholder="Nombre del nuevo proveedor..."
                aria-label="Nombre del nuevo proveedor"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
              />
              {errorProveedor && <p className="text-xs text-red-400 mt-1.5">{errorProveedor}</p>}
            </div>
            <button
              onClick={handleAgregarProveedor}
              disabled={!nuevoProveedor.trim() || agregandoProveedor}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Plus size={14} /> Agregar proveedor
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-proveedor" className="text-xs text-gray-500">Proveedor</label>
          <select
            id="filtro-proveedor"
            value={filtros.proveedorId}
            onChange={e => setFiltros(f => ({ ...f, proveedorId: e.target.value }))}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{!p.activo ? ' (dado de baja)' : ''}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-servicio" className="text-xs text-gray-500">Servicio contiene</label>
          <input
            id="filtro-servicio"
            value={filtros.servicio}
            onChange={e => setFiltros(f => ({ ...f, servicio: e.target.value }))}
            placeholder="Buscar..."
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-forma-pago" className="text-xs text-gray-500">Forma de pago</label>
          <select
            id="filtro-forma-pago"
            value={filtros.formaPago}
            onChange={e => setFiltros(f => ({ ...f, formaPago: e.target.value as FormaPagoProv | '' }))}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="">Todas</option>
            {FORMAS_PAGO_PROV.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-desde" className="text-xs text-gray-500">Desde</label>
          <input
            id="filtro-desde" type="date"
            value={filtros.fechaDesde}
            onChange={e => setFiltros(f => ({ ...f, fechaDesde: e.target.value }))}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-hasta" className="text-xs text-gray-500">Hasta</label>
          <input
            id="filtro-hasta" type="date"
            value={filtros.fechaHasta}
            onChange={e => setFiltros(f => ({ ...f, fechaHasta: e.target.value }))}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer pb-1.5">
          <input type="checkbox" checked={filtros.soloAPagar} onChange={e => setFiltros(f => ({ ...f, soloAPagar: e.target.checked }))} className="accent-brand-500 cursor-pointer" />
          Solo "a pagar"
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer pb-1.5">
          <input type="checkbox" checked={filtros.soloPagado} onChange={e => setFiltros(f => ({ ...f, soloPagado: e.target.checked }))} className="accent-brand-500 cursor-pointer" />
          Solo "pagado"
        </label>

        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros} className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-400 cursor-pointer transition-colors pb-1.5 ml-auto">
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Grilla */}
      {!hayMovimientos ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-12 text-center text-gray-500 text-sm">
          Todavía no hay movimientos.{!readOnly && ' Agregá el primero con el botón de abajo.'}
        </div>
      ) : filasConSaldo.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-12 text-center text-gray-500 text-sm">
          Ningún movimiento coincide con los filtros aplicados.
          {hayFiltrosActivos && <> <button onClick={limpiarFiltros} className="text-brand-400 hover:text-brand-300 cursor-pointer underline">Limpiar filtros</button></>}
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="border-collapse" style={{ tableLayout: 'fixed', width: Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0) }}>
              <colgroup>
                {Object.values(COL_WIDTHS).map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
              <thead>
                <tr className="bg-[var(--surface-2)]">
                  <Th>Proveedor</Th>
                  <Th>Servicio</Th>
                  <Th>Forma de pago</Th>
                  <Th>Fecha</Th>
                  <Th align="right">A pagar</Th>
                  <Th align="right">Pagado</Th>
                  <Th align="right">Saldo</Th>
                  <Th align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-s)]">
                {filasConSaldo.map(mov => (
                  <Fila
                    key={mov.id}
                    mov={mov}
                    proveedores={proveedoresActivos}
                    nombrePorProveedorId={nombrePorProveedorId}
                    estado={estadoFilas[mov.id]}
                    readOnly={readOnly}
                    onChange={patch => actualizarFila(mov.id, patch)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--surface-2)] font-semibold border-t border-[var(--border)]">
                  <td className="sticky bottom-0 bg-[var(--surface-2)] px-2 py-2 text-xs text-gray-400" colSpan={4}>Totales</td>
                  <td className="sticky bottom-0 bg-[var(--surface-2)] px-2 py-2 text-sm text-red-400 text-right tabular-nums">{formatCurrency(totales.aPagar)}</td>
                  <td className="sticky bottom-0 bg-[var(--surface-2)] px-2 py-2 text-sm text-emerald-400 text-right tabular-nums">{formatCurrency(totales.pagado)}</td>
                  <td className="sticky bottom-0 bg-[var(--surface-2)] px-2 py-2 text-sm text-gray-100 text-right tabular-nums">{formatCurrency(totales.saldo)}</td>
                  <td className="sticky bottom-0 bg-[var(--surface-2)]" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!readOnly && (
        <button
          onClick={agregarFila}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] hover:bg-[var(--surface-h)] border border-[var(--border)] text-sm text-gray-300 font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={14} /> Agregar movimiento
        </button>
      )}
    </div>
  )
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'sticky top-0 bg-[var(--surface-2)] px-2 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-[var(--border)]',
        align === 'right' && 'text-right', align === 'center' && 'text-center', align === 'left' && 'text-left'
      )}
    >
      {children}
    </th>
  )
}

interface FilaProps {
  mov: MovimientoConSaldo
  proveedores: Proveedor[]
  nombrePorProveedorId: Map<string, string>
  estado?: EstadoFila
  readOnly: boolean
  onChange: (patch: Partial<Pick<MovimientoConSaldo, 'proveedorId' | 'servicio' | 'formaPago' | 'fecha' | 'aPagar' | 'pagado'>>) => void
}

function Fila({ mov, proveedores, nombrePorProveedorId, estado, readOnly, onChange }: FilaProps) {
  // Si el proveedor asignado a esta fila fue dado de baja, se sigue mostrando
  // en su propio select (aunque ya no aparezca para filas nuevas) para no
  // "perder" silenciosamente a quién pertenece un movimiento histórico.
  const proveedorActualInactivoNombre = !proveedores.some(p => p.id === mov.proveedorId)
    ? nombrePorProveedorId.get(mov.proveedorId)
    : undefined

  return (
    <tr className="odd:bg-[var(--bg)]/30 hover:bg-[var(--surface-h)] motion-safe:transition-colors">
      <td className="px-1 py-0.5">
        <select
          value={mov.proveedorId}
          onChange={e => onChange({ proveedorId: e.target.value })}
          disabled={readOnly}
          aria-label="Proveedor"
          className={cn(inputBase, 'cursor-pointer')}
        >
          <option value="">— Elegir —</option>
          {proveedorActualInactivoNombre && <option value={mov.proveedorId}>{proveedorActualInactivoNombre} (dado de baja)</option>}
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </td>
      <td className="px-1 py-0.5">
        <input
          value={mov.servicio}
          onChange={e => onChange({ servicio: e.target.value })}
          readOnly={readOnly}
          placeholder="Servicio prestado..."
          aria-label="Servicio"
          className={inputBase}
        />
      </td>
      <td className="px-1 py-0.5">
        <select
          value={mov.formaPago}
          onChange={e => onChange({ formaPago: e.target.value as FormaPagoProv | '' })}
          disabled={readOnly}
          aria-label="Forma de pago"
          className={cn(inputBase, 'cursor-pointer')}
        >
          <option value="">—</option>
          {FORMAS_PAGO_PROV.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </td>
      <td className="px-1 py-0.5">
        <input
          type="date"
          value={mov.fecha}
          onChange={e => onChange({ fecha: e.target.value })}
          disabled={readOnly}
          aria-label="Fecha"
          className={inputBase}
        />
      </td>
      <td className="px-1 py-0.5">
        <MontoInput value={mov.aPagar} onChange={n => onChange({ aPagar: n })} colorClass="text-red-400" ariaLabel="A pagar" readOnly={readOnly} />
      </td>
      <td className="px-1 py-0.5">
        <MontoInput value={mov.pagado} onChange={n => onChange({ pagado: n })} colorClass="text-emerald-400" ariaLabel="Pagado" readOnly={readOnly} />
      </td>
      <td className="px-2 py-1.5 text-right text-sm font-semibold text-gray-100 tabular-nums bg-[var(--surface-2)]/40">
        {formatCurrency(mov.saldo)}
      </td>
      <td className="px-1 py-0.5 text-center">
        <EstadoDot estado={estado} />
      </td>
    </tr>
  )
}

function MontoInput({ value, onChange, colorClass, ariaLabel, readOnly }: {
  value: number
  onChange: (n: number) => void
  colorClass: string
  ariaLabel: string
  readOnly?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      readOnly={readOnly}
      value={focused ? raw : formatMontoProv(value)}
      onFocus={e => { setFocused(true); setRaw(value ? String(value) : ''); e.target.select() }}
      onChange={e => {
        if (readOnly) return
        const digits = soloDigitos(e.target.value)
        setRaw(digits)
        onChange(montoDesdeDigitos(digits))
      }}
      onBlur={() => setFocused(false)}
      placeholder="—"
      className={cn(inputBase, 'text-right tabular-nums font-medium', colorClass)}
    />
  )
}

function EstadoDot({ estado }: { estado?: EstadoFila }) {
  if (!estado) return <span className="inline-block w-1.5 h-1.5" />
  const color = estado === 'guardando' ? 'bg-amber-400' : estado === 'guardado' ? 'bg-emerald-400' : 'bg-red-400'
  const label = estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? 'Guardado' : 'Error al guardar'
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn('inline-block w-1.5 h-1.5 rounded-full motion-safe:transition-colors', color)}
    />
  )
}
