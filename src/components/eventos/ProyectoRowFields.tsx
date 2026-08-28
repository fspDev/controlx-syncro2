import type { Proyecto } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { MontoInput } from '@/components/ui/MontoInput'
import { ESTADOS_PROYECTO, proyectoEstadoLabel } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ProyectoFormData } from '@/components/eventos/ProyectoForm'

interface ProyectoRowFieldsProps {
  value: ProyectoFormData
  onChange: (data: ProyectoFormData) => void
  onRemove?: () => void
}

export function ProyectoRowFields({ value, onChange, onRemove }: ProyectoRowFieldsProps) {
  const { clientes, usuarios } = useAppStore()

  const set = (k: keyof ProyectoFormData, v: string | number) => onChange({ ...value, [k]: v })

  const clienteOpts = [
    { value: '', label: '— Sin cliente —' },
    ...clientes.map(c => ({ value: c.id, label: c.nombre }))
  ]
  const responsableOpts = [
    { value: '', label: '— Sin asignar —' },
    ...usuarios.map(u => ({ value: u.id, label: u.displayName || u.username }))
  ]
  const estadoOpts = ESTADOS_PROYECTO.map(e => ({ value: e, label: proyectoEstadoLabel(e) }))

  return (
    <div className="relative bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-3 right-3 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all">
          <X size={14} />
        </button>
      )}
      <Select label="Cliente" value={value.clienteId} onChange={e => set('clienteId', e.target.value)} options={clienteOpts} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Estado" value={value.estado} onChange={e => set('estado', e.target.value as Proyecto['estado'])} options={estadoOpts} />
        <Select label="Responsable" value={value.responsableId || ''} onChange={e => set('responsableId', e.target.value)} options={responsableOpts} />
      </div>
      <Input label="Fabricación" value={value.fabricacion} onChange={e => set('fabricacion', e.target.value)} placeholder="Descripción de lo que se fabrica/arma" />
      <MontoInput
        label="Importe ($)"
        value={value.importe}
        onChange={n => set('importe', n)}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-gray-200 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
      />
      <Textarea label="Notas" value={value.notas} onChange={e => set('notas', e.target.value)} placeholder="Notas internas de este proyecto..." rows={2} />
    </div>
  )
}
