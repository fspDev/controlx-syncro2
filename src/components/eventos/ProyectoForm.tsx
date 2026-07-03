import { useState } from 'react'
import type { Proyecto } from '@/types'
import { Button } from '@/components/ui/Button'
import { ProyectoRowFields } from '@/components/eventos/ProyectoRowFields'

export type ProyectoFormData = Omit<Proyecto, 'id' | 'tareas' | 'createdAt' | 'updatedAt'>

interface ProyectoFormProps {
  initial?: Partial<ProyectoFormData>
  onSubmit: (data: ProyectoFormData) => void
  onCancel: () => void
  submitLabel?: string
}

export function ProyectoForm({ initial, onSubmit, onCancel, submitLabel = 'Guardar' }: ProyectoFormProps) {
  const [form, setForm] = useState<ProyectoFormData>({
    clienteId: initial?.clienteId || '',
    estado: initial?.estado || 'Negociacion',
    responsableId: initial?.responsableId || '',
    fabricacion: initial?.fabricacion || '',
    importe: initial?.importe || 0,
    notas: initial?.notas || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProyectoRowFields value={form} onChange={setForm} />
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">{submitLabel}</Button>
      </div>
    </form>
  )
}
