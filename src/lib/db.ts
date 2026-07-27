import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Evento, Proyecto, Tarea, TrabajoExterno, Usuario, Cliente, TareaUsuario, RegistroAdmin, MedioPago } from '@/types'
import type { TareaPlantilla } from '@/store/useAppStore'
import { genId, applyAutoFinalizado } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Elimina recursivamente todos los valores `undefined` de un objeto/array.
 * Firestore rechaza `undefined` en cualquier nivel (incluso anidado dentro
 * de arrays como `tareas`), por lo que TODO lo que se escribe pasa por acá.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)) as unknown as T
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

function tsToIso(val: unknown): string {
  if (!val) return ''
  if (val instanceof Timestamp) return val.toDate().toISOString()
  if (typeof val === 'string') return val
  return ''
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeEstadoEvento(s: unknown): Proyecto['estado'] {
  const VALID: Proyecto['estado'][] = ['Negociacion', 'Confirmado', 'Armado', 'Finalizado', 'Cancelado']
  if (!s) return 'Negociacion'
  const str = String(s)
  // Exact match
  if (VALID.includes(str as Proyecto['estado'])) return str as Proyecto['estado']
  // Case-insensitive + accent-insensitive
  const lower = str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const MAP: Record<string, Proyecto['estado']> = {
    negociacion: 'Negociacion',
    confirmado: 'Confirmado',
    armado: 'Armado',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
  }
  return MAP[lower] ?? 'Negociacion'
}

// ─── Field mappers ────────────────────────────────────────────────────────────

function normalizeRol(rol: unknown): Usuario['rol'] {
  if (rol === 'contable') return 'administrativo' // nombre legado en Firestore
  if (rol === 'admin' || rol === 'administrativo' || rol === 'user') return rol
  return 'user'
}

export function userFromFirestore(id: string, data: Record<string, unknown>): Usuario {
  return {
    id,
    username: (data.username as string) || (data.email as string) || '',
    displayName: (data.displayName as string) || (data.username as string) || '',
    rol: normalizeRol(data.role || data.rol),
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    horaRecordatorio: typeof data.horaRecordatorio === 'number' ? data.horaRecordatorio : undefined,
  }
}

function tareasFromFirestore(tareas: unknown): Tarea[] {
  return (Array.isArray(tareas) ? tareas : []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    titulo: t.titulo as string,
    responsableId: t.responsableId as string | undefined,
    completada: Boolean(t.completada),
    createdAt: tsToIso(t.createdAt) || new Date().toISOString(),
  }))
}

function proyectoFromFirestore(id: string, data: Record<string, unknown>): Proyecto {
  return {
    id,
    clienteId: (data.clienteId as string) || (data.cliente as string) || '',
    estado: normalizeEstadoEvento(data.estado),
    responsableId: (data.responsableId as string) || undefined,
    fabricacion: (data.fabricacion as string) || '',
    importe: Number(data.importe ?? 0),
    notas: (data.notes as string) || (data.notas as string) || '',
    tareas: tareasFromFirestore(data.tareas),
    renders: Array.isArray(data.renders) ? (data.renders as string[]).filter(r => typeof r === 'string' && r.startsWith('https://')) : [],
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
  }
}

function eventoFromFirestore(id: string, data: Record<string, unknown>): Evento {
  const armado = (data.armado as Record<string, unknown>) || {}
  const fechaEvento = (data.fechaEvento as Record<string, unknown>) || {}
  const proyectosRaw = data.proyectos

  const proyectos: Proyecto[] = Array.isArray(proyectosRaw) && proyectosRaw.length > 0
    ? proyectosRaw.map((p: Record<string, unknown>) => proyectoFromFirestore((p.id as string) || genId(), p))
    : [proyectoFromFirestore(`${id}-legacy`, data)]

  return applyAutoFinalizado({
    id,
    titulo: (data.titulo as string) || '',
    lugar: (data.lugar as string) || '',
    proyectos,
    armadoInicio: tsToIso(armado.start) || (data.armadoInicio as string) || undefined,
    armadoFin: tsToIso(armado.end) || (data.armadoFin as string) || undefined,
    eventoInicio: tsToIso(fechaEvento.start) || (data.eventoInicio as string) || undefined,
    eventoFin: tsToIso(fechaEvento.end) || (data.eventoFin as string) || undefined,
    desarme: tsToIso(data.desarme) || (data.desarme as string) || undefined,
    carpetaServidor: (data.carpetaServidor as string) || undefined,
    renders: Array.isArray(data.renders) ? (data.renders as string[]) : [],
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
    createdBy: (data.createdBy as string) || '',
  })
}

