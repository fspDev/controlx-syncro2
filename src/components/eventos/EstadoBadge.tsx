import { Badge } from '@/components/ui/Badge'
import { ESTADO_COLORS, estadoLabel } from '@/lib/utils'
import type { EventoEstado } from '@/types'

export function EstadoBadge({ estado }: { estado: EventoEstado }) {
  const cols = ESTADO_COLORS[estado]
  return <Badge className={`${cols.bg} ${cols.text}`}>{estadoLabel(estado)}</Badge>
}
