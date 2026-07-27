export type EventoEstado = 'Negociacion' | 'Confirmado' | 'Armado' | 'Finalizado' | 'Cancelado'
export type UserRol = 'admin' | 'administrativo' | 'user'
export type MedioPago = 'Transferencia' | 'Echeqs' | 'Retenciones' | 'Efectivo' | 'Cheques físicos'
export type TrabajoEstado = 'Pendiente' | 'Cobrado'

export interface Cliente {
  id: string
  nombre: string
  cuit?: string
  direccion?: string
  telefono?: string
  email?: string
  contacto?: string
  notas?: string
  createdAt: string
}

export interface Tarea {
  id: string
  titulo: string
  responsableId?: string
  completada: boolean
  createdAt: string
}

export interface Proyecto {
  id: string
  clienteId: string
  estado: EventoEstado
  responsableId?: string
  fabricacion: string
  importe: number
  notas: string
  tareas: Tarea[]
  renders?: string[]        // hasta 3 URLs de Storage, por proyecto
  createdAt: string
  updatedAt: string
}

export interface Evento {
  id: string
  titulo: string
  lugar: string
  proyectos: Proyecto[]
  armadoInicio?: string
  armadoFin?: string
  eventoInicio?: string
  eventoFin?: string
  desarme?: string
  renders?: string[]        // up to 3 base64 data URLs
  carpetaServidor?: string  // UNC path e.g. \\servidor\proyectos\nombre
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Usuario {
  id: string
  username: string
  displayName?: string
  rol: UserRol
  createdAt: string
  horaRecordatorio?: number  // hora del día (0-23), default 9
}

// ─── Planilla Gráfica ────────────────────────────────────────────────────────

export type TipoPieza = 'vinilo' | 'corporeo' | 'lona' | 'otro'

export const TIPO_LABEL: Record<TipoPieza, string> = {
  vinilo: 'Vinilo', corporeo: 'Corpóreo', lona: 'Lona', otro: 'Otro',
}
export const TIPO_PREFIX: Record<TipoPieza, string> = {
  vinilo: 'V', corporeo: 'C', lona: 'L', otro: 'O',
}
export const TIPO_COLOR_HEX: Record<TipoPieza, string> = {
  vinilo: '#16a34a', corporeo: '#2563eb', lona: '#ea580c', otro: '#9333ea',
}
export const SUBTIPOS: Record<TipoPieza, string[]> = {
  vinilo:   ['Cortado', 'Impreso', 'Impreso y Cortado'],
  corporeo: ['Crudo', 'Impreso', 'Pintado'],
  lona:     ['Front Light', 'Back Light', 'Mesh'],
  otro:     ['Otro'],
}

export interface Marcador {
  id: string
  piezaId: string
  x: number   // 0–100 % of render width
  y: number   // 0–100 % of render height
  sizeIndex?: number  // 0=default, 1=sm, 2=xs, 3=xl  (cycles on click)
}

export interface PlanillaRender {
  id: string
  nombre: string
  imagen: string   // base64
  natW: number     // natural image width (for PDF calculations)
  natH: number     // natural image height
  marcadores: Marcador[]
}

export interface Pieza {
  id: string
  label: string       // 'V1', 'C1', 'L1', etc.
  tipo: TipoPieza
  subtipo: string
  cantidad: number    // cantidad física a fabricar — manual, independiente de cuántas vistas la referencian
  ancho?: number      // mm
  alto?: number       // mm
  materialidad?: string
  imagenDetalle?: string  // base64 of finished artwork
  imagenDetalleW?: number // natural pixel width of imagenDetalle
  imagenDetalleH?: number // natural pixel height of imagenDetalle
}

export interface PlanillaInfoOverride {
  titulo?: string
  cliente?: string
  lugar?: string
  responsable?: string
}

export interface PlanillaGrafica {
  id: string
  eventoId: string
  renders: PlanillaRender[]
  piezas: Pieza[]
  infoOverride?: PlanillaInfoOverride
  createdAt: string
  updatedAt: string
}

// ─── Tareas de Usuario ───────────────────────────────────────────────────────

export type TareaUsuarioPrioridad = 'alta' | 'media' | 'baja'

export interface TareaUsuario {
  id: string
  titulo: string
  completada: boolean
  prioridad: TareaUsuarioPrioridad
  eventoId?: string        // link opcional a un proyecto
  fechaVencimiento?: string
  userId: string           // creador/dueño
  compartidaCon?: string[] // userIds con acceso compartido
  createdAt: string
  updatedAt: string
}

// ─── Trabajos ────────────────────────────────────────────────────────────────

export interface TrabajoExterno {
  id: string
  titulo: string
  descripcion?: string
  clienteNombre: string
  contacto?: string
  clienteAportaMaterial: boolean
  fechaEntrega?: string
  precioVenta: number
  medioPago: MedioPago
  estado: TrabajoEstado
  responsableId?: string
  notas?: string
  createdAt: string
  updatedAt: string
}

// ─── Administración ──────────────────────────────────────────────────────────

export interface RegistroAdmin {
  id: string
  proyectoId: string
  concepto: string
  formasPago: MedioPago[]
  pagado: boolean
  facturado: boolean
  updatedAt: string
}
