import { useState, useEffect } from 'react'
import { Folder, FolderOpen, ChevronRight, ChevronLeft, AlertCircle, Loader2, Check } from 'lucide-react'

interface FolderItem {
  name: string
  path: string
}

interface FolderPickerProps {
  basePath: string          // carpeta raíz configurada
  agenteUrl: string         // URL del agente central
  onSelect: (path: string) => void
  onCancel: () => void
  current?: string          // ruta actualmente asignada
}

export function FolderPicker({ basePath, agenteUrl, onSelect, onCancel, current }: FolderPickerProps) {
  const [historial, setHistorial] = useState<string[]>([basePath])
  const [carpetaActual, setCarpetaActual] = useState(basePath)
  const [subcarpetas, setSubcarpetas] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seleccionada, setSeleccionada] = useState(current || '')

  const cargar = async (ruta: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${agenteUrl}/browse?path=${encodeURIComponent(ruta)}`)
      const data = await res.json()
      if (data.ok) {
        setSubcarpetas(data.folders)
        setCarpetaActual(ruta)
      } else {
        setError(`No se pudo leer la carpeta: ${data.error}`)
        setSubcarpetas([])
      }
    } catch {
      setError('Agente local no disponible. Iniciá el agente para navegar carpetas.')
      setSubcarpetas([])
    }
    setLoading(false)
  }

  useEffect(() => { cargar(basePath) }, [basePath])

  const entrar = (carpeta: FolderItem) => {
    setHistorial(h => [...h, carpeta.path])
    cargar(carpeta.path)
  }

  const volver = () => {
    if (historial.length <= 1) return
    const nuevo = [...historial]
    nuevo.pop()
    setHistorial(nuevo)
    cargar(nuevo[nuevo.length - 1])
  }

  // Mostrar ruta relativa a la base
  const rutaRelativa = carpetaActual.startsWith(basePath)
    ? carpetaActual.slice(basePath.length).replace(/^[/\\]/, '') || '(raíz)'
    : carpetaActual

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb / navegación */}
      <div className="flex items-center gap-2">
        <button
          onClick={volver}
          disabled={historial.length <= 1}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex-1 min-w-0 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5">
          <p className="text-xs text-gray-400 truncate font-mono" title={carpetaActual}>
            {rutaRelativa}
          </p>
        </div>
      </div>

      {/* Lista de carpetas */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl overflow-hidden min-h-[180px] max-h-[260px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-[180px] gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[180px] gap-2 px-4 text-center">
            <AlertCircle size={20} className="text-amber-400" />
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        ) : subcarpetas.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-gray-600 text-sm">
            Sin subcarpetas
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-s)]">
            {subcarpetas.map(f => {
              const esSel = seleccionada === f.path
              return (
                <div
                  key={f.path}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors group ${
                    esSel ? 'bg-brand-500/10' : 'hover:bg-[var(--surface-2)]'
                  }`}
                  onClick={() => setSeleccionada(f.path)}
                  onDoubleClick={() => entrar(f)}
                >
                  {esSel
                    ? <FolderOpen size={15} className="text-brand-400 shrink-0" />
                    : <Folder size={15} className="text-amber-400/70 shrink-0" />
                  }
                  <span className={`text-sm flex-1 truncate ${esSel ? 'text-brand-300 font-medium' : 'text-gray-300'}`}>
                    {f.name}
                  </span>
                  {esSel && <Check size={13} className="text-brand-400 shrink-0" />}
                  <button
                    onClick={e => { e.stopPropagation(); entrar(f) }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-gray-300 transition-all cursor-pointer shrink-0"
                    title="Entrar a esta carpeta"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Carpeta seleccionada + acciones */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {seleccionada ? (
            <p className="text-xs text-gray-400 truncate font-mono" title={seleccionada}>
              <span className="text-gray-600">Seleccionada: </span>{seleccionada}
            </p>
          ) : (
            <p className="text-xs text-gray-600">Hacé clic en una carpeta para seleccionarla</p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-200 cursor-pointer transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => seleccionada && onSelect(seleccionada)}
          disabled={!seleccionada}
          className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          Asignar carpeta
        </button>
      </div>
    </div>
  )
}
