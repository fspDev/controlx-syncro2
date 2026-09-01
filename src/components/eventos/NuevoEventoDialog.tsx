import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Dialog } from '@/components/ui/Dialog'
import { EventoForm } from '@/components/eventos/EventoForm'
import { ProyectoRowFields } from '@/components/eventos/ProyectoRowFields'
import type { ProyectoFormData } from '@/components/eventos/ProyectoForm'
import { genId } from '@/lib/utils'
import type { Evento } from '@/types'
import { Plus } from 'lucide-react'

const EMPTY_PROYECTO: ProyectoFormData = { clienteId: '', nombreStand: '', estado: 'Negociacion', responsableId: '', fabricacion: '', importe: 0, notas: '' }

interface NuevoEventoDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
  title?: string
  initial?: Partial<Omit<Evento, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'proyectos'>>
}

export function NuevoEventoDialog({ open, onClose, onCreated, title = 'Nuevo Evento', initial }: NuevoEventoDialogProps) {
  const { addEvento } = useAppStore()
  const [proyectos, setProyectos] = useState<{ key: string; data: ProyectoFormData }[]>([{ key: genId(), data: EMPTY_PROYECTO }])

  const handleClose = () => { setProyectos([{ key: genId(), data: EMPTY_PROYECTO }]); onClose() }

  const handleSubmit = (sharedData: Omit<Evento, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'proyectos'>) => {
    const id = addEvento({ ...sharedData, proyectos: proyectos.map(p => p.data) })
    setProyectos([{ key: genId(), data: EMPTY_PROYECTO }])
    onCreated(id)
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title} size="lg">
      <EventoForm initial={initial} onSubmit={handleSubmit} onCancel={handleClose} submitLabel="Crear Evento" />
      <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Proyectos / Clientes</p>
        {proyectos.map((p, idx) => (
          <ProyectoRowFields
            key={p.key}
            value={p.data}
            onChange={data => setProyectos(prev => prev.map((pr, i) => i === idx ? { ...pr, data } : pr))}
            onRemove={proyectos.length > 1 ? () => setProyectos(prev => prev.filter((_, i) => i !== idx)) : undefined}
          />
        ))}
        <button
          type="button"
          onClick={() => setProyectos(prev => [...prev, { key: genId(), data: EMPTY_PROYECTO }])}
          className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 cursor-pointer transition-colors"
        >
          <Plus size={14} /> Agregar otro proyecto
        </button>
      </div>
    </Dialog>
  )
}
