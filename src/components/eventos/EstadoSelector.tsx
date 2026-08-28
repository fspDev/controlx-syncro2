import { useState, useRef, useEffect } from 'react'
import { PROYECTO_ESTADO_COLORS, ESTADOS_PROYECTO, proyectoEstadoLabel } from '@/lib/utils'
import type { ProyectoEstado } from '@/types'
import { ChevronDown, Check } from 'lucide-react'

export function EstadoSelector({ estado, onChange }: { estado: ProyectoEstado; onChange: (estado: ProyectoEstado) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cols = PROYECTO_ESTADO_COLORS[estado]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${cols.bg} ${cols.text}`}
      >
        {proyectoEstadoLabel(estado)}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
          {ESTADOS_PROYECTO.map(s => {
            const c = PROYECTO_ESTADO_COLORS[s]
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-left"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                <span className={`flex-1 ${c.text}`}>{proyectoEstadoLabel(s)}</span>
                {s === estado && <Check size={11} className="text-gray-500" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
