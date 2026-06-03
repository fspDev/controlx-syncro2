import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { EstadoBadge } from '@/components/eventos/EstadoBadge'
import { EventoForm } from '@/components/eventos/EventoForm'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, Edit2, Trash2, Plus, Check, X, Calendar, MapPin,
  Hammer, User, CheckSquare, ImagePlus, Folder, FolderOpen, Copy, LayoutTemplate, Search
} from 'lucide-react'
import { FolderPicker } from '@/components/ui/FolderPicker'

const MAX_RENDERS = 3

export function EventoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { eventos, clientes, usuarios, updateEvento, deleteEvento, addTarea, updateTarea, deleteTarea, tareasUsuario, addTareaUsuario, updateTareaUsuario, deleteTareaUsuario, carpetaBase } = useAppStore()

  const evento = eventos.find(e => e.id === id)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [newTarea, setNewTarea] = useState('')
  const [newTareaResp, setNewTareaResp] = useState('')
  const [deleteTareaId, setDeleteTareaId] = useState<string | null>(null)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [newMiTarea, setNewMiTarea] = useState('')
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [carpeta, setCarpeta] = useState('')
  const [carpetaCopied, setCarpetaCopied] = useState(false)
  const [carpetaStatus, setCarpetaStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!evento) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-500">Evento no encontrado</p>
      <Button onClick={() => navigate('/proyectos')}>Volver a Proyectos</Button>
    </div>
  )

  const renders = evento.renders || []
  const carpetaGuardada = evento.carpetaServidor || ''

  const cliente = clientes.find(c => c.id === evento.clienteId)
  const responsable = usuarios.find(u => u.id === evento.responsableId)
  const tareasPend = evento.tareas.filter(t => !t.completada).length
  const tareasTotal = evento.tareas.length

  const handleAddTarea = () => {
    if (!newTarea.trim()) return
    addTarea(evento.id, { titulo: newTarea.trim(), responsableId: newTareaResp || undefined, completada: false })
    setNewTarea('')
    setNewTareaResp('')
  }

  const handleRenderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const current = evento.renders || []
    const slots = MAX_RENDERS - current.length
    if (slots <= 0) return
    const toProcess = files.slice(0, slots)
    let loaded = 0
    const newRenders = [...current]
    toProcess.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        newRenders.push(reader.result as string)
        loaded++
        if (loaded === toProcess.length) {
          updateEvento(evento.id, { renders: newRenders })
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeRender = (idx: number) => {
    const updated = (evento.renders || []).filter((_, i) => i !== idx)
    updateEvento(evento.id, { renders: updated })
  }

  const saveCarpeta = () => {
    updateEvento(evento.id, { carpetaServidor: carpeta.trim() })
    setCarpeta('')
  }

  const removeCarpeta = () => updateEvento(evento.id, { carpetaServidor: '' })

  const copyCarpeta = async (path: string) => {
    await navigator.clipboard.writeText(path)
    setCarpetaCopied(true)
    setTimeout(() => setCarpetaCopied(false), 2000)
  }

  const openCarpeta = async (path: string) => {
    setCarpetaStatus('idle')
    try {
      const res = await fetch(`http://localhost:3001/open?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.ok) {
        setCarpetaStatus('ok')
        setTimeout(() => setCarpetaStatus('idle'), 2500)
      } else {
        setCarpetaStatus('error')
        setTimeout(() => setCarpetaStatus('idle'), 3000)
      }
    } catch {
      // Agente local no disponible
      setCarpetaStatus('error')
      setTimeout(() => setCarpetaStatus('idle'), 3000)
    }
  }

  const usuariosOpts = [
    { value: '', label: '— Sin asignar —' },
    ...usuarios.map(u => ({ value: u.id, label: u.displayName || u.username }))
  ]

  const infoItems = [
    { icon: User, label: 'Cliente', value: cliente?.nombre || '—', onClick: cliente ? () => navigate(`/clientes/${cliente.id}`) : undefined },
    { icon: MapPin, label: 'Lugar', value: evento.lugar || '—' },
    { icon: Hammer, label: 'Fabricación', value: evento.fabricacion || '—' },
    { icon: User, label: 'Responsable', value: responsable ? (responsable.displayName || responsable.username) : '— Sin asignar —' },
  ]

  const fechas = [
    { label: 'Armado', value: evento.armadoInicio ? `${formatDate(evento.armadoInicio)}${evento.armadoFin ? ` → ${formatDate(evento.armadoFin)}` : ''}` : '—' },
    { label: 'Evento', value: evento.eventoInicio ? `${formatDate(evento.eventoInicio)}${evento.eventoFin ? ` → ${formatDate(evento.eventoFin)}` : ''}` : '—' },
    { label: 'Desarme', value: formatDate(evento.desarme) },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/proyectos')} className="mt-1 p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)] transition-all cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <EstadoBadge estado={evento.estado} />
            {tareasTotal > 0 && (
              <span className="text-xs text-gray-500">{tareasTotal - tareasPend}/{tareasTotal} tareas completadas</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-100">{evento.titulo}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Creado {formatDate(evento.createdAt)} · Actualizado {formatDate(evento.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button size="sm" variant="primary" onClick={() => navigate(`/proyectos/${evento.id}/planilla`)}>
            <LayoutTemplate size={13} /> Planilla Gráfica
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Edit2 size={13} /> Editar
          </Button>
          <Button size="sm" variant="danger" onClick={() => setShowDelete(true)}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Info card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Información</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {infoItems.map(({ icon: Icon, label, value, onClick }) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className="text-gray-600" />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  {onClick ? (
                    <button onClick={onClick} className="text-sm text-brand-400 hover:text-brand-300 cursor-pointer transition-colors text-left">
                      {value}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-200">{value}</p>
                  )}
                </div>
              ))}
            </div>
            {evento.notas && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{evento.notas}</p>
              </div>
            )}
          </div>

          {/* Renders */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImagePlus size={15} className="text-gray-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Renders del proyecto</h3>
              </div>
              <span className="text-xs text-gray-600">{renders.length}/{MAX_RENDERS}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Filled slots */}
              {renders.map((src, idx) => (
                <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                  <img
                    src={src}
                    alt={`Render ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxImg(src)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setLightboxImg(src)}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white backdrop-blur-sm cursor-pointer transition-all"
                      title="Ver ampliado"
                    >
                      <ImagePlus size={13} />
                    </button>
                    <button
                      onClick={() => removeRender(idx)}
                      className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white cursor-pointer transition-all"
                      title="Eliminar"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                    Render {idx + 1}
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {renders.length < MAX_RENDERS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-lg border-2 border-dashed border-[var(--border)] hover:border-brand-500/50 hover:bg-brand-500/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                >
                  <ImagePlus size={20} className="text-gray-600 group-hover:text-brand-400 transition-colors" />
                  <span className="text-xs text-gray-600 group-hover:text-brand-400 transition-colors">Agregar render</span>
                </button>
              )}

              {/* Placeholder slots for visual consistency */}
              {Array.from({ length: Math.max(0, MAX_RENDERS - renders.length - 1) }).map((_, i) => (
                <div key={`ph-${i}`} className="aspect-video rounded-lg border border-dashed border-[var(--border-s)] flex items-center justify-center opacity-30">
                  <ImagePlus size={16} className="text-gray-600" />
                </div>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleRenderUpload}
            />
          </div>

          {/* Mis tareas personales en este proyecto */}
          {(() => {
            const misTareas = tareasUsuario.filter(t => t.eventoId === evento.id)
            const pendMias = misTareas.filter(t => !t.completada).length
            return (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={15} className="text-brand-400" />
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mis tareas</h3>
                  </div>
                  {misTareas.length > 0 && (
                    <span className="text-xs text-gray-600">{pendMias} pendiente{pendMias !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="flex gap-1.5 mb-3">
                  <input
                    value={newMiTarea}
                    onChange={e => setNewMiTarea(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newMiTarea.trim()) {
                        addTareaUsuario({ titulo: newMiTarea.trim(), completada: false, prioridad: 'media', eventoId: evento.id })
                        setNewMiTarea('')
                      }
                    }}
                    placeholder="Nueva tarea mía..."
                    className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
                  />
                  <Button size="sm" variant="primary"
                    onClick={() => {
                      if (!newMiTarea.trim()) return
                      addTareaUsuario({ titulo: newMiTarea.trim(), completada: false, prioridad: 'media', eventoId: evento.id })
                      setNewMiTarea('')
                    }}
                    disabled={!newMiTarea.trim()}
                  >
                    <Plus size={13} />
                  </Button>
                </div>
                {misTareas.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">No hay tareas personales para este proyecto</p>
                ) : (
                  <div className="space-y-2">
                    {misTareas.map(t => (
                      <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${t.completada ? 'border-[var(--border-s)] opacity-60' : 'border-[var(--border)] bg-[var(--bg)]/50'}`}>
                        <button
                          onClick={() => updateTareaUsuario(t.id, { completada: !t.completada })}
                          className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-all cursor-pointer ${
                            t.completada ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border-h)] hover:border-brand-500'
                          }`}
                        >
                          {t.completada && <Check size={10} className="text-white" strokeWidth={3} />}
                        </button>
                        <span className={`text-sm flex-1 ${t.completada ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                          {t.titulo}
                        </span>
                        <button onClick={() => deleteTareaUsuario(t.id)} className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-0.5">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Tareas del proyecto */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-gray-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tareas del proyecto</h3>
              </div>
              {tareasTotal > 0 && (
                <span className="text-xs text-gray-600">{tareasTotal - tareasPend} de {tareasTotal}</span>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={newTarea}
                onChange={e => setNewTarea(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTarea()}
                placeholder="Nueva tarea..."
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
              />
              <select
                value={newTareaResp}
                onChange={e => setNewTareaResp(e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-2 text-sm text-gray-400 focus:outline-none cursor-pointer"
              >
                {usuariosOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button size="sm" variant="primary" onClick={handleAddTarea} disabled={!newTarea.trim()}>
                <Plus size={13} />
              </Button>
            </div>

            {evento.tareas.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No hay tareas aún</p>
            ) : (
              <div className="space-y-2">
                {evento.tareas.map(tarea => {
                  const resp = usuarios.find(u => u.id === tarea.responsableId)
                  return (
                    <div key={tarea.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${tarea.completada ? 'border-[var(--border-s)] opacity-60' : 'border-[var(--border)] bg-[var(--bg)]/50'}`}>
                      <button
                        onClick={() => updateTarea(evento.id, tarea.id, { completada: !tarea.completada })}
                        className={`w-4 h-4 rounded shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all cursor-pointer ${tarea.completada ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border-h)] hover:border-brand-500'}`}
                      >
                        {tarea.completada && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${tarea.completada ? 'line-through text-gray-500' : 'text-gray-200'}`}>{tarea.titulo}</p>
                        {resp && <p className="text-xs text-gray-600 mt-0.5">{resp.displayName || resp.username}</p>}
                      </div>
                      <button onClick={() => setDeleteTareaId(tarea.id)} className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer p-0.5">
                        <X size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Fechas */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={15} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fechas</h3>
            </div>
            <div className="space-y-4">
              {fechas.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-gray-300">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Carpeta del servidor */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Folder size={15} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Carpeta del proyecto</h3>
            </div>

            {carpetaGuardada ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2">
                  <FolderOpen size={14} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-gray-300 font-mono flex-1 truncate" title={carpetaGuardada}>
                    {carpetaGuardada}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openCarpeta(carpetaGuardada)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border text-xs font-medium rounded-lg cursor-pointer transition-all ${
                      carpetaStatus === 'ok'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : carpetaStatus === 'error'
                        ? 'bg-red-500/15 border-red-500/30 text-red-400'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <FolderOpen size={13} />
                    {carpetaStatus === 'ok' ? '¡Abierto!' : carpetaStatus === 'error' ? 'Sin agente local' : 'Abrir'}
                  </button>
                  <button
                    onClick={() => copyCarpeta(carpetaGuardada)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-2h)] border border-[var(--border)] text-gray-400 text-xs font-medium rounded-lg cursor-pointer transition-all"
                  >
                    <Copy size={13} /> {carpetaCopied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="flex gap-2">
                  {carpetaBase && (
                    <button
                      onClick={() => setShowFolderPicker(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-2h)] border border-[var(--border)] text-gray-500 text-xs rounded-lg cursor-pointer transition-all"
                    >
                      <Search size={11} /> Cambiar
                    </button>
                  )}
                  <button
                    onClick={removeCarpeta}
                    className="flex-1 text-xs text-gray-600 hover:text-red-400 cursor-pointer transition-colors text-center py-1.5"
                  >
                    Quitar carpeta
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {carpetaBase ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowFolderPicker(true)}
                      className="w-full justify-center"
                    >
                      <Search size={13} /> Seleccionar carpeta
                    </Button>
                    <p className="text-xs text-gray-600 text-center">o ingresá la ruta manualmente</p>
                  </>
                ) : (
                  <p className="text-xs text-amber-400/80 text-center py-1">
                    Configurá la carpeta base en Admin para poder explorar
                  </p>
                )}
                <input
                  value={carpeta}
                  onChange={e => setCarpeta(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && carpeta.trim() && saveCarpeta()}
                  placeholder="\\servidor\proyectos\nombre"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveCarpeta}
                  disabled={!carpeta.trim()}
                  className="w-full justify-center"
                >
                  <Folder size={13} /> Asignar ruta
                </Button>
              </div>
            )}

            {/* Folder Picker */}
            {showFolderPicker && carpetaBase && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <FolderPicker
                  basePath={carpetaBase}
                  current={carpetaGuardada}
                  onSelect={(path) => {
                    updateEvento(evento.id, { carpetaServidor: path })
                    setShowFolderPicker(false)
                  }}
                  onCancel={() => setShowFolderPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Progreso tareas */}
          {tareasTotal > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Progreso</h3>
              <div className="w-full bg-[var(--surface-2)] rounded-full h-2 mb-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round(((tareasTotal - tareasPend) / tareasTotal) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-right">
                {Math.round(((tareasTotal - tareasPend) / tareasTotal) * 100)}% completado
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <button className="absolute top-4 right-4 p-2 text-white/70 hover:text-white cursor-pointer" onClick={() => setLightboxImg(null)}>
            <X size={22} />
          </button>
          <img
            src={lightboxImg}
            alt="Render ampliado"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Editar Evento" size="lg">
        <EventoForm
          initial={evento}
          onSubmit={(data) => { updateEvento(evento.id, data); setShowEdit(false) }}
          onCancel={() => setShowEdit(false)}
          submitLabel="Guardar cambios"
        />
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => { deleteEvento(evento.id); navigate('/proyectos') }}
        title="Eliminar evento"
        message={`¿Estás seguro que querés eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />

      <ConfirmDialog
        open={!!deleteTareaId}
        onClose={() => setDeleteTareaId(null)}
        onConfirm={() => { if (deleteTareaId) deleteTarea(evento.id, deleteTareaId) }}
        title="Eliminar tarea"
        message="¿Querés eliminar esta tarea?"
        confirmLabel="Eliminar"
      />
    </div>
  )
}
