import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cliente, Evento, Usuario, TrabajoExterno, Tarea, PlanillaGrafica, TipoPieza, Pieza } from '@/types'
import { TIPO_PREFIX, TIPO_COLOR_HEX } from '@/types'
import { genId } from '@/lib/utils'

const SEED_USUARIOS: Usuario[] = [
  { id: 'u1', username: 'admin', displayName: 'Admin', rol: 'admin', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', username: 'jane.doe', displayName: 'Jane Doe', rol: 'user', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u3', username: 'john.smith', displayName: 'John Smith', rol: 'user', createdAt: '2026-01-01T00:00:00Z' },
]

const SEED_CLIENTES: Cliente[] = [
  { id: 'c1', nombre: 'Familia González', contacto: 'Carlos González', telefono: '11-4455-6677', email: 'cgonzalez@mail.com', createdAt: '2026-01-10T00:00:00Z' },
  { id: 'c2', nombre: 'TechCorp Inc.', contacto: 'María López', telefono: '11-5544-3322', email: 'mlopez@techcorp.com', cuit: '30-71234567-8', createdAt: '2026-01-15T00:00:00Z' },
  { id: 'c3', nombre: 'Asociación de Marketing Digital', contacto: 'Pablo Fernández', telefono: '11-6677-8899', email: 'pablo@amd.org', createdAt: '2026-02-01T00:00:00Z' },
  { id: 'c4', nombre: 'Producciones Musicales Sonido Libre', contacto: 'Ana Rodríguez', telefono: '11-9988-7766', createdAt: '2026-02-10T00:00:00Z' },
]

const SEED_EVENTOS: Evento[] = [
  {
    id: 'e1', titulo: 'Boda en Viñedo', clienteId: 'c1', lugar: 'Viñedo Santa Rita',
    fabricacion: 'Estructuras de madera personalizadas', estado: 'Confirmado', responsableId: 'u2',
    tareas: [
      { id: 't1', titulo: 'Confirmar lista de invitados', responsableId: 'u2', completada: false, createdAt: '2026-05-01T00:00:00Z' },
      { id: 't2', titulo: 'Revisar pronóstico del tiempo', completada: false, createdAt: '2026-05-01T00:00:00Z' },
      { id: 't3', titulo: 'Coordinar con proveedor de flores', responsableId: 'u3', completada: true, createdAt: '2026-05-01T00:00:00Z' },
    ],
    notas: 'Evento al aire libre, tener plan B por lluvia.',
    armadoInicio: '2026-05-09', eventoInicio: '2026-05-10', desarme: '2026-05-11',
    createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-05-08T09:56:00Z', createdBy: 'u1',
  },
  {
    id: 'e2', titulo: 'Lanzamiento de Producto TechCorp', clienteId: 'c2', lugar: 'Centro de Convenciones Metropolitano',
    fabricacion: 'Stand modular con pantallas LED', estado: 'Confirmado', responsableId: 'u3',
    tareas: [
      { id: 't4', titulo: 'Entrega de materiales al proveedor', responsableId: 'u3', completada: true, createdAt: '2026-04-20T00:00:00Z' },
      { id: 't5', titulo: 'Prueba de pantallas LED', completada: false, createdAt: '2026-04-20T00:00:00Z' },
    ],
    notas: '',
    armadoInicio: '2026-05-12', eventoInicio: '2026-05-13', eventoFin: '2026-05-14', desarme: '2026-05-15',
    renders: ['/render-demo.jpg'],
    carpetaServidor: 'C:\\Users\\Usuario\\Desktop\\control-x-syncro',
    createdAt: '2026-03-15T00:00:00Z', updatedAt: '2026-05-08T00:00:00Z', createdBy: 'u1',
  },
  {
    id: 'e3', titulo: 'Conferencia Anual de Marketing', clienteId: 'c3', lugar: 'Hotel Grand Hyatt',
    fabricacion: 'Escenario principal y stands laterales', estado: 'Finalizado', responsableId: 'u2',
    tareas: [], notas: 'Evento finalizado sin inconvenientes.',
    armadoInicio: '2026-04-27', eventoInicio: '2026-04-28', desarme: '2026-04-29',
    createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-04-30T00:00:00Z', createdBy: 'u1',
  },
  {
    id: 'e4', titulo: 'Festival de Música Indie', clienteId: 'c4', lugar: 'Parque Bicentenario',
    fabricacion: 'Estructuras para escenario y backstage', estado: 'Negociacion', responsableId: undefined,
    tareas: [
      { id: 't6', titulo: 'Reunión inicial con cliente', completada: false, createdAt: '2026-04-01T00:00:00Z' },
    ],
    notas: 'Pendiente de confirmación de presupuesto.',
    eventoInicio: '2026-08-04',
    createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z', createdBy: 'u1',
  },
]

