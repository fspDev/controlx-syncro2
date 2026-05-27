import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EventoEstado, TrabajoEstado } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
}

const _ESTADO_COLORS: Record<EventoEstado, { bg: string; text: string; dot: string }> = {
  Negociacion: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  Confirmado:  { bg: 'bg-blue-500/15',  text: 'text-blue-400',  dot: 'bg-blue-400' },
  Armado:      { bg: 'bg-violet-500/15',text: 'text-violet-400',dot: 'bg-violet-400' },
  Finalizado:  { bg: 'bg-emerald-500/15',text: 'text-emerald-400',dot: 'bg-emerald-400' },
  Cancelado:   { bg: 'bg-red-500/15',   text: 'text-red-400',   dot: 'bg-red-400' },
}
// Proxy that falls back to Negociacion for unknown estado values (e.g. v1 data)
export const ESTADO_COLORS = new Proxy(_ESTADO_COLORS, {
  get(target, prop) {
    return (target as Record<string, unknown>)[prop as string] ?? target['Negociacion']
  },
}) as typeof _ESTADO_COLORS

export const TRABAJO_ESTADO_COLORS: Record<TrabajoEstado, { bg: string; text: string }> = {
  'Pendiente':   { bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  'En Proceso':  { bg: 'bg-blue-500/15',   text: 'text-blue-400' },
  'Entregado':   { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  'Cobrado':     { bg: 'bg-emerald-500/15',text: 'text-emerald-400' },
}

export const ESTADOS_EVENTO: EventoEstado[] = ['Negociacion', 'Confirmado', 'Armado', 'Finalizado', 'Cancelado']
export const ESTADOS_TRABAJO: TrabajoEstado[] = ['Pendiente', 'En Proceso', 'Entregado', 'Cobrado']
export const MEDIOS_PAGO: string[] = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta']

export function estadoLabel(estado: EventoEstado): string {
  if (estado === 'Negociacion') return 'Negociación'
  return estado
}
