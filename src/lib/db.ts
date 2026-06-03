import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Evento, TrabajoExterno, Usuario, Cliente, TareaUsuario } from '@/types'
import type { TareaPlantilla } from '@/store/useAppStore'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tsToIso(val: unknown): string {
  if (!val) return ''
  if (val instanceof Timestamp) return val.toDate().toISOString()
  if (typeof val === 'string') return val
  return ''
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeEstadoEvento(s: unknown): Evento['estado'] {
  const VALID: Evento['estado'][] = ['Negociacion', 'Confirmado', 'Armado', 'Finalizado', 'Cancelado']
  if (!s) return 'Negociacion'
  const str = String(s)
  // Exact match
  if (VALID.includes(str as Evento['estado'])) return str as Evento['estado']
  // Case-insensitive + accent-insensitive
  const lower = str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const MAP: Record<string, Evento['estado']> = {
    negociacion: 'Negociacion',
    confirmado: 'Confirmado',
    armado: 'Armado',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
  }
  return MAP[lower] ?? 'Negociacion'
}

// ─── Field mappers ────────────────────────────────────────────────────────────

export function userFromFirestore(id: string, data: Record<string, unknown>): Usuario {
  return {
    id,
    username: (data.username as string) || (data.email as string) || '',
    displayName: (data.displayName as string) || (data.username as string) || '',
    rol: ((data.role || data.rol) as Usuario['rol']) || 'user',
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
  }
}

function eventoFromFirestore(id: string, data: Record<string, unknown>): Evento {
  const armado = (data.armado as Record<string, unknown>) || {}
  const fechaEvento = (data.fechaEvento as Record<string, unknown>) || {}
  const tareas = Array.isArray(data.tareas) ? data.tareas : []

  return {
    id,
    titulo: (data.titulo as string) || '',
    clienteId: (data.clienteId as string) || (data.cliente as string) || '',
    lugar: (data.lugar as string) || '',
    fabricacion: (data.fabricacion as string) || '',
    estado: normalizeEstadoEvento(data.estado),
    responsableId: (data.responsableId as string) || undefined,
    tareas: tareas.map((t: Record<string, unknown>) => ({
      id: t.id as string,
      titulo: t.titulo as string,
      responsableId: t.responsableId as string | undefined,
      completada: Boolean(t.completada),
      createdAt: tsToIso(t.createdAt) || new Date().toISOString(),
    })),
    notas: (data.notes as string) || (data.notas as string) || '',
    armadoInicio: tsToIso(armado.start) || (data.armadoInicio as string) || undefined,
    armadoFin: tsToIso(armado.end) || (data.armadoFin as string) || undefined,
    eventoInicio: tsToIso(fechaEvento.start) || (data.eventoInicio as string) || undefined,
    eventoFin: tsToIso(fechaEvento.end) || (data.eventoFin as string) || undefined,
    desarme: tsToIso(data.desarme) || (data.desarme as string) || undefined,
    carpetaServidor: (data.carpetaServidor as string) || undefined,
    renders: [],  // never loaded from Firestore — stored in localStorage only
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
    createdBy: (data.createdBy as string) || '',
  }
}

function eventoToFirestore(e: Evento): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { renders: _renders, ...rest } = e
  const doc: Record<string, unknown> = {
    ...rest,
    // keep flat fields for v2
    armadoInicio: e.armadoInicio || null,
    armadoFin: e.armadoFin || null,
    eventoInicio: e.eventoInicio || null,
    eventoFin: e.eventoFin || null,
    notas: e.notas,
    updatedAt: new Date().toISOString(),
  }
  // Also write nested format for v1 compat
  if (e.armadoInicio || e.armadoFin) {
    doc.armado = { start: e.armadoInicio || null, end: e.armadoFin || null }
  }
  if (e.eventoInicio || e.eventoFin) {
    doc.fechaEvento = { start: e.eventoInicio || null, end: e.eventoFin || null }
  }
  return doc
}

function trabajoFromFirestore(id: string, data: Record<string, unknown>): TrabajoExterno {
  return {
    id,
    titulo: (data.titulo as string) || '',
    descripcion: (data.descripcion as string) || undefined,
    clienteNombre: (data.cliente as string) || (data.clienteNombre as string) || '',
    contacto: (data.contacto as string) || undefined,
    clienteAportaMaterial: Boolean(data.materialAportadoPorCliente ?? data.clienteAportaMaterial),
    fechaEntrega: tsToIso(data.fechaEntrega) || undefined,
    precioVenta: Number(data.precio ?? data.precioVenta ?? 0),
    montoCobrado: Number(data.montoCobrado ?? 0),
    medioPago: (data.medioPago as TrabajoExterno['medioPago']) || 'Efectivo',
    estado: (data.estado as TrabajoExterno['estado']) || 'Pendiente',
    notas: (data.notas as string) || undefined,
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
  }
}

