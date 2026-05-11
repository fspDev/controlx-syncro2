import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import { PlanillaPDF } from '@/components/pdf/PlanillaPDF'
import type { TipoPieza, Pieza, PlanillaRender } from '@/types'
import { TIPO_LABEL, TIPO_PREFIX, TIPO_COLOR_HEX, SUBTIPOS } from '@/types'
import { ArrowLeft, Plus, Trash2, Upload, ImagePlus, FileDown, Edit2, X, ChevronRight, Eye, RefreshCw, Clipboard } from 'lucide-react'

// ─── LabelBadge ──────────────────────────────────────────────────────────────

function LabelBadge({ label, tipo, size = 'md' }: { label: string; tipo: TipoPieza; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' }
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${dims[size]}`}
      style={{ backgroundColor: TIPO_COLOR_HEX[tipo] }}>
      {label}
    </div>
  )
}

// ─── PiezaFormModal ───────────────────────────────────────────────────────────

type FormConfirmData =
  | { mode: 'nueva'; tipo: TipoPieza; subtipo: string; ancho?: number; alto?: number; materialidad?: string }
  | { mode: 'existente'; piezaId: string }

function PiezaFormModal({ piezas, onConfirm, onCancel }: {
  piezas: Pieza[]
  onConfirm: (d: FormConfirmData) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'nueva' | 'existente'>('nueva')
  const [tipo, setTipo] = useState<TipoPieza>('vinilo')
  const [subtipo, setSubtipo] = useState(SUBTIPOS.vinilo[0])
  const [ancho, setAncho] = useState('')
  const [alto, setAlto] = useState('')
  const [materialidad, setMaterialidad] = useState('')
  const [piezaExistenteId, setPiezaExistenteId] = useState(piezas[0]?.id || '')

  const handleTipo = (t: TipoPieza) => { setTipo(t); setSubtipo(SUBTIPOS[t][0]) }

  const handleSubmit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mode === 'existente' && piezaExistenteId) {
      onConfirm({ mode: 'existente', piezaId: piezaExistenteId })
    } else {
      onConfirm({ mode: 'nueva', tipo, subtipo, ancho: ancho ? Number(ancho) : undefined, alto: alto ? Number(alto) : undefined, materialidad: materialidad || undefined })
    }
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => { e.stopPropagation(); onCancel() }}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Referenciar pieza gráfica</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
            <button onClick={() => setMode('nueva')} className={`flex-1 py-2 text-xs font-medium cursor-pointer transition-colors ${mode === 'nueva' ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}>Nueva pieza</button>
            {piezas.length > 0 && (
              <button onClick={() => setMode('existente')} className={`flex-1 py-2 text-xs font-medium cursor-pointer transition-colors ${mode === 'existente' ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}>Pieza existente</button>
            )}
          </div>

          {mode === 'existente' ? (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Seleccioná la pieza</label>
              <select value={piezaExistenteId} onChange={e => setPiezaExistenteId(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none cursor-pointer">
                {piezas.map(p => (
                  <option key={p.id} value={p.id}>{p.label} — {TIPO_LABEL[p.tipo]} {p.subtipo}{p.ancho && p.alto ? ` (${p.ancho}×${p.alto}mm)` : ''}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Tipo de pieza</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['vinilo', 'corporeo', 'lona', 'otro'] as TipoPieza[]).map(t => (
                    <button key={t} onClick={() => handleTipo(t)} className="flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all"
                      style={tipo === t ? { color: TIPO_COLOR_HEX[t], borderColor: TIPO_COLOR_HEX[t], backgroundColor: TIPO_COLOR_HEX[t] + '18' } : { borderColor: 'var(--border)', color: '#6b7280' }}>
                      <span className="font-bold text-sm">{TIPO_PREFIX[t]}</span>
                      <span className="text-[10px] leading-tight text-center">{TIPO_LABEL[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Subtipo</label>
                <select value={subtipo} onChange={e => setSubtipo(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none cursor-pointer">
                  {SUBTIPOS[tipo].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Ancho (mm)</label>
                  <input type="number" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="ej: 2400"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Alto (mm)</label>
                  <input type="number" value={alto} onChange={e => setAlto(e.target.value)} placeholder="ej: 800"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Materialidad</label>
                <input value={materialidad} onChange={e => setMaterialidad(e.target.value)} placeholder="ej: PVC 3mm, lona 510gr..."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none" />
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>Colocar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── EditPiezaModal ───────────────────────────────────────────────────────────

function EditPiezaModal({ pieza, onSave, onClose }: {
  pieza: Pieza
  onSave: (data: Partial<Omit<Pieza, 'id' | 'label' | 'tipo'>>) => void
  onClose: () => void
}) {
  const [subtipo, setSubtipo] = useState(pieza.subtipo)
  const [ancho, setAncho] = useState(pieza.ancho?.toString() || '')
  const [alto, setAlto] = useState(pieza.alto?.toString() || '')
  const [materialidad, setMaterialidad] = useState(pieza.materialidad || '')

  const handleSave = () => {
    onSave({ subtipo, ancho: ancho ? Number(ancho) : undefined, alto: alto ? Number(alto) : undefined, materialidad: materialidad || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <LabelBadge label={pieza.label} tipo={pieza.tipo} />
          <h3 className="text-sm font-semibold text-gray-200">Editar {TIPO_LABEL[pieza.tipo]}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Subtipo</label>
            <select value={subtipo} onChange={e => setSubtipo(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none cursor-pointer">
              {SUBTIPOS[pieza.tipo].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Ancho (mm)</label>
              <input type="number" value={ancho} onChange={e => setAncho(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Alto (mm)</label>
              <input type="number" value={alto} onChange={e => setAlto(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Materialidad</label>
            <input value={materialidad} onChange={e => setMaterialidad(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>Guardar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── RenderCanvas ─────────────────────────────────────────────────────────────
// FIX: image in normal flow so the container has real height → markers are visible

function RenderCanvas({ render, piezas, onCanvasClick, onMarcadorMove, onMarcadorDelete, onSelectPieza, activePiezaId }: {
  render: PlanillaRender; piezas: Pieza[]
  onCanvasClick: (x: number, y: number) => void
  onMarcadorMove: (id: string, x: number, y: number) => void
  onMarcadorDelete: (id: string) => void
  onSelectPieza: (piezaId: string) => void
  activePiezaId: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)
  const hasMoved = useRef(false)

  const getPos = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100)),
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none cursor-crosshair rounded-lg overflow-hidden shadow-md"
      onClick={e => {
        if (hasMoved.current) { hasMoved.current = false; return }
        const { x, y } = getPos(e)
        onCanvasClick(x, y)
      }}
      onMouseMove={e => {
        if (!draggingId.current) return
        hasMoved.current = true
        const { x, y } = getPos(e)
        onMarcadorMove(draggingId.current, x, y)
      }}
      onMouseUp={() => { draggingId.current = null }}
      onMouseLeave={() => { draggingId.current = null }}
    >
      {/* Image in normal flow — defines container height */}
      <img src={render.imagen} className="w-full block" draggable={false} alt={render.nombre} />

      {/* Markers overlay */}
      {render.marcadores.map(m => {
        const pieza = piezas.find(p => p.id === m.piezaId)
        if (!pieza) return null
        const isActive = activePiezaId === m.piezaId
        return (
          <div
            key={m.id}
            className="group absolute"
            style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)', zIndex: isActive ? 10 : 5 }}
            onMouseDown={e => { e.stopPropagation(); draggingId.current = m.id; hasMoved.current = false }}
            onClick={e => { e.stopPropagation(); if (!hasMoved.current) onSelectPieza(m.piezaId) }}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-bold text-white cursor-grab active:cursor-grabbing shadow-lg border-2 border-white transition-transform ${isActive ? 'scale-125' : 'hover:scale-110'}`}
              style={{ backgroundColor: TIPO_COLOR_HEX[pieza.tipo] }}
            >
              {pieza.label}
            </div>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onMarcadorDelete(m.id) }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full text-white text-[10px] font-bold hidden group-hover:flex items-center justify-center cursor-pointer shadow"
            >×</button>
          </div>
        )
      })}
    </div>
  )
}

