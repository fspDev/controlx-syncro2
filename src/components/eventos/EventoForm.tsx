import { useState } from 'react'
import type { Evento } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type FormData = Omit<Evento, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'proyectos'>

interface EventoFormProps {
  initial?: Partial<FormData>
  onSubmit: (data: FormData) => void
  onCancel: () => void
  submitLabel?: string
}

export function EventoForm({ initial, onSubmit, onCancel, submitLabel = 'Guardar' }: EventoFormProps) {
  const [form, setForm] = useState<FormData>({
    titulo: initial?.titulo || '',
    lugar: initial?.lugar || '',
    armadoInicio: initial?.armadoInicio || '',
    armadoFin: initial?.armadoFin || '',
    eventoInicio: initial?.eventoInicio || '',
    eventoFin: initial?.eventoFin || '',
    desarme: initial?.desarme || '',
  })

  const set = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Título *" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Nombre del evento" required />

      <Input label="Lugar" value={form.lugar} onChange={e => set('lugar', e.target.value)} placeholder="Nombre del lugar" />

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400">Armado</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Inicio" type="date" value={form.armadoInicio || ''} onChange={e => set('armadoInicio', e.target.value)} />
          <Input label="Fin (opcional)" type="date" value={form.armadoFin || ''} onChange={e => set('armadoFin', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400">Fecha del Evento</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Inicio" type="date" value={form.eventoInicio || ''} onChange={e => set('eventoInicio', e.target.value)} />
          <Input label="Fin (opcional)" type="date" value={form.eventoFin || ''} onChange={e => set('eventoFin', e.target.value)} />
        </div>
      </div>

      <Input label="Desarme" type="date" value={form.desarme || ''} onChange={e => set('desarme', e.target.value)} />

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">{submitLabel}</Button>
      </div>
    </form>
  )
}