function trabajoToFirestore(j: TrabajoExterno): Record<string, unknown> {
  return {
    ...j,
    // write both v1 and v2 field names for compat
    cliente: j.clienteNombre,
    materialAportadoPorCliente: j.clienteAportaMaterial,
    precio: j.precioVenta,
    updatedAt: new Date().toISOString(),
  }
}

function clienteFromFirestore(id: string, data: Record<string, unknown>): Cliente {
  return {
    id,
    nombre: (data.nombre as string) || '',
    cuit: (data.cuit as string) || undefined,
    direccion: (data.direccion as string) || undefined,
    telefono: (data.telefono as string) || undefined,
    email: (data.email as string) || undefined,
    contacto: (data.contacto as string) || undefined,
    notas: (data.notas as string) || undefined,
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
  }
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export async function fetchEventos(): Promise<Evento[]> {
  const snap = await getDocs(collection(db, 'events'))
  return snap.docs.map(d => eventoFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function saveEvento(e: Evento): Promise<void> {
  await setDoc(doc(db, 'events', e.id), eventoToFirestore(e), { merge: true })
}

export async function deleteEventoDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'events', id))
}

// ─── Trabajos ─────────────────────────────────────────────────────────────────

export async function fetchTrabajos(): Promise<TrabajoExterno[]> {
  const snap = await getDocs(collection(db, 'external_jobs'))
  return snap.docs.map(d => trabajoFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function saveTrabajo(j: TrabajoExterno): Promise<void> {
  await setDoc(doc(db, 'external_jobs', j.id), trabajoToFirestore(j), { merge: true })
}

export async function deleteTrabajoDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'external_jobs', id))
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export async function fetchUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => userFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function getUsuarioByUid(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return userFromFirestore(snap.id, snap.data() as Record<string, unknown>)
}

export async function saveUsuario(u: Usuario): Promise<void> {
  await setDoc(doc(db, 'users', u.id), {
    username: u.username,
    displayName: u.displayName || '',
    role: u.rol,
    rol: u.rol,
    createdAt: u.createdAt,
  }, { merge: true })
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function fetchClientes(): Promise<Cliente[]> {
  const snap = await getDocs(collection(db, 'clientes'))
  return snap.docs.map(d => clienteFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function saveCliente(c: Cliente): Promise<void> {
  await setDoc(doc(db, 'clientes', c.id), c, { merge: true })
}

export async function deleteClienteDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clientes', id))
}

// ─── Tareas Plantilla (config/tareasPlantilla) ────────────────────────────────

export async function fetchTareasPlantilla(): Promise<TareaPlantilla[]> {
  const snap = await getDoc(doc(db, 'config', 'tareasPlantilla'))
  if (!snap.exists()) return []
  const data = snap.data() as { list?: TareaPlantilla[] }
  return Array.isArray(data.list) ? data.list : []
}

export async function saveTareasPlantilla(tareas: TareaPlantilla[]): Promise<void> {
  await setDoc(doc(db, 'config', 'tareasPlantilla'), { list: tareas })
}

// ─── Tareas de Usuario ────────────────────────────────────────────────────────

function tareaUsuarioFromFirestore(id: string, data: Record<string, unknown>): TareaUsuario {
  return {
    id,
    titulo: (data.titulo as string) || '',
    completada: Boolean(data.completada),
    prioridad: (data.prioridad as TareaUsuario['prioridad']) || 'media',
    eventoId: (data.eventoId as string) || undefined,
    fechaVencimiento: tsToIso(data.fechaVencimiento) || undefined,
    userId: (data.userId as string) || '',
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
  }
}

export async function fetchTareasUsuario(userId: string): Promise<TareaUsuario[]> {
  const snap = await getDocs(collection(db, 'tareas', userId, 'items'))
  return snap.docs.map(d => tareaUsuarioFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function saveTareaUsuario(t: TareaUsuario): Promise<void> {
  await setDoc(doc(db, 'tareas', t.userId, 'items', t.id), {
    titulo: t.titulo,
    completada: t.completada,
    prioridad: t.prioridad,
    eventoId: t.eventoId || null,
    fechaVencimiento: t.fechaVencimiento || null,
    userId: t.userId,
    createdAt: t.createdAt,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteTareaUsuarioDoc(userId: string, tareaId: string): Promise<void> {
  await deleteDoc(doc(db, 'tareas', userId, 'items', tareaId))
}
