import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Cliente, Evento, ProyectoEstado, EventoEstadoAuto, TrabajoEstado } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  // Fecha "pura" (YYYY-MM-DD, sin hora — armadoInicio, eventoInicio, desarme,
  // etc.): se parsea a mano, igual que formatFechaISO(). new Date('2026-08-25')
  // se interpreta como medianoche UTC; en Argentina (UTC-3) eso retrocede al
  // día 24 al mostrarlo, aunque el valor guardado y editado sea el 25.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [anio, mes, dia] = dateStr.split('-')
    return `${dia}/${mes}/${anio}`
  }
  // Timestamp completo (createdAt/updatedAt): sí lleva hora real, la
  // conversión a huso horario local es la conducta correcta acá.
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
}

// ─── Cta Cte Proveedores: formato de montos y fechas ─────────────────────────

/** Descarta todo lo que no sea dígito. Los montos son enteros, sin decimales. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/** Convierte lo tipeado a entero. Cadena vacía o sin dígitos → 0. */
export function montoDesdeDigitos(valor: string): number {
  const digitos = soloDigitos(valor)
  return digitos ? parseInt(digitos, 10) : 0
}

/**
 * Entero → texto con separador de miles pero SIN símbolo de moneda: `40.000`.
 * Se usa mientras el campo está enfocado, para que los puntos vayan
 * apareciendo a medida que se tipea.
 */
