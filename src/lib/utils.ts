import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Cliente, Evento, EventoEstado, TrabajoEstado } from '@/types'

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
  'Cobrado':     { bg: 'bg-emerald-500/15',text: 'text-emerald-400' },
}

export const ESTADOS_EVENTO: EventoEstado[] = ['Negociacion', 'Confirmado', 'Armado', 'Finalizado', 'Cancelado']
export const ESTADOS_TRABAJO: TrabajoEstado[] = ['Pendiente', 'Cobrado']
export const MEDIOS_PAGO: string[] = ['Transferencia', 'Echeqs', 'Retenciones', 'Efectivo', 'Cheques físicos']

export function estadoLabel(estado: EventoEstado): string {
  if (estado === 'Negociacion') return 'Negociación'
  return estado
}

export function proyectoEstadosUnicos(evento: Evento): EventoEstado[] {
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

// Un evento se da por finalizado cuando pasó su fecha de desarme (o, si no tiene,
// la fecha de fin del evento). Los proyectos Cancelados no se tocan.
export function applyAutoFinalizado(evento: Evento): Evento {
  const cutoff = evento.desarme || evento.eventoFin
  if (!cutoff) return evento
  const cutoffEndOfDay = new Date(`${cutoff.slice(0, 10)}T23:59:59`)
  if (cutoffEndOfDay >= new Date()) return evento
  if (!evento.proyectos.some(p => p.estado !== 'Finalizado' && p.estado !== 'Cancelado')) return evento
  return {
    ...evento,
    proyectos: evento.proyectos.map(p => p.estado === 'Cancelado' ? p : { ...p, estado: 'Finalizado' }),
  }
}
