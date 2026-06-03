import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  fetchEventos, saveEvento, deleteEventoDoc,
  fetchTrabajos, saveTrabajo, deleteTrabajoDoc,
  fetchUsuarios, saveUsuario,
  fetchClientes, saveCliente, deleteClienteDoc,
  fetchTareasPlantilla, saveTareasPlantilla,
  fetchTareasUsuario, saveTareaUsuario, deleteTareaUsuarioDoc,
  getUsuarioByUid,
  userFromFirestore,
} from '@/lib/db'
import type { Cliente, Evento, Usuario, TrabajoExterno, Tarea, PlanillaGrafica, TipoPieza, Pieza, TareaUsuario } from '@/types'
import { TIPO_PREFIX } from '@/types'
import { genId } from '@/lib/utils'

export interface TareaPlantilla {
  id: string
  titulo: string
  orden: number
}

interface AppState {
  // Auth
  currentUser: Usuario | null
  authLoading: boolean
  dataLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  initAuth: () => () => void
  loadAllData: () => Promise<void>

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

  // Tareas de Usuario
  tareasUsuario: TareaUsuario[]
  addTareaUsuario: (data: Omit<TareaUsuario, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => string
  updateTareaUsuario: (id: string, data: Partial<TareaUsuario>) => void
  deleteTareaUsuario: (id: string) => void

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


export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      authLoading: true,
      dataLoading: false,

      login: async (email, password) => {
        console.log('[auth] attempting login with:', email)
        await signInWithEmailAndPassword(auth, email, password)
        console.log('[auth] signInWithEmailAndPassword OK')
      },

      logout: async () => {
        await signOut(auth)
        set({
          currentUser: null,
          usuarios: [],
          clientes: [],
          eventos: [],
          trabajos: [],
        })
      },

      initAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              console.log('[auth] user signed in:', firebaseUser.email, 'uid:', firebaseUser.uid)
              // Load user profile from Firestore
              let profile = await getUsuarioByUid(firebaseUser.uid).catch((e) => {
                console.warn('[auth] getUsuarioByUid failed (will use fallback):', e?.code || e)
                return null
              })
              if (!profile) {
                // Fallback: build from Firebase Auth data
                const rawEmail = firebaseUser.email || ''
                const username = rawEmail.endsWith('@controlx.app')
                  ? rawEmail.replace('@controlx.app', '')
                  : rawEmail
                profile = userFromFirestore(firebaseUser.uid, {
                  username,
                  displayName: firebaseUser.displayName || username,
                  role: 'user',
                  createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                })
                console.log('[auth] using fallback profile:', profile)
              } else {
                console.log('[auth] profile loaded from Firestore:', profile)
              }
              set({ currentUser: profile, authLoading: false })
              await get().loadAllData()
            } else {
              console.log('[auth] no user session')
              set({
                currentUser: null,
                authLoading: false,
                usuarios: [],
                clientes: [],
                eventos: [],
                trabajos: [],
              })
            }
          } catch (e) {
            console.error('[auth] initAuth callback error:', e)
            set({ authLoading: false })
          }
        })
        return unsubscribe
      },

      loadAllData: async () => {
        set({ dataLoading: true })
        const userId = get().currentUser?.id || ''
        const [eventosR, clientesR, trabajosR, usuariosR, tareasR, tareasUsuarioR] = await Promise.allSettled([
          fetchEventos(),
          fetchClientes(),
          fetchTrabajos(),
          fetchUsuarios(),
          fetchTareasPlantilla(),
          userId ? fetchTareasUsuario(userId) : Promise.resolve([]),
        ])
        const names = ['eventos', 'clientes', 'trabajos', 'usuarios', 'tareasPlantilla', 'tareasUsuario']
        ;[eventosR, clientesR, trabajosR, usuariosR, tareasR, tareasUsuarioR].forEach((r, i) => {
          if (r.status === 'rejected') console.error(`[data] ${names[i]} failed:`, r.reason?.code || r.reason)
          else console.log(`[data] ${names[i]} loaded: ${(r.value as unknown[]).length ?? '?'} items`)
        })
        set({
          eventos:         eventosR.status        === 'fulfilled' ? eventosR.value        : [],
          clientes:        clientesR.status       === 'fulfilled' ? clientesR.value       : [],
          trabajos:        trabajosR.status       === 'fulfilled' ? trabajosR.value       : [],
          usuarios:        usuariosR.status       === 'fulfilled' ? usuariosR.value       : [],
          tareasPlantilla: tareasR.status         === 'fulfilled' ? tareasR.value         : get().tareasPlantilla,
          tareasUsuario:   tareasUsuarioR.status  === 'fulfilled' ? tareasUsuarioR.value  : [],
          dataLoading: false,
        })
      },

      usuarios: [],
      addUsuario: (data) => {
        const id = genId()
        const u: Usuario = { id, username: data.username, displayName: data.displayName, rol: data.rol, createdAt: new Date().toISOString() }
        set(s => ({ usuarios: [...s.usuarios, u] }))
        saveUsuario(u).catch(console.error)
      },
      updateUsuario: (id, data) => {
        set(s => ({ usuarios: s.usuarios.map(u => u.id === id ? { ...u, ...data } : u) }))
        const updated = get().usuarios.find(u => u.id === id)
        if (updated) saveUsuario(updated).catch(console.error)
      },
      deleteUsuario: (id) => set(s => ({ usuarios: s.usuarios.filter(u => u.id !== id) })),

      clientes: [],
      addCliente: (data) => {
        const id = genId()
        const c: Cliente = { ...data, id, createdAt: new Date().toISOString() }
        set(s => ({ clientes: [...s.clientes, c] }))
        saveCliente(c).catch(console.error)
        return id
      },
      updateCliente: (id, data) => {
        set(s => ({ clientes: s.clientes.map(c => c.id === id ? { ...c, ...data } : c) }))
        const updated = get().clientes.find(c => c.id === id)
        if (updated) saveCliente(updated).catch(console.error)
      },
      deleteCliente: (id) => {
        set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }))
        deleteClienteDoc(id).catch(console.error)
      },

      eventos: [],
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
        const e: Evento = { ...data, id, tareas, createdAt: now, updatedAt: now, createdBy: user?.id || '' }
        set(s => ({ eventos: [...s.eventos, e] }))
        saveEvento(e).catch(console.error)
        return id
      },
      updateEvento: (id, data) => {
        set(s => ({
          eventos: s.eventos.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e)
        }))
        const updated = get().eventos.find(e => e.id === id)
        if (updated) saveEvento(updated).catch(console.error)
      },
      deleteEvento: (id) => {
        set(s => ({ eventos: s.eventos.filter(e => e.id !== id) }))
        deleteEventoDoc(id).catch(console.error)
      },
      addTarea: (eventoId, tarea) => {
        const id = genId()
        const now = new Date().toISOString()
        set(s => ({
          eventos: s.eventos.map(e => e.id === eventoId
            ? { ...e, tareas: [...e.tareas, { ...tarea, id, createdAt: now }], updatedAt: now }
            : e)
        }))
        const updated = get().eventos.find(e => e.id === eventoId)
        if (updated) saveEvento(updated).catch(console.error)
      },
      updateTarea: (eventoId, tareaId, data) => {
        set(s => ({
          eventos: s.eventos.map(e => e.id === eventoId
            ? { ...e, tareas: e.tareas.map(t => t.id === tareaId ? { ...t, ...data } : t), updatedAt: new Date().toISOString() }
            : e)
        }))
        const updated = get().eventos.find(e => e.id === eventoId)
        if (updated) saveEvento(updated).catch(console.error)
      },
      deleteTarea: (eventoId, tareaId) => {
        set(s => ({
          eventos: s.eventos.map(e => e.id === eventoId
            ? { ...e, tareas: e.tareas.filter(t => t.id !== tareaId), updatedAt: new Date().toISOString() }
            : e)
        }))
        const updated = get().eventos.find(e => e.id === eventoId)
        if (updated) saveEvento(updated).catch(console.error)
      },

      tareasPlantilla: [],
      addTareaPlantilla: (titulo) => {
        const id = genId()
        set(s => {
          const updated = [...s.tareasPlantilla, { id, titulo, orden: s.tareasPlantilla.length }]
          saveTareasPlantilla(updated).catch(console.error)
          return { tareasPlantilla: updated }
        })
      },
      updateTareaPlantilla: (id, titulo) => {
        set(s => {
          const updated = s.tareasPlantilla.map(t => t.id === id ? { ...t, titulo } : t)
          saveTareasPlantilla(updated).catch(console.error)
          return { tareasPlantilla: updated }
        })
      },
      deleteTareaPlantilla: (id) => {
        set(s => {
          const updated = s.tareasPlantilla.filter(t => t.id !== id).map((t, i) => ({ ...t, orden: i }))
          saveTareasPlantilla(updated).catch(console.error)
          return { tareasPlantilla: updated }
        })
      },

      tareasUsuario: [],
      addTareaUsuario: (data) => {
        const id = genId()
        const now = new Date().toISOString()
        const userId = get().currentUser?.id || ''
        const t: TareaUsuario = { compartidaCon: [], ...data, id, userId, createdAt: now, updatedAt: now }
        set(s => ({ tareasUsuario: [...s.tareasUsuario, t] }))
        saveTareaUsuario(t).catch(console.error)
        return id
      },
      updateTareaUsuario: (id, data) => {
        set(s => ({
          tareasUsuario: s.tareasUsuario.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)
        }))
        const updated = get().tareasUsuario.find(t => t.id === id)
        if (updated) saveTareaUsuario(updated).catch(console.error)
      },
      deleteTareaUsuario: (id) => {
        const userId = get().currentUser?.id || ''
        set(s => ({ tareasUsuario: s.tareasUsuario.filter(t => t.id !== id) }))
        deleteTareaUsuarioDoc(userId, id).catch(console.error)
      },

      trabajos: [],
      addTrabajo: (data) => {
        const id = genId()
        const now = new Date().toISOString()
        const j: TrabajoExterno = { ...data, id, createdAt: now, updatedAt: now }
        set(s => ({ trabajos: [...s.trabajos, j] }))
        saveTrabajo(j).catch(console.error)
        return id
      },
      updateTrabajo: (id, data) => {
        set(s => ({
          trabajos: s.trabajos.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)
        }))
        const updated = get().trabajos.find(t => t.id === id)
        if (updated) saveTrabajo(updated).catch(console.error)
      },
      deleteTrabajo: (id) => {
        set(s => ({ trabajos: s.trabajos.filter(t => t.id !== id) }))
        deleteTrabajoDoc(id).catch(console.error)
      },

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
        const prefix = TIPO_PREFIX[data.tipo as TipoPieza]
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
        planillas: s.planillas,
        tareasPlantilla: s.tareasPlantilla,
        tareasUsuario: s.tareasUsuario,
        sidebarOpen: s.sidebarOpen,
        theme: s.theme,
      }),
    }
  )
)
