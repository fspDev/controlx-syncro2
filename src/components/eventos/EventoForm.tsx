import { useState } from 'react'
import type { Evento } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ESTADOS_EVENTO, estadoLabel } from '@/lib/utils'

type FormData = Omit<Evento, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'tareas'>

interface EventoFormProps {
  initial?: Partial<FormData>
  onSubmit: (data: FormData) => void
  onCancel: () => void
  submitLabel?: string
}

export function EventoForm({ initial, onSubmit, onCancel, submitLabel = 'Guardar' }: EventoFormProps) {
  const { clientes, usuarios } = useAppStore()

  const [form, setForm] = useState<FormData>({
    titulo: initial?.titulo || '',
    clienteId: initial?.clienteId || '',
    lugar: initial?.lugar || '',
    fabricacion: initial?.fabricacion || '',
    estado: initial?.estado || 'Negociacion',
    responsableId: initial?.responsableId || '',
    notas: initial?.notas || '',
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

  const clienteOpts = [
    { value: '', label: '— Sin cliente —' },
    ...clientes.map(c => ({ value: c.id, label: c.nombre }))
  ]
  const responsableOpts = [
    { value: '', label: '— Sin asignar —' },
    ...usuarios.map(u => ({ value: u.id, label: u.displayName || u.username }))
  ]
  const estadoOpts = ESTADOS_EVENTO.map(e => ({ value: e, label: estadoLabel(e) }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Título *" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Nombre del evento" required />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Cliente" value={form.clienteId} onChange={e => set('clienteId', e.target.value)} options={clienteOpts} />
        <Input label="Lugar" value={form.lugar} onChange={e => set('lugar', e.target.value)} placeholder="Nombre del lugar" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Estado" value={form.estado} onChange={e => set('estado', e.target.value as Evento['estado'])} options={estadoOpts} />
        <Select label="Responsable" value={form.responsableId || ''} onChange={e => set('responsableId', e.target.value)} options={responsableOpts} />
      </div>

      <Input label="Fabricación" value={form.fabricacion} onChange={e => set('fabricacion', e.target.value)} placeholder="Descripción de lo que se fabrica/arma" />

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

      <Textarea label="Notas internas" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Notas internas del equipo..." rows={3} />

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">{submitLabel}</Button>
      </div>
    </form>
  )
}
