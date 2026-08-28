import { Badge } from '@/components/ui/Badge'
import { EVENTO_ESTADO_COLORS, eventoEstadoAuto, eventoEstadoAutoLabel } from '@/lib/utils'
import type { Evento } from '@/types'

// A diferencia de EstadoBadge (proyecto/stand), este estado es 100% automático
// según la cronología del evento — por eso no hay selector, solo lectura.
export function EventoEstadoBadge({ evento }: { evento: Pick<Evento, 'armadoInicio' | 'eventoInicio' | 'eventoFin' | 'desarme'> }) {
  const estado = eventoEstadoAuto(evento)
  const cols = EVENTO_ESTADO_COLORS[estado]
  return <Badge className={`${cols.bg} ${cols.text}`}>{eventoEstadoAutoLabel(estado)}</Badge>
}