const SEED_TRABAJOS: TrabajoExterno[] = []

export interface TareaPlantilla {
  id: string
  titulo: string
  orden: number
}

interface AppState {
  // Auth
  currentUser: Usuario | null
  login: (username: string, password: string) => boolean
  logout: () => void

  // Usuarios
  usuarios: Usuario[]
  addUsuario: (data: Omit<Usuario, 'id' | 'createdAt'> & { password: string }) => void
  updateUsuario: (id: string, data: Partial<Usuario> & { password?: string }) => void
  deleteUsuario: (id: string) => void

  // Clientes
  clientes: Cliente[]
  addCliente: (data: Omit<Cliente, 'id' | 'createdAt'>) => string
  updateCliente: (id: string, data: Partial<Cliente>) => void
  deleteCliente: (id: string) => void

  // Eventos
  eventos: Evento[]
  addEvento: (data: Omit<Evento, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'tareas'>) => string
  updateEvento: (id: string, data: Partial<Evento>) => void
  deleteEvento: (id: string) => void
  addTarea: (eventoId: string, tarea: Omit<Tarea, 'id' | 'createdAt'>) => void
  updateTarea: (eventoId: string, tareaId: string, data: Partial<Tarea>) => void
  deleteTarea: (eventoId: string, tareaId: string) => void

  // Tareas Plantilla
  tareasPlantilla: TareaPlantilla[]
  addTareaPlantilla: (titulo: string) => void
  updateTareaPlantilla: (id: string, titulo: string) => void
  deleteTareaPlantilla: (id: string) => void

  // Trabajos Externos
  trabajos: TrabajoExterno[]
  addTrabajo: (data: Omit<TrabajoExterno, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTrabajo: (id: string, data: Partial<TrabajoExterno>) => void
  deleteTrabajo: (id: string) => void

  // Planilla Gráfica
  planillas: PlanillaGrafica[]
  getOrCreatePlanilla: (eventoId: string) => string
  addRenderToPlanilla: (planillaId: string, data: { nombre: string; imagen: string; natW: number; natH: number }) => string
  removeRender: (planillaId: string, renderId: string) => void
  addPieza: (planillaId: string, data: Omit<Pieza, 'id' | 'label'>) => string
  updatePieza: (planillaId: string, piezaId: string, data: Partial<Omit<Pieza, 'id' | 'label' | 'tipo'>>) => void
  removePieza: (planillaId: string, piezaId: string) => void
  addMarcador: (planillaId: string, renderId: string, piezaId: string, x: number, y: number) => string
  updateMarcador: (planillaId: string, renderId: string, marcadorId: string, x: number, y: number) => void
  sizeMarcador: (planillaId: string, renderId: string, marcadorId: string, sizeIndex: number) => void
  removeMarcador: (planillaId: string, renderId: string, marcadorId: string) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void

  theme: 'dark' | 'light' | 'system'
  setTheme: (t: 'dark' | 'light' | 'system') => void
}

// Simple password store (in real app this would be hashed server-side)
const passwords: Record<string, string> = { admin: 'admin123', 'jane.doe': 'jane123', 'john.smith': 'john123' }

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      login: (username, password) => {
        const usuarios = get().usuarios
        const user = usuarios.find(u => u.username === username)
        const storedPasswords = (get() as AppState & { _passwords?: Record<string, string> })._passwords || passwords
        if (user && storedPasswords[username] === password) {
          set({ currentUser: user })
          return true
        }
        return false
      },
      logout: () => set({ currentUser: null }),

