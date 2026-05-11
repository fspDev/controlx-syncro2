import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, TRABAJO_ESTADO_COLORS, ESTADOS_TRABAJO, MEDIOS_PAGO } from '@/lib/utils'
import type { TrabajoExterno, TrabajoEstado, MedioPago } from '@/types'
import { Plus, Edit2, Trash2, CheckSquare } from 'lucide-react'

type FormData = Omit<TrabajoExterno, 'id' | 'createdAt' | 'updatedAt'>

const EMPTY: FormData = {
  titulo: '', descripcion: '', clienteNombre: '', contacto: '',
  clienteAportaMaterial: false, fechaEntrega: '', precioVenta: 0,
  montoCobrado: 0, medioPago: 'Efectivo', estado: 'Pendiente', notas: ''
}

export function TrabajosPage() {
  const { trabajos, addTrabajo, updateTrabajo, deleteTrabajo } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<TrabajoEstado | ''>('')
  const [form, setForm] = useState<FormData>(EMPTY)

  const filtered = trabajos.filter(t => !filterEstado || t.estado === filterEstado)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalFacturado = trabajos.reduce((s, t) => s + t.precioVenta, 0)
  const totalCobrado = trabajos.reduce((s, t) => s + t.montoCobrado, 0)
  const porCobrar = totalFacturado - totalCobrado

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (t: TrabajoExterno) => {
    setForm({ titulo: t.titulo, descripcion: t.descripcion||'', clienteNombre: t.clienteNombre, contacto: t.contacto||'', clienteAportaMaterial: t.clienteAportaMaterial, fechaEntrega: t.fechaEntrega||'', precioVenta: t.precioVenta, montoCobrado: t.montoCobrado, medioPago: t.medioPago, estado: t.estado, notas: t.notas||'' })
    setEditId(t.id); setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) return
    if (editId) updateTrabajo(editId, form)
    else addTrabajo(form)
    setShowForm(false)
  }

  const set = (k: keyof FormData, v: string | number | boolean) => setForm(prev => ({ ...prev, [k]: v }))

  const estadoOpts = [{ value: '', label: 'Todos' }, ...ESTADOS_TRABAJO.map(e => ({ value: e, label: e }))]
  const trabajoEstadoOpts = ESTADOS_TRABAJO.map(e => ({ value: e, label: e }))
  const medioPagoOpts = MEDIOS_PAGO.map(m => ({ value: m, label: m }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Trabajos Externos</h1>
        <Button variant="primary" onClick={openNew}><Plus size={15} />Nuevo Trabajo</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total facturado', value: formatCurrency(totalFacturado), color: 'text-gray-200' },
          { label: 'Total cobrado', value: formatCurrency(totalCobrado), color: 'text-emerald-400' },
          { label: 'Por cobrar', value: formatCurrency(porCobrar), color: porCobrar > 0 ? 'text-amber-400' : 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value as TrabajoEstado | '')}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none cursor-pointer"
        >
          {estadoOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-600 ml-auto">{filtered.length} trabajo{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Trabajo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Fecha entrega</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Cobrado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-s)]">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                <CheckSquare size={28} className="mx-auto mb-2 opacity-30" />
                No hay trabajos
              </td></tr>
            ) : filtered.map(t => {
              const cols = TRABAJO_ESTADO_COLORS[t.estado]
              return (
                <tr key={t.id} className="hover:bg-[var(--surface-h)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-200">{t.titulo}</p>
                    {t.clienteAportaMaterial && <span className="text-xs text-blue-400">Mat. cliente</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-400">{t.clienteNombre}</p>
                    {t.contacto && <p className="text-xs text-gray-600">{t.contacto}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{formatDate(t.fechaEntrega)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-300">{formatCurrency(t.precioVenta)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">
                    {formatCurrency(t.montoCobrado)}
                    <span className="text-xs text-gray-600 ml-1">({t.medioPago})</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${cols.bg} ${cols.text}`}>{t.estado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-all"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Form */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Trabajo' : 'Nuevo Trabajo Externo'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Trabajo / Título *" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Corte láser para stand" required />
          <Textarea label="Descripción" value={form.descripcion||''} onChange={e => set('descripcion', e.target.value)} placeholder="Detalles técnicos, materiales, medidas..." rows={2} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="mat" checked={form.clienteAportaMaterial} onChange={e => set('clienteAportaMaterial', e.target.checked)} className="accent-brand-500 cursor-pointer" />
            <label htmlFor="mat" className="text-sm text-gray-400 cursor-pointer">El cliente aporta el material</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cliente" value={form.clienteNombre} onChange={e => set('clienteNombre', e.target.value)} placeholder="Nombre del cliente" />
            <Input label="Contacto" value={form.contacto||''} onChange={e => set('contacto', e.target.value)} placeholder="Nombre del contacto" />
          </div>
          <Input label="Fecha de Entrega" type="date" value={form.fechaEntrega||''} onChange={e => set('fechaEntrega', e.target.value)} />
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Económico</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Precio Venta ($)" type="number" value={form.precioVenta} onChange={e => set('precioVenta', parseFloat(e.target.value)||0)} min={0} />
              <Input label="Monto Cobrado ($)" type="number" value={form.montoCobrado} onChange={e => set('montoCobrado', parseFloat(e.target.value)||0)} min={0} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Medio de Pago" value={form.medioPago} onChange={e => set('medioPago', e.target.value as MedioPago)} options={medioPagoOpts} />
              <Select label="Estado" value={form.estado} onChange={e => set('estado', e.target.value as TrabajoEstado)} options={trabajoEstadoOpts} />
            </div>
          </div>
          <Textarea label="Notas" value={form.notas||''} onChange={e => set('notas', e.target.value)} placeholder="Notas adicionales..." rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">{editId ? 'Guardar' : 'Crear Trabajo'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteTrabajo(deleteId) }}
        title="Eliminar trabajo"
        message={`¿Eliminar el trabajo "${trabajos.find(t => t.id === deleteId)?.titulo}"?`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
