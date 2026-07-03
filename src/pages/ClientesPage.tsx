import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Cliente } from '@/types'
import { Plus, Search, Building2, Phone, Mail, User, ChevronRight, Edit2, Trash2, LayoutGrid, List } from 'lucide-react'

type ClienteForm = Omit<Cliente, 'id' | 'createdAt'>
type ViewMode = 'grid' | 'list'

const EMPTY_FORM: ClienteForm = { nombre: '', cuit: '', direccion: '', telefono: '', email: '', contacto: '', notas: '' }

export function ClientesPage() {
  const { clientes, eventos, addCliente, updateCliente, deleteCliente } = useAppStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('grid')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<ClienteForm>(EMPTY_FORM)

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.contacto?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.cuit?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q)
    )
  }).sort((a, b) => a.nombre.localeCompare(b.nombre))

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }
  const openEdit = (c: Cliente) => {
    setForm({ nombre: c.nombre, cuit: c.cuit||'', direccion: c.direccion||'', telefono: c.telefono||'', email: c.email||'', contacto: c.contacto||'', notas: c.notas||'' })
    setEditId(c.id); setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    if (editId) { updateCliente(editId, form) } else { addCliente(form) }
    setShowForm(false)
  }

  const set = (k: keyof ClienteForm, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const toDelete = clientes.find(c => c.id === deleteId)
  const eventosDelCliente = deleteId ? eventos.filter(e => e.proyectos.some(p => p.clienteId === deleteId)).length : 0

  const Avatar = ({ nombre }: { nombre: string }) => (
    <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-brand-400">{nombre.slice(0, 2).toUpperCase()}</span>
    </div>
  )

  const Actions = ({ c }: { c: Cliente }) => (
    <div className="flex gap-1 shrink-0">
      <button onClick={e => { e.stopPropagation(); openEdit(c) }} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-all"><Edit2 size={13} /></button>
      <button onClick={e => { e.stopPropagation(); setDeleteId(c.id) }} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"><Trash2 size={13} /></button>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-100">Clientes</h1>
        <Button variant="primary" onClick={openNew}><Plus size={15} />Nuevo Cliente</Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, contacto, email, CUIT..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-brand-500/40 focus:outline-none transition-all"
          />
        </div>

        <span className="text-xs text-gray-600">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>

        {/* View toggle */}
        <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => setView('grid')}
            title="Vista tarjetas"
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${view === 'grid' ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView('list')}
            title="Vista lista"
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${view === 'list' ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'No se encontraron clientes' : 'No hay clientes aún'}</p>
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => {
            const nEventos = eventos.filter(e => e.proyectos.some(p => p.clienteId === c.id)).length
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/clientes/${c.id}`)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-h)] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nombre={c.nombre} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-200 text-sm truncate">{c.nombre}</p>
                      {c.cuit && <p className="text-xs text-gray-600">CUIT: {c.cuit}</p>}
                    </div>
                  </div>
                  <Actions c={c} />
                </div>

                <div className="space-y-1.5 mb-4">
                  {c.contacto && <div className="flex items-center gap-2 text-xs text-gray-500"><User size={11} className="shrink-0" /><span className="truncate">{c.contacto}</span></div>}
                  {c.telefono && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone size={11} className="shrink-0" /><span>{c.telefono}</span></div>}
                  {c.email && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail size={11} className="shrink-0" /><span className="truncate">{c.email}</span></div>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                  <span className="text-xs text-gray-600">{nEventos} evento{nEventos !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 text-xs text-brand-400">
                    Ver detalle <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === 'list' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contacto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Eventos</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-s)]">
                {filtered.map(c => {
                  const nEventos = eventos.filter(e => e.proyectos.some(p => p.clienteId === c.id)).length
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      className="hover:bg-[var(--surface-h)] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nombre={c.nombre} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">{c.nombre}</p>
                            {c.cuit && <p className="text-xs text-gray-600">CUIT: {c.cuit}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">{c.contacto || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{c.telefono || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell truncate max-w-[180px]">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-500 bg-[var(--surface-2)] px-2 py-0.5 rounded-full">{nEventos}</span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Actions c={c} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Cliente' : 'Nuevo Cliente'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre / Empresa *" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del cliente" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="CUIT" value={form.cuit||''} onChange={e => set('cuit', e.target.value)} placeholder="XX-XXXXXXXX-X" />
            <Input label="Contacto" value={form.contacto||''} onChange={e => set('contacto', e.target.value)} placeholder="Nombre del contacto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" value={form.telefono||''} onChange={e => set('telefono', e.target.value)} placeholder="11-XXXX-XXXX" />
            <Input label="Email" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="email@ejemplo.com" />
          </div>
          <Input label="Dirección" value={form.direccion||''} onChange={e => set('direccion', e.target.value)} placeholder="Dirección" />
          <Textarea label="Notas" value={form.notas||''} onChange={e => set('notas', e.target.value)} placeholder="Notas internas..." rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">{editId ? 'Guardar' : 'Crear Cliente'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteCliente(deleteId) }}
        title="Eliminar cliente"
        message={`¿Eliminar "${toDelete?.nombre}"?${eventosDelCliente > 0 ? ` Este cliente tiene ${eventosDelCliente} evento(s) asociado(s) que quedarán sin cliente.` : ''}`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
