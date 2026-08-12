import { useState } from 'react'
import { cn, formatMontoProv, formatMiles, soloDigitos, montoDesdeDigitos, formatCurrency, formatFechaISO } from '@/lib/utils'
import { FORMAS_PAGO_PROV } from '@/types'
import type { FormaPagoProv, Proveedor } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Plus, X, Loader2, AlertCircle, Wallet, Trash2 } from 'lucide-react'
import { useCtaCteProv, type EstadoFila, type MovimientoConSaldo } from './useCtaCteProv'

interface CtaCteProvProps {
  readOnly?: boolean
}

// Anchos fijos por columna — sin esto una descripción larga en "Servicio"
// ensancha su columna y desalinea la grilla respecto de las filas vecinas.
// "servicio" no tiene ancho propio a propósito: con table-layout fixed, la
// columna sin ancho especificado absorbe el espacio sobrante y la tabla
// ocupa el ancho completo del contenedor en vez de dejar un hueco a la derecha.
const COL_WIDTHS = {
  proveedor: 160, formaPago: 150, fecha: 120, creo: 120,
  aPagar: 130, pagado: 130, saldo: 130, estado: 64,
}
const COL_WIDTHS_TOTAL = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0)

const inputBase = 'w-full bg-transparent border border-transparent rounded px-2 py-1.5 text-sm text-gray-200 ' +
  'hover:border-[var(--border)] focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/20 ' +
  'motion-safe:transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
  // El menú desplegable nativo de <option> usa fondo blanco del sistema operativo;
  // sin esto hereda el texto gris claro del select y queda ilegible.
  '[&>option]:bg-white [&>option]:text-black'