export function formatMiles(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

/**
 * Monto para mostrar en la grilla: `$ 40.000`.
 * Cero se muestra como celda vacía y nunca se emite signo negativo — el tipo de
 * movimiento se codifica por color (a pagar rojo / pagado verde), no por signo.
 */
export function formatMontoProv(monto: number): string {
  if (!monto) return ''
  return formatCurrency(Math.abs(Math.trunc(monto)))
}

/**
 * Fecha de hoy como `YYYY-MM-DD` tomando los componentes locales.
 * `new Date().toISOString()` daría la fecha en UTC: pasadas las 21 h en
 * Argentina (UTC-3) devolvería el día siguiente.
 */
export function hoyISO(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/**
 * `YYYY-MM-DD` → `dd/mm/aa` partiendo el string, sin construir un Date.
 * `new Date('2026-07-31')` se interpreta como medianoche UTC y en Argentina
 * retrocede al día 30; por eso acá no se parsea.
 */
export function formatFechaISO(iso?: string): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.split('-')
  if (!anio || !mes || !dia) return iso
  return `${dia}/${mes}/${anio.slice(2)}`
}

// Estado del proyecto/stand — manual, lo cambia cualquier usuario.
const _PROYECTO_ESTADO_COLORS: Record<ProyectoEstado, { bg: string; text: string; dot: string }> = {
  Negociacion: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  Confirmado:  { bg: 'bg-blue-500/15',  text: 'text-blue-400',  dot: 'bg-blue-400' },
  Cancelado:   { bg: 'bg-red-500/15',   text: 'text-red-400',   dot: 'bg-red-400' },
}
// Proxy that falls back to Negociacion for unknown estado values (e.g. v1 data)
export const PROYECTO_ESTADO_COLORS = new Proxy(_PROYECTO_ESTADO_COLORS, {
  get(target, prop) {
    return (target as Record<string, unknown>)[prop as string] ?? target['Negociacion']
  },
}) as typeof _PROYECTO_ESTADO_COLORS

// Estado del evento — automático según cronología (ver eventoEstadoAuto()).
// Colores alineados con el calendario: azul=armado, marca=en curso, violeta=desarme.
export const EVENTO_ESTADO_COLORS: Record<EventoEstadoAuto, { bg: string; text: string; dot: string }> = {
  EnDesarrollo: { bg: 'bg-gray-500/15',   text: 'text-gray-400',   dot: 'bg-gray-400' },
  Armado:       { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  EnCurso:      { bg: 'bg-brand-500/15',  text: 'text-brand-400',  dot: 'bg-brand-400' },
  Desarme:      { bg: 'bg-violet-500/15', text: 'text-violet-400', dot: 'bg-violet-400' },
  Finalizado:   { bg: 'bg-emerald-500/15',text: 'text-emerald-400',dot: 'bg-emerald-400' },
}

export const TRABAJO_ESTADO_COLORS: Record<TrabajoEstado, { bg: string; text: string }> = {
  'Pendiente':   { bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  'Cobrado':     { bg: 'bg-emerald-500/15',text: 'text-emerald-400' },
}

export const ESTADOS_PROYECTO: ProyectoEstado[] = ['Negociacion', 'Confirmado', 'Cancelado']
export const ESTADOS_EVENTO_AUTO: EventoEstadoAuto[] = ['EnDesarrollo', 'Armado', 'EnCurso', 'Desarme', 'Finalizado']
export const ESTADOS_TRABAJO: TrabajoEstado[] = ['Pendiente', 'Cobrado']
export const MEDIOS_PAGO: string[] = ['Transferencia', 'Echeqs', 'Retenciones', 'Efectivo', 'Cheques físicos']

export function proyectoEstadoLabel(estado: ProyectoEstado): string {
  if (estado === 'Negociacion') return 'Negociación'
  return estado
}

const _EVENTO_ESTADO_AUTO_LABELS: Record<EventoEstadoAuto, string> = {
  EnDesarrollo: 'En desarrollo',
  Armado: 'Armado',
  EnCurso: 'En curso',
  Desarme: 'Desarme',
  Finalizado: 'Finalizado',
}
export function eventoEstadoAutoLabel(estado: EventoEstadoAuto): string {
  return _EVENTO_ESTADO_AUTO_LABELS[estado]
}

export function proyectoEstadosUnicos(evento: Evento): ProyectoEstado[] {
  return [...new Set(evento.proyectos.map(p => p.estado))]
}

export function proyectoClientesLabel(evento: Evento, clientes: Cliente[]): string {
  const nombres = evento.proyectos.map(p => clientes.find(c => c.id === p.clienteId)?.nombre || '—')
  if (nombres.length <= 2) return nombres.join(', ')
  return `${nombres.slice(0, 2).join(', ')} +${nombres.length - 2}`
}

export function proyectoResponsablesLabel(evento: Evento, usuarios: { id: string; displayName?: string; username: string }[]): string {
  const nombres = [...new Set(evento.proyectos.map(p => p.responsableId))]
    .filter((id): id is string => !!id)
    .map(id => usuarios.find(u => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map(u => u.displayName || u.username)
  if (nombres.length === 0) return 'Sin asignar'
  if (nombres.length === 1) return nombres[0]
  return 'Varios'
}

/**
 * Estado del evento según su cronología — nadie lo edita a mano, se recalcula
 * en cada render comparando la fecha de hoy contra las fechas del evento:
 *
 *   antes de armadoInicio        → EnDesarrollo
 *   [armadoInicio, eventoInicio) → Armado
 *   [eventoInicio, desarme)      → EnCurso
 *   [desarme, fin del día]       → Desarme
 *   después de (desarme|eventoFin) → Finalizado
 *
 * Se evalúa de "más tardío a más temprano" y se queda con el primer corte que
 * ya pasó, así que una fecha faltante simplemente no genera ese corte (el
 * evento salta directo a la fase siguiente que sí tenga fecha).
 * Comparación por string YYYY-MM-DD (no Date) por la misma razón que hoyISO():
 * evita corrimientos de huso horario.
 */
export function eventoEstadoAuto(evento: Pick<Evento, 'armadoInicio' | 'eventoInicio' | 'eventoFin' | 'desarme'>): EventoEstadoAuto {
  const hoy = hoyISO()
  const cutoffFinal = evento.desarme || evento.eventoFin
  if (cutoffFinal && hoy > cutoffFinal) return 'Finalizado'
  if (evento.desarme && hoy >= evento.desarme) return 'Desarme'
  if (evento.eventoInicio && hoy >= evento.eventoInicio) return 'EnCurso'
  if (evento.armadoInicio && hoy >= evento.armadoInicio) return 'Armado'
  return 'EnDesarrollo'
}