function eventoToFirestore(e: Evento): Record<string, unknown> {
  // Only persist Storage URLs (https://), never base64 blobs
  const renderUrls = (e.renders || []).filter(r => r.startsWith('https://'))
  const doc: Record<string, unknown> = {
    ...e,
    renders: renderUrls,
    armadoInicio: e.armadoInicio || null,
    armadoFin: e.armadoFin || null,
    eventoInicio: e.eventoInicio || null,
    eventoFin: e.eventoFin || null,
    desarme: e.desarme || null,
    carpetaServidor: e.carpetaServidor || null,
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
    medioPago: (data.medioPago as TrabajoExterno['medioPago']) || 'Efectivo',
    estado: (data.estado as TrabajoExterno['estado']) === 'Cobrado' ? 'Cobrado' : 'Pendiente',
    responsableId: (data.responsableId as string) || undefined,
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

export function subscribeEventos(cb: (eventos: Evento[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'events'), snap => {
    cb(snap.docs.map(d => eventoFromFirestore(d.id, d.data() as Record<string, unknown>)))
  }, err => console.error('[onSnapshot events]', err))
}

export function subscribeClientes(cb: (clientes: Cliente[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'clientes'), snap => {
    cb(snap.docs.map(d => clienteFromFirestore(d.id, d.data() as Record<string, unknown>)))
  }, err => console.error('[onSnapshot clientes]', err))
}

export async function saveEvento(e: Evento, updatedBy?: string): Promise<void> {
  const data = stripUndefined(eventoToFirestore(e)) as Record<string, unknown>
  if (updatedBy) data.updatedBy = updatedBy
  await setDoc(doc(db, 'events', e.id), data, { merge: true })
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
  await setDoc(doc(db, 'external_jobs', j.id), stripUndefined(trabajoToFirestore(j)), { merge: true })
}

export async function deleteTrabajoDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'external_jobs', id))
}

// ─── Administración ─────────────────────────────────────────────────────────────

function registroAdminFromFirestore(id: string, data: Record<string, unknown>): RegistroAdmin {
  // formasPago viejo era un único valor (formaPago); si existe se envuelve en array
  const formasPago = Array.isArray(data.formasPago)
    ? data.formasPago as RegistroAdmin['formasPago']
    : data.formaPago ? [data.formaPago as MedioPago] : []
  return {
    id,
    proyectoId: (data.proyectoId as string) || '',
    concepto: (data.concepto as string) || '',
    formasPago,
    pagado: Boolean(data.pagado),
    facturado: Boolean(data.facturado),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
  }
}

export async function fetchRegistrosAdmin(): Promise<RegistroAdmin[]> {
  const snap = await getDocs(collection(db, 'registros_admin'))
  return snap.docs.map(d => registroAdminFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function saveRegistroAdmin(r: RegistroAdmin): Promise<void> {
  await setDoc(doc(db, 'registros_admin', r.id), stripUndefined({ ...r, updatedAt: new Date().toISOString() }), { merge: true })
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

export async function deleteUsuarioDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', id))
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function fetchClientes(): Promise<Cliente[]> {
  const snap = await getDocs(collection(db, 'clientes'))
  return snap.docs.map(d => clienteFromFirestore(d.id, d.data() as Record<string, unknown>))
}

export async function saveCliente(c: Cliente): Promise<void> {
  await setDoc(doc(db, 'clientes', c.id), stripUndefined({ ...c }), { merge: true })
}

export async function deleteClienteDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clientes', id))
}

// ─── Renders (Firebase Storage) ──────────────────────────────────────────────

export async function uploadRender(eventoId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `renders/${eventoId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function deleteRender(url: string): Promise<void> {
  if (!url.startsWith('https://')) return // skip legacy base64
  try {
    // Extract the path from the Storage URL: .../o/PATH?token=...
    const match = url.match(/\/o\/(.+?)\?/)
    if (!match) return
    const path = decodeURIComponent(match[1])
    await deleteObject(ref(storage, path))
  } catch {
    // already deleted or not found — ignore
  }
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

// ─── Carpeta Base ─────────────────────────────────────────────────────────────

export async function fetchCarpetaBase(): Promise<string> {
  const snap = await getDoc(doc(db, 'config', 'carpetaBase'))
  if (!snap.exists()) return ''
  return (snap.data() as { path?: string }).path || ''
}

export async function saveCarpetaBase(path: string): Promise<void> {
  await setDoc(doc(db, 'config', 'carpetaBase'), { path })
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
    compartidaCon: Array.isArray(data.compartidaCon) ? (data.compartidaCon as string[]) : [],
    createdAt: tsToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(data.updatedAt) || new Date().toISOString(),
  }
}

export async function fetchTareasUsuario(userId: string): Promise<TareaUsuario[]> {
  // Tareas propias + tareas compartidas con este usuario
  const col = collection(db, 'tareas_usuario')
  const [propiasSnap, compartidasSnap] = await Promise.all([
    getDocs(query(col, where('userId', '==', userId))),
    getDocs(query(col, where('compartidaCon', 'array-contains', userId))),
  ])
  const seen = new Set<string>()
  const results: TareaUsuario[] = []
  for (const d of [...propiasSnap.docs, ...compartidasSnap.docs]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    results.push(tareaUsuarioFromFirestore(d.id, d.data() as Record<string, unknown>))
  }
  return results
}

export async function saveTareaUsuario(t: TareaUsuario): Promise<void> {
  await setDoc(doc(db, 'tareas_usuario', t.id), {
    titulo: t.titulo,
    completada: t.completada,
    prioridad: t.prioridad,
    eventoId: t.eventoId || null,
    fechaVencimiento: t.fechaVencimiento || null,
    userId: t.userId,
    compartidaCon: t.compartidaCon,
    createdAt: t.createdAt,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteTareaUsuarioDoc(_userId: string, tareaId: string): Promise<void> {
  await deleteDoc(doc(db, 'tareas_usuario', tareaId))
}
