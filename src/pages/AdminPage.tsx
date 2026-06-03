import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { UserRol, Usuario } from '@/types'
import { Plus, Edit2, Trash2, Shield, ClipboardList, GripVertical, Check, X, Folder } from 'lucide-react'

const ROL_OPTS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'contable', label: 'Contable' },
  { value: 'user', label: 'Usuario' },
]

const ROL_COLORS: Record<UserRol, string> = {
  admin: 'bg-brand-500/15 text-brand-400',
  contable: 'bg-emerald-500/15 text-emerald-400',
  user: 'bg-blue-500/15 text-blue-400',
}

interface FormState { username: string; displayName: string; rol: UserRol; password: string; confirmPass: string }
const EMPTY: FormState = { username: '', displayName: '', rol: 'user', password: '', confirmPass: '' }

export function AdminPage() {
  const { currentUser, usuarios, addUsuario, updateUsuario, deleteUsuario,
    tareasPlantilla, addTareaPlantilla, updateTareaPlantilla, deleteTareaPlantilla,
    carpetaBase, setCarpetaBase, agenteUrl, setAgenteUrl } = useAppStore()
  const [carpetaBaseInput, setCarpetaBaseInput] = useState(carpetaBase)
  const [agenteUrlInput, setAgenteUrlInput] = useState(agenteUrl)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')

  // Tareas plantilla state
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [editTareaId, setEditTareaId] = useState<string | null>(null)
  const [editTareaTxt, setEditTareaTxt] = useState('')

  if (currentUser?.rol !== 'admin') return <Navigate to="/dashboard" replace />

  const openNew = () => { setForm(EMPTY); setEditId(null); setError(''); setShowForm(true) }
  const openEdit = (u: Usuario) => {
    setForm({ username: u.username, displayName: u.displayName||'', rol: u.rol, password: '', confirmPass: '' })
    setEditId(u.id); setError(''); setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim()) return setError('El usuario es requerido')
    if (!editId && !form.password) return setError('La contraseña es requerida')
    if (form.password && form.password !== form.confirmPass) return setError('Las contraseñas no coinciden')
    if (!editId && usuarios.find(u => u.username === form.username)) return setError('El usuario ya existe')

    if (editId) {
      updateUsuario(editId, { username: form.username, displayName: form.displayName, rol: form.rol, ...(form.password ? { password: form.password } : {}) })
    } else {
      addUsuario({ username: form.username, displayName: form.displayName, rol: form.rol, password: form.password })
    }
    setShowForm(false)
  }

  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const toDelete = usuarios.find(u => u.id === deleteId)

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-gray-100">Panel de Administración</h1>
        </div>
        <Button variant="primary" onClick={openNew}><Plus size={15} />Añadir Usuario</Button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-gray-300">Gestión de Usuarios</h2>
          <p className="text-xs text-gray-600 mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <div className="divide-y divide-[var(--border-s)]">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-h)] transition-colors">
              <div className="w-9 h-9 rounded-full bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-brand-400">
                  {(u.displayName || u.username).slice(0,2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-200">{u.displayName || u.username}</p>
                <p className="text-xs text-gray-500">@{u.username}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROL_COLORS[u.rol]}`}>
                {ROL_OPTS.find(r => r.value === u.rol)?.label}
              </span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(u)} className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-all"><Edit2 size={13} /></button>
                {u.id !== currentUser?.id && (
                  <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tareas predeterminadas */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <ClipboardList size={15} className="text-brand-400" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-300">Tareas Predeterminadas</h2>
            <p className="text-xs text-gray-600 mt-0.5">Se agregan automáticamente a cada nuevo proyecto</p>
          </div>
          <span className="text-xs text-gray-600">{tareasPlantilla.length} tarea{tareasPlantilla.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-[var(--border-s)]">
          {tareasPlantilla.length === 0 && (
            <p className="px-5 py-6 text-sm text-gray-600 text-center">No hay tareas predeterminadas</p>
          )}
          {tareasPlantilla.sort((a, b) => a.orden - b.orden).map(t => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-h)] transition-colors group">
              <GripVertical size={14} className="text-gray-700 shrink-0" />
              {editTareaId === t.id ? (
                <>
                  <input
                    autoFocus
                    value={editTareaTxt}
                    onChange={e => setEditTareaTxt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && editTareaTxt.trim()) {
                        updateTareaPlantilla(t.id, editTareaTxt.trim())
                        setEditTareaId(null)
                      }
                      if (e.key === 'Escape') setEditTareaId(null)
                    }}
                    className="flex-1 bg-[var(--bg)] border border-brand-500/40 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
                  />
                  <button onClick={() => { if (editTareaTxt.trim()) { updateTareaPlantilla(t.id, editTareaTxt.trim()); setEditTareaId(null) } }} className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check size={13} /></button>
                  <button onClick={() => setEditTareaId(null)} className="p-1 text-gray-600 hover:text-gray-300 cursor-pointer"><X size={13} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-300">{t.titulo}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditTareaId(t.id); setEditTareaTxt(t.titulo) }} className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-all"><Edit2 size={12} /></button>
                    <button onClick={() => deleteTareaPlantilla(t.id)} className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2">
          <input
            value={nuevaTarea}
            onChange={e => setNuevaTarea(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && nuevaTarea.trim()) {
                addTareaPlantilla(nuevaTarea.trim())
                setNuevaTarea('')
              }
            }}
            placeholder="Nueva tarea predeterminada..."
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!nuevaTarea.trim()}
            onClick={() => { if (nuevaTarea.trim()) { addTareaPlantilla(nuevaTarea.trim()); setNuevaTarea('') } }}
          >
            <Plus size={13} /> Agregar
          </Button>
        </div>
      </div>

      {/* Configuración del Agente */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <Folder size={15} className="text-brand-400" />
          <div>
            <h2 className="text-sm font-semibold text-gray-300">Agente de Red</h2>
            <p className="text-xs text-gray-600 mt-0.5">URL del agente central que corre en el servidor</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={agenteUrlInput}
              onChange={e => setAgenteUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && agenteUrlInput.trim()) setAgenteUrl(agenteUrlInput.trim()) }}
              placeholder="http://192.168.1.10:3001"
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-gray-300 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!agenteUrlInput.trim() || agenteUrlInput === agenteUrl}
              onClick={() => setAgenteUrl(agenteUrlInput.trim())}
            >
              <Check size={13} /> Guardar
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            Iniciá <span className="font-mono text-gray-400">agente-controlx.exe</span> en el servidor y copiá la URL que muestra en consola.
            {agenteUrl && agenteUrl !== 'http://localhost:3001' && (
              <span className="block text-emerald-400 mt-1">✓ Configurado: <span className="font-mono">{agenteUrl}</span></span>
            )}
          </p>
        </div>

        <div className="px-5 pb-4 border-t border-[var(--border)] pt-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 flex items-center gap-2">
            <Folder size={12} className="text-amber-400" /> Carpeta Compartida Base
          </p>
          <div className="flex gap-2">
            <input
              value={carpetaBaseInput}
              onChange={e => setCarpetaBaseInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && carpetaBaseInput.trim()) setCarpetaBase(carpetaBaseInput.trim()) }}
              placeholder="\\servidor\proyectos"
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-gray-300 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!carpetaBaseInput.trim() || carpetaBaseInput === carpetaBase}
              onClick={() => setCarpetaBase(carpetaBaseInput.trim())}
            >
              <Check size={13} /> Guardar
            </Button>
          </div>
          {carpetaBase && (
            <p className="text-xs text-emerald-400">✓ <span className="font-mono">{carpetaBase}</span></p>
          )}
        </div>
      </div>

      {/* Roles info */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Roles</h3>
        <div className="space-y-3">
          <div className="flex gap-3"><span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${ROL_COLORS.admin}`}>Admin</span><p className="text-xs text-gray-500">Acceso completo + gestión de usuarios</p></div>
          <div className="flex gap-3"><span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${ROL_COLORS.contable}`}>Contable</span><p className="text-xs text-gray-500">Acceso completo + módulo financiero avanzado (Etapa 2)</p></div>
          <div className="flex gap-3"><span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${ROL_COLORS.user}`}>Usuario</span><p className="text-xs text-gray-500">Acceso a proyectos, calendario, clientes y trabajos</p></div>
        </div>
      </div>

      {/* Form */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Usuario' : 'Nuevo Usuario'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Usuario *" value={form.username} onChange={e => set('username', e.target.value)} placeholder="nombre.usuario" disabled={!!editId} />
          <Input label="Nombre para mostrar" value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Nombre Apellido" />
          <Select label="Rol" value={form.rol} onChange={e => set('rol', e.target.value as UserRol)} options={ROL_OPTS} />
          <Input label={editId ? 'Nueva contraseña (opcional)' : 'Contraseña *'} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
          {form.password && (
            <Input label="Confirmar contraseña" type="password" value={form.confirmPass} onChange={e => set('confirmPass', e.target.value)} placeholder="••••••••" />
          )}
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">{editId ? 'Guardar' : 'Crear Usuario'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteUsuario(deleteId) }}
        title="Eliminar usuario"
        message={`¿Eliminar al usuario "${toDelete?.displayName || toDelete?.username}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