      usuarios: SEED_USUARIOS,
      addUsuario: (data) => {
        const id = genId()
        passwords[data.username] = data.password
        set(s => ({ usuarios: [...s.usuarios, { id, username: data.username, displayName: data.displayName, rol: data.rol, createdAt: new Date().toISOString() }] }))
      },
      updateUsuario: (id, data) => {
        if (data.password) {
          const u = get().usuarios.find(u => u.id === id)
          if (u) passwords[u.username] = data.password
        }
        set(s => ({ usuarios: s.usuarios.map(u => u.id === id ? { ...u, ...data } : u) }))
      },
      deleteUsuario: (id) => set(s => ({ usuarios: s.usuarios.filter(u => u.id !== id) })),

      clientes: SEED_CLIENTES,
      addCliente: (data) => {
        const id = genId()
        set(s => ({ clientes: [...s.clientes, { ...data, id, createdAt: new Date().toISOString() }] }))
        return id
      },
      updateCliente: (id, data) => set(s => ({ clientes: s.clientes.map(c => c.id === id ? { ...c, ...data } : c) })),
      deleteCliente: (id) => set(s => ({ clientes: s.clientes.filter(c => c.id !== id) })),

      eventos: SEED_EVENTOS,
      addEvento: (data) => {
        const id = genId()
        const now = new Date().toISOString()
        const user = get().currentUser
        const plantilla = get().tareasPlantilla
        const tareas: Tarea[] = plantilla.sort((a, b) => a.orden - b.orden).map(tp => ({
          id: genId(),
          titulo: tp.titulo,
          completada: false,
          createdAt: now,
        }))
        set(s => ({ eventos: [...s.eventos, { ...data, id, tareas, createdAt: now, updatedAt: now, createdBy: user?.id || 'u1' }] }))
        return id
      },
      updateEvento: (id, data) => set(s => ({
        eventos: s.eventos.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e)
      })),
      deleteEvento: (id) => set(s => ({ eventos: s.eventos.filter(e => e.id !== id) })),
      addTarea: (eventoId, tarea) => {
        const id = genId()
        set(s => ({
          eventos: s.eventos.map(e => e.id === eventoId
            ? { ...e, tareas: [...e.tareas, { ...tarea, id, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }
            : e)
        }))
      },
      updateTarea: (eventoId, tareaId, data) => set(s => ({
        eventos: s.eventos.map(e => e.id === eventoId
          ? { ...e, tareas: e.tareas.map(t => t.id === tareaId ? { ...t, ...data } : t), updatedAt: new Date().toISOString() }
          : e)
      })),
      deleteTarea: (eventoId, tareaId) => set(s => ({
        eventos: s.eventos.map(e => e.id === eventoId
          ? { ...e, tareas: e.tareas.filter(t => t.id !== tareaId), updatedAt: new Date().toISOString() }
          : e)
      })),

      tareasPlantilla: [],
      addTareaPlantilla: (titulo) => {
        const id = genId()
        set(s => ({ tareasPlantilla: [...s.tareasPlantilla, { id, titulo, orden: s.tareasPlantilla.length }] }))
      },
      updateTareaPlantilla: (id, titulo) => set(s => ({
        tareasPlantilla: s.tareasPlantilla.map(t => t.id === id ? { ...t, titulo } : t)
      })),
      deleteTareaPlantilla: (id) => set(s => ({
        tareasPlantilla: s.tareasPlantilla.filter(t => t.id !== id).map((t, i) => ({ ...t, orden: i }))
      })),

      trabajos: SEED_TRABAJOS,
      addTrabajo: (data) => {
        const id = genId()
        const now = new Date().toISOString()
        set(s => ({ trabajos: [...s.trabajos, { ...data, id, createdAt: now, updatedAt: now }] }))
        return id
      },
      updateTrabajo: (id, data) => set(s => ({
        trabajos: s.trabajos.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)
      })),
      deleteTrabajo: (id) => set(s => ({ trabajos: s.trabajos.filter(t => t.id !== id) })),

      planillas: [],
      getOrCreatePlanilla: (eventoId) => {
        const existing = get().planillas.find(p => p.eventoId === eventoId)
        if (existing) return existing.id
        const id = genId()
        const now = new Date().toISOString()
        set(s => ({ planillas: [...s.planillas, { id, eventoId, renders: [], piezas: [], createdAt: now, updatedAt: now }] }))
        return id
      },
      addRenderToPlanilla: (planillaId, data) => {
        const id = genId()
        set(s => ({
          planillas: s.planillas.map(p => p.id === planillaId
            ? { ...p, renders: [...p.renders, { id, ...data, marcadores: [] }], updatedAt: new Date().toISOString() }
            : p)
        }))
        return id
      },
      removeRender: (planillaId, renderId) => set(s => ({
        planillas: s.planillas.map(p => p.id === planillaId
          ? { ...p, renders: p.renders.filter(r => r.id !== renderId), updatedAt: new Date().toISOString() }
          : p)
      })),
      addPieza: (planillaId, data) => {
        const id = genId()
        const piezas = get().planillas.find(p => p.id === planillaId)?.piezas || []
        const prefix = TIPO_PREFIX[data.tipo]
        const nums = piezas.filter(p => p.tipo === data.tipo).map(p => parseInt(p.label.slice(1)) || 0)
        const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
        const label = `${prefix}${nextNum}`
        set(s => ({
          planillas: s.planillas.map(p => p.id === planillaId
            ? { ...p, piezas: [...p.piezas, { id, label, ...data }], updatedAt: new Date().toISOString() }
            : p)
        }))
        return id
      },
      updatePieza: (planillaId, piezaId, data) => set(s => ({
        planillas: s.planillas.map(p => p.id === planillaId
          ? { ...p, piezas: p.piezas.map(pz => pz.id === piezaId ? { ...pz, ...data } : pz), updatedAt: new Date().toISOString() }
          : p)
      })),
      removePieza: (planillaId, piezaId) => set(s => ({
        planillas: s.planillas.map(p => p.id === planillaId
          ? {
              ...p,
              piezas: p.piezas.filter(pz => pz.id !== piezaId),
              renders: p.renders.map(r => ({ ...r, marcadores: r.marcadores.filter(m => m.piezaId !== piezaId) })),
              updatedAt: new Date().toISOString(),
            }
          : p)
      })),
      addMarcador: (planillaId, renderId, piezaId, x, y) => {
        const id = genId()
        set(s => ({
          planillas: s.planillas.map(p => p.id === planillaId
            ? {
                ...p,
                renders: p.renders.map(r => r.id === renderId
                  ? { ...r, marcadores: [...r.marcadores, { id, piezaId, x, y }] }
                  : r),
                updatedAt: new Date().toISOString(),
              }
            : p)
        }))
        return id
      },
      updateMarcador: (planillaId, renderId, marcadorId, x, y) => set(s => ({
        planillas: s.planillas.map(p => p.id === planillaId
          ? {
              ...p,
              renders: p.renders.map(r => r.id === renderId
                ? { ...r, marcadores: r.marcadores.map(m => m.id === marcadorId ? { ...m, x, y } : m) }
                : r),
            }
          : p)
      })),
      sizeMarcador: (planillaId, renderId, marcadorId, sizeIndex) => set(s => ({
        planillas: s.planillas.map(p => p.id === planillaId
          ? {
              ...p,
              renders: p.renders.map(r => r.id === renderId
                ? { ...r, marcadores: r.marcadores.map(m => m.id === marcadorId ? { ...m, sizeIndex } : m) }
                : r),
            }
          : p)
      })),
      removeMarcador: (planillaId, renderId, marcadorId) => set(s => ({
        planillas: s.planillas.map(p => p.id === planillaId
          ? {
              ...p,
              renders: p.renders.map(r => r.id === renderId
                ? { ...r, marcadores: r.marcadores.filter(m => m.id !== marcadorId) }
                : r),
              updatedAt: new Date().toISOString(),
            }
          : p)
      })),

      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),

      theme: 'dark',
      setTheme: (t) => set({ theme: t }),
    }),
    {
      name: 'controlx-store',
      partialize: (s) => ({
        currentUser: s.currentUser,
        usuarios: s.usuarios,
        clientes: s.clientes,
        eventos: s.eventos,
        trabajos: s.trabajos,
        tareasPlantilla: s.tareasPlantilla,
        planillas: s.planillas,
        sidebarOpen: s.sidebarOpen,
        theme: s.theme,
      }),
    }
  )
)
