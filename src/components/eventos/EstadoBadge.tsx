import { Badge } from '@/components/ui/Badge'
import { PROYECTO_ESTADO_COLORS, proyectoEstadoLabel } from '@/lib/utils'
import type { ProyectoEstado } from '@/types'

export function EstadoBadge({ estado }: { estado: ProyectoEstado }) {
  const cols = PROYECTO_ESTADO_COLORS[estado]
  return <Badge className={`${cols.bg} ${cols.text}`}>{proyectoEstadoLabel(estado)}</Badge>
}