// ─── PiezaDetalleCard ─────────────────────────────────────────────────────────

function PiezaDetalleCard({ pieza, cantidad, onUpdateDetalle, onEdit, onDelete }: {
  pieza: Pieza; cantidad: number
  onUpdateDetalle: (img: string, w: number, h: number) => void
  onEdit: () => void; onDelete: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const readWithDimensions = (base64: string, cb: (img: string, w: number, h: number) => void) => {
    const img = new Image()
    img.onload = () => cb(base64, img.naturalWidth, img.naturalHeight)
    img.src = base64
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => readWithDimensions(reader.result as string, onUpdateDetalle)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'))
        if (imgType) {
          const blob = await item.getType(imgType)
          const reader = new FileReader()
          reader.onload = () => readWithDimensions(reader.result as string, onUpdateDetalle)
          reader.readAsDataURL(blob)
          return
        }
      }
    } catch {
      // Permission denied or no image in clipboard
    }
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Image slot */}
      <div className="relative aspect-video bg-[var(--bg)] group border-b border-[var(--border)]">
        {pieza.imagenDetalle ? (
          <>
            <img src={pieza.imagenDetalle} className="w-full h-full object-cover" alt={pieza.label} />
            <button onClick={() => fileRef.current?.click()}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity cursor-pointer gap-1">
              <Upload size={13} /> Cambiar
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center gap-2">
            {/* Upload button */}
            <button onClick={() => fileRef.current?.click()}
              title="Subir imagen"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-colors border border-[var(--border)]">
              <Plus size={16} />
            </button>
            {/* Paste from clipboard */}
            <button onClick={pasteFromClipboard}
              title="Pegar desde portapapeles"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-[var(--surface-2)] cursor-pointer transition-colors border border-[var(--border)]">
              <Clipboard size={14} />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <LabelBadge label={pieza.label} tipo={pieza.tipo} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{TIPO_LABEL[pieza.tipo]}</p>
              <p className="text-[10px] text-gray-500 truncate">{pieza.subtipo}</p>
            </div>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <button onClick={onEdit} className="p-1 text-gray-600 hover:text-gray-300 cursor-pointer"><Edit2 size={11} /></button>
            <button onClick={onDelete} className="p-1 text-gray-600 hover:text-red-400 cursor-pointer"><Trash2 size={11} /></button>
          </div>
        </div>
        <div className="space-y-0.5 text-[10px] text-gray-500">
          {(pieza.ancho || pieza.alto) && <p>{pieza.ancho ?? '?'} × {pieza.alto ?? '?'} mm</p>}
          {pieza.materialidad && <p className="truncate">{pieza.materialidad}</p>}
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[var(--border-s)]">
            <span>Cantidad</span>
            <span className="font-bold text-sm text-gray-200">{cantidad}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PlanillaPage ─────────────────────────────────────────────────────────────

export function PlanillaPage() {
  const { id: eventoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { eventos, clientes, usuarios, planillas,
    getOrCreatePlanilla, addRenderToPlanilla, removeRender,
    addPieza, updatePieza, removePieza,
    addMarcador, updateMarcador, removeMarcador,
  } = useAppStore()

  const evento = eventos.find(e => e.id === eventoId)
  const cliente = clientes.find(c => c.id === evento?.clienteId)
  const responsable = usuarios.find(u => u.id === evento?.responsableId)

  useEffect(() => {
    if (eventoId && !planillas.find(p => p.eventoId === eventoId)) {
      getOrCreatePlanilla(eventoId)
    }
  }, [eventoId])

  const [activeRenderId, setActiveRenderId] = useState<string | null>(null)
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const [activePiezaId, setActivePiezaId] = useState<string | null>(null)
  const [editingPiezaId, setEditingPiezaId] = useState<string | null>(null)
  const [showAddRender, setShowAddRender] = useState(false)
  const [newRenderNombre, setNewRenderNombre] = useState('')
  const [exportando, setExportando] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [rendersPerPage, setRendersPerPage] = useState<1 | 2>(1)
  // For replacing a render image
  const [replacingRenderId, setReplacingRenderId] = useState<string | null>(null)

  const renderFileRef = useRef<HTMLInputElement>(null)
  const replaceRenderFileRef = useRef<HTMLInputElement>(null)

  const currentPlanilla = planillas.find(p => p.eventoId === eventoId)
  const piezas = currentPlanilla?.piezas || []
  const renders = currentPlanilla?.renders || []
  const effectiveRenderId = activeRenderId || renders[0]?.id || null
  const activeRender = renders.find(r => r.id === effectiveRenderId)

  const getCantidad = (piezaId: string) =>
    renders.reduce((sum, r) => sum + r.marcadores.filter(m => m.piezaId === piezaId).length, 0)

  // Upload new render
  const handleRenderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentPlanilla) return
    readImageFile(file, (base64, natW, natH) => {
      const id = addRenderToPlanilla(currentPlanilla.id, {
        nombre: newRenderNombre.trim() || file.name.replace(/\.[^.]+$/, ''),
        imagen: base64, natW, natH,
      })
      setActiveRenderId(id)
      setShowAddRender(false)
      setNewRenderNombre('')
    })
    e.target.value = ''
  }

  // Replace existing render image
  const handleReplaceRender = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentPlanilla || !replacingRenderId) return
    readImageFile(file, (base64, natW, natH) => {
      // updateRender equivalent: update the render in-place using updateMarcador logic
      useAppStore.setState(s => ({
        planillas: s.planillas.map(p => p.id === currentPlanilla.id
          ? { ...p, renders: p.renders.map(r => r.id === replacingRenderId ? { ...r, imagen: base64, natW, natH } : r) }
          : p)
      }))
      setReplacingRenderId(null)
    })
    e.target.value = ''
  }

  const readImageFile = (file: File, cb: (base64: string, natW: number, natH: number) => void) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const img = new Image()
      img.onload = () => cb(base64, img.naturalWidth, img.naturalHeight)
      img.src = base64
    }
    reader.readAsDataURL(file)
  }

  const handlePiezaFormConfirm = (data: FormConfirmData) => {
    if (!currentPlanilla || !activeRender || !pendingPos) return
    let piezaId: string
    if (data.mode === 'nueva') {
      piezaId = addPieza(currentPlanilla.id, { tipo: data.tipo, subtipo: data.subtipo, ancho: data.ancho, alto: data.alto, materialidad: data.materialidad })
    } else {
      piezaId = data.piezaId
    }
    addMarcador(currentPlanilla.id, activeRender.id, piezaId, pendingPos.x, pendingPos.y)
    setActivePiezaId(piezaId)
    setPendingPos(null)  // close modal immediately
  }

  const handleExportPDF = async () => {
    if (!currentPlanilla || !evento) return
    setExportando(true)
    try {
      const blob = await pdf(
        <PlanillaPDF planilla={currentPlanilla} evento={evento} cliente={cliente} responsable={responsable} rendersPerPage={rendersPerPage} logoUrl={`${window.location.origin}/logo1.png`} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Planilla_Grafica_${evento.titulo.replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  if (!evento) return <div className="p-6 text-gray-500 text-sm">Proyecto no encontrado</div>

  return (
    <div className="h-full flex flex-col -m-4 md:-m-6">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <button onClick={() => navigate(`/proyectos/${eventoId}`)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)] transition-all cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-gray-400 truncate">{evento.titulo}</span>
          <ChevronRight size={14} className="text-gray-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-200">Planilla Gráfica</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}
            disabled={!renders.length || !piezas.length}>
            <Eye size={13} /> Vista previa
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF}
            disabled={exportando || !renders.length || !piezas.length}>
            <FileDown size={13} /> {exportando ? 'Generando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <div className="w-52 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--surface)] overflow-hidden">
          <div className="px-3 py-3 border-b border-[var(--border)]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Piezas</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {piezas.length === 0 ? (
              <p className="px-3 py-5 text-[11px] text-gray-600 text-center leading-relaxed">
                Hacé click en el render para agregar referencias
              </p>
            ) : piezas.map(p => (
              <button key={p.id} onClick={() => setActivePiezaId(activePiezaId === p.id ? null : p.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors hover:bg-[var(--surface-2)] ${activePiezaId === p.id ? 'bg-[var(--surface-2)]' : ''}`}>
                <LabelBadge label={p.label} tipo={p.tipo} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-300 truncate">{TIPO_LABEL[p.tipo]}</p>
                  <p className="text-[10px] text-gray-600 truncate">{p.subtipo}</p>
                </div>
                <span className="text-[10px] text-gray-600 font-medium shrink-0">{getCantidad(p.id)}×</span>
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="px-3 py-3 border-t border-[var(--border)] space-y-1.5">
            {(['vinilo', 'corporeo', 'lona', 'otro'] as TipoPieza[]).map(t => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TIPO_COLOR_HEX[t] }} />
                <span className="text-[10px] text-gray-600">{TIPO_PREFIX[t]} — {TIPO_LABEL[t]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">

          {/* Render tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)] overflow-x-auto shrink-0">
            {renders.map(r => {
              const isActive = effectiveRenderId === r.id
              return (
                <div key={r.id} className="relative flex items-center shrink-0">
                  <button onClick={() => setActiveRenderId(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${isActive ? 'bg-brand-500/20 text-brand-400 pr-16' : 'text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)]'}`}>
                    {r.nombre}
                  </button>
                  {/* Edit/delete — visible on active tab */}
                  {isActive && (
                    <div className="absolute right-1.5 flex items-center gap-0.5">
                      <button
                        title="Reemplazar imagen"
                        onClick={() => { setReplacingRenderId(r.id); replaceRenderFileRef.current?.click() }}
                        className="p-1 rounded text-brand-400/60 hover:text-brand-400 cursor-pointer transition-colors">
                        <RefreshCw size={11} />
                      </button>
                      <button
                        title="Eliminar vista"
                        onClick={() => {
                          if (!currentPlanilla) return
                          removeRender(currentPlanilla.id, r.id)
                          setActiveRenderId(null)
                        }}
                        className="p-1 rounded text-brand-400/60 hover:text-red-400 cursor-pointer transition-colors">
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            <button onClick={() => setShowAddRender(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-brand-400 hover:bg-brand-500/10 cursor-pointer transition-all ml-1 shrink-0">
              <Plus size={12} /> Agregar vista
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto p-4">
            {!activeRender ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                  <ImagePlus size={28} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">Sin renders todavía</p>
                  <p className="text-xs text-gray-600 mt-1">Subí el primer render para empezar a referenciar piezas</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowAddRender(true)}>
                  <Upload size={13} /> Subir primer render
                </Button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto">
                <RenderCanvas
                  render={activeRender} piezas={piezas}
                  onCanvasClick={(x, y) => setPendingPos({ x, y })}
                  onMarcadorMove={(mid, x, y) => currentPlanilla && updateMarcador(currentPlanilla.id, activeRender.id, mid, x, y)}
                  onMarcadorDelete={mid => currentPlanilla && removeMarcador(currentPlanilla.id, activeRender.id, mid)}
                  onSelectPieza={setActivePiezaId}
                  activePiezaId={activePiezaId}
                />
                <p className="text-xs text-gray-700 text-center mt-2">
                  Click en el render para agregar una pieza · Arrastrá los marcadores para reposicionarlos
                </p>
              </div>
            )}
          </div>

          {/* Piece cards */}
          {piezas.length > 0 && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)] shrink-0 max-h-[38%] overflow-y-auto">
              <div className="px-4 py-2.5 border-b border-[var(--border)]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Detalle de piezas — {piezas.length} tipo{piezas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {piezas.map(p => (
                  <PiezaDetalleCard key={p.id} pieza={p} cantidad={getCantidad(p.id)}
                    onUpdateDetalle={(img, w, h) => currentPlanilla && updatePieza(currentPlanilla.id, p.id, { imagenDetalle: img, imagenDetalleW: w, imagenDetalleH: h })}
                    onEdit={() => setEditingPiezaId(p.id)}
                    onDelete={() => {
                      if (currentPlanilla) removePieza(currentPlanilla.id, p.id)
                      if (activePiezaId === p.id) setActivePiezaId(null)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={renderFileRef} type="file" accept="image/*" className="hidden" onChange={handleRenderUpload} />
      <input ref={replaceRenderFileRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceRender} />

      {/* Add render dialog */}
      {showAddRender && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRender(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-200">Agregar vista / render</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Nombre de la vista</label>
              <input autoFocus value={newRenderNombre} onChange={e => setNewRenderNombre(e.target.value)}
                placeholder="Vista Frente, Interior, Lateral..."
                onKeyDown={e => e.key === 'Enter' && renderFileRef.current?.click()}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none" />
            </div>
            <button onClick={() => renderFileRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 py-7 border-2 border-dashed border-[var(--border)] hover:border-brand-500/50 rounded-xl cursor-pointer transition-colors text-gray-500 hover:text-brand-400">
              <Upload size={22} />
              <span className="text-xs">Seleccionar imagen del render</span>
            </button>
          </div>
        </div>
      )}

      {/* Pieza form modal */}
      {pendingPos && currentPlanilla && (
        <PiezaFormModal piezas={piezas} onConfirm={handlePiezaFormConfirm} onCancel={() => setPendingPos(null)} />
      )}

      {/* Edit pieza modal */}
      {editingPiezaId && currentPlanilla && (() => {
        const pieza = piezas.find(p => p.id === editingPiezaId)
        if (!pieza) return null
        return (
          <EditPiezaModal
            pieza={pieza}
            onSave={data => updatePieza(currentPlanilla.id, editingPiezaId, data)}
            onClose={() => setEditingPiezaId(null)}
          />
        )
      })()}

      {/* PDF Preview modal */}
      {showPreview && currentPlanilla && evento && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center gap-4 px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] shrink-0">
            <h3 className="text-sm font-semibold text-gray-200">Vista previa del PDF</h3>
            {/* Renders per page control */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-gray-500">Renders por página:</span>
              <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
                {([1, 2] as const).map(n => (
                  <button key={n} onClick={() => setRendersPerPage(n)}
                    className={`w-8 h-7 text-xs font-medium cursor-pointer transition-colors ${rendersPerPage === n ? 'bg-brand-500/20 text-brand-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="primary" onClick={handleExportPDF} disabled={exportando}>
                <FileDown size={13} /> {exportando ? 'Generando...' : 'Descargar PDF'}
              </Button>
              <button onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[var(--surface-2)] cursor-pointer transition-all">
                <X size={18} />
              </button>
            </div>
          </div>
          <PDFViewer style={{ flex: 1, border: 'none' }}>
            <PlanillaPDF planilla={currentPlanilla} evento={evento} cliente={cliente} responsable={responsable} rendersPerPage={rendersPerPage} logoUrl={`${window.location.origin}/logo1.png`} />
          </PDFViewer>
        </div>
      )}
    </div>
  )
}