export function CtaCteProv({ readOnly = false }: CtaCteProvProps) {
  const {
    proveedores, proveedoresActivos, nombrePorProveedorId,
    loading, error,
    filasConSaldo, totales, saldoAnterior, hayPeriodo,
    filtros, setFiltros, hayFiltrosActivos, limpiarFiltros,
    proveedorFiltrado,
    estadoFilas,
    agregarProveedor, errorProveedor, setErrorProveedor,
    agregarFila, actualizarFila, eliminarFila,
    hayMovimientos,
  } = useCtaCteProv()

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const usuarios = useAppStore(s => s.usuarios)
  const nombreCreador = (uid?: string) => {
    if (!uid) return '—'
    const u = usuarios.find(x => x.id === uid)
    return u ? (u.displayName || u.username) : '—'
  }

  const [nuevoProveedor, setNuevoProveedor] = useState('')
  const [agregandoProveedor, setAgregandoProveedor] = useState(false)
  const [showAltaProveedor, setShowAltaProveedor] = useState(false)

  const handleAgregarProveedor = async () => {
    setAgregandoProveedor(true)
    const ok = await agregarProveedor(nuevoProveedor)
    setAgregandoProveedor(false)
    if (ok) { setNuevoProveedor(''); setShowAltaProveedor(false) }
  }

  // Con un período activo el saldo mostrado es el "final" (arrastre + período).
  const saldoLabel = hayPeriodo
    ? (proveedorFiltrado ? `Saldo final con ${proveedorFiltrado.nombre}` : 'Saldo final')
    : (proveedorFiltrado ? `Saldo con ${proveedorFiltrado.nombre}` : 'Saldo')

  // Con un período activo mostramos la tabla aunque no haya movimientos dentro,
  // siempre que exista un saldo arrastrado desde antes (ej: "en julio no hubo
  // nada pero venís debiendo $X de junio").
  const mostrarTabla = filasConSaldo.length > 0 || (hayPeriodo && saldoAnterior !== 0)

  return (
    <div className="space-y-4">
      {/* Header: título + acciones al lado */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-gray-100">Cuenta Corriente de Proveedores</h1>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={agregarFila}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={15} /> Agregar movimiento
            </button>
            <button
              onClick={() => setShowAltaProveedor(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface)] hover:bg-[var(--surface-h)] border border-[var(--border)] text-sm text-gray-300 font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={15} /> Agregar proveedor
            </button>
          </div>
        )}
      </div>

      {/* Alta de proveedor — se despliega al tocar el botón del header */}
      {!readOnly && showAltaProveedor && (
        <div className="flex gap-2 items-start max-w-md">
          <div className="flex-1">
            <input
              autoFocus
              value={nuevoProveedor}
              onChange={e => { setNuevoProveedor(e.target.value); if (errorProveedor) setErrorProveedor(null) }}
              onKeyDown={e => e.key === 'Enter' && handleAgregarProveedor()}
              placeholder="Nombre del nuevo proveedor..."
              aria-label="Nombre del nuevo proveedor"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
            />
            {errorProveedor && <p className="text-xs text-red-400 mt-1.5">{errorProveedor}</p>}
          </div>
          <button
            onClick={handleAgregarProveedor}
            disabled={!nuevoProveedor.trim() || agregandoProveedor}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm gap-2">
          <Loader2 size={16} className="animate-spin" /> Cargando cuenta corriente...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      ) : (
        <>
      {/* Métricas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{hayPeriodo ? 'A pagar (período)' : 'Total a pagar'}</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">{formatCurrency(totales.aPagar)}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{hayPeriodo ? 'Pagado (período)' : 'Total pagado'}</p>
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

      {/* Filtros */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
        {/* Fila 1: campos */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-proveedor" className="text-xs text-gray-500">Proveedor</label>
            <select
              id="filtro-proveedor"
              value={filtros.proveedorId}
              onChange={e => setFiltros(f => ({ ...f, proveedorId: e.target.value }))}
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-black"
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
              className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer [&>option]:bg-white [&>option]:text-black"
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
        </div>

        {/* Fila 2: casillas + limpiar, siempre juntas en la línea de abajo */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
            <input type="checkbox" checked={filtros.soloAPagar} onChange={e => setFiltros(f => ({ ...f, soloAPagar: e.target.checked }))} className="accent-brand-500 cursor-pointer" />
            Solo "a pagar"
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
            <input type="checkbox" checked={filtros.soloPagado} onChange={e => setFiltros(f => ({ ...f, soloPagado: e.target.checked }))} className="accent-brand-500 cursor-pointer" />
            Solo "pagado"
          </label>

          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-400 cursor-pointer transition-colors ml-auto">
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grilla */}
      {!hayMovimientos ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-12 text-center text-gray-500 text-sm">
          Todavía no hay movimientos.{!readOnly && ' Agregá el primero con el botón de arriba.'}
        </div>
      ) : !mostrarTabla ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-12 text-center text-gray-500 text-sm">
          Ningún movimiento coincide con los filtros aplicados.
          {hayFiltrosActivos && <> <button onClick={limpiarFiltros} className="text-brand-400 hover:text-brand-300 cursor-pointer underline">Limpiar filtros</button></>}
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="border-collapse w-full" style={{ tableLayout: 'fixed', minWidth: COL_WIDTHS_TOTAL }}>
              <colgroup>
                <col style={{ width: COL_WIDTHS.proveedor }} />
                <col /* servicio: sin ancho fijo, absorbe el espacio sobrante */ />
                <col style={{ width: COL_WIDTHS.formaPago }} />
                <col style={{ width: COL_WIDTHS.fecha }} />
                <col style={{ width: COL_WIDTHS.creo }} />
                <col style={{ width: COL_WIDTHS.aPagar }} />
                <col style={{ width: COL_WIDTHS.pagado }} />
                <col style={{ width: COL_WIDTHS.saldo }} />
                <col style={{ width: COL_WIDTHS.estado }} />
              </colgroup>
              <thead>
                <tr className="bg-[var(--surface-2)]">
                  <Th>Proveedor</Th>
                  <Th>Servicio</Th>
                  <Th>Forma de pago</Th>
                  <Th>Fecha</Th>
                  <Th>Creó</Th>
                  <Th align="right">A pagar</Th>
                  <Th align="right">Pagado</Th>
                  <Th align="right">Saldo</Th>
                  <Th align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-s)]">
                {hayPeriodo && (
                  <tr className="bg-[var(--surface-2)]/50 border-b border-[var(--border)]">
                    <td colSpan={7} className="px-2 py-2 text-xs italic text-gray-400">
                      Saldo anterior al {formatFechaISO(filtros.fechaDesde)}
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-semibold text-gray-300 tabular-nums bg-[var(--surface-2)]/40">
                      {formatCurrency(saldoAnterior)}
                    </td>
                    <td />
                  </tr>
                )}
                {hayPeriodo && filasConSaldo.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-6 text-center text-xs text-gray-500">
                      No hubo movimientos en el período seleccionado.
                    </td>
                  </tr>
                )}
                {filasConSaldo.map(mov => (
                  <Fila
                    key={mov.id}
                    mov={mov}
                    proveedores={proveedoresActivos}
                    nombrePorProveedorId={nombrePorProveedorId}
                    creadorNombre={nombreCreador(mov.creadoPor)}
                    estado={estadoFilas[mov.id]}
                    readOnly={readOnly}
                    onChange={patch => actualizarFila(mov.id, patch)}
                    onDelete={() => setDeleteId(mov.id)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--surface-2)] font-semibold border-t border-[var(--border)]">
                  <td className="sticky bottom-0 bg-[var(--surface-2)] px-2 py-2 text-xs text-gray-400" colSpan={5}>Totales</td>
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
        </>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) eliminarFila(deleteId) }}
        title="Eliminar movimiento"
        message="¿Seguro que querés eliminar este movimiento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />
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
  creadorNombre: string
  estado?: EstadoFila
  readOnly: boolean
  onChange: (patch: Partial<Pick<MovimientoConSaldo, 'proveedorId' | 'servicio' | 'formaPago' | 'fecha' | 'aPagar' | 'pagado'>>) => void
  onDelete: () => void
}

function Fila({ mov, proveedores, nombrePorProveedorId, creadorNombre, estado, readOnly, onChange, onDelete }: FilaProps) {
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
      <td className="px-2 py-1.5 text-sm text-gray-400 truncate" title={creadorNombre}>
        {creadorNombre}
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
      <td className="px-1 py-0.5">
        <div className="flex items-center justify-center gap-1.5">
          <EstadoDot estado={estado} />
          {!readOnly && (
            <button
              onClick={onDelete}
              aria-label="Eliminar movimiento"
              title="Eliminar movimiento"
              className="text-gray-600 hover:text-red-400 cursor-pointer motion-safe:transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
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
      value={focused ? (raw ? formatMiles(Number(raw)) : '') : formatMontoProv(value)}
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
