import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  subscribeProveedores, subscribeMovimientosProveedores,
  addProveedorDoc, addMovimientoProveedorDoc, updateMovimientoProveedorDoc, deleteMovimientoProveedorDoc,
} from '@/lib/db'
import { useAppStore } from '@/store/useAppStore'
import { genId, hoyISO } from '@/lib/utils'
import type { Proveedor, MovimientoProveedor, FormaPagoProv } from '@/types'

const DEBOUNCE_MS = 600

export type EstadoFila = 'guardando' | 'guardado' | 'error'

export interface FiltrosCtaCteProv {
  proveedorId: string
  servicio: string
  formaPago: FormaPagoProv | ''
  fechaDesde: string
  fechaHasta: string
  soloAPagar: boolean
  soloPagado: boolean
}

const FILTROS_VACIOS: FiltrosCtaCteProv = {
  proveedorId: '', servicio: '', formaPago: '',
  fechaDesde: '', fechaHasta: '', soloAPagar: false, soloPagado: false,
}

export interface MovimientoConSaldo extends MovimientoProveedor {
  saldo: number
}

// Campos editables por el usuario en una fila (lo que se persiste en cada autosave).
type CamposEditables = Pick<MovimientoProveedor, 'proveedorId' | 'servicio' | 'formaPago' | 'fecha' | 'aPagar' | 'pagado'>

/**
 * Compara fechas `YYYY-MM-DD` como texto (ordena igual que cronológicamente)
 * y usa `creadoEn` como desempate — el orden que pide la cuenta corriente.
 */
function compararMovimientos(a: MovimientoProveedor, b: MovimientoProveedor): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
  return a.creadoEn - b.creadoEn
}

export function useCtaCteProv() {
  const currentUserId = useAppStore(s => s.currentUser?.id)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoProveedor[]>([])
  const [loadingProveedores, setLoadingProveedores] = useState(true)
  const [loadingMovimientos, setLoadingMovimientos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estadoFilas, setEstadoFilas] = useState<Record<string, EstadoFila>>({})
  const [errorProveedor, setErrorProveedor] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<FiltrosCtaCteProv>(FILTROS_VACIOS)

  // Timer de debounce por fila — independiente para que editar dos filas
  // seguidas no haga que la segunda pise la escritura de la primera.
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Espejo del estado más reciente de movimientos: el timeout de una fila lee
  // de acá al disparar, para no capturar un closure con datos viejos.
  const movimientosRef = useRef<MovimientoProveedor[]>([])
  useEffect(() => { movimientosRef.current = movimientos }, [movimientos])

  useEffect(() => {
    const unsubProv = subscribeProveedores(
      lista => { setProveedores(lista); setLoadingProveedores(false) },
      () => { setError('No se pudieron cargar los proveedores.'); setLoadingProveedores(false) }
    )
    const unsubMov = subscribeMovimientosProveedores(
      lista => { setMovimientos(lista); setLoadingMovimientos(false) },
      () => { setError('No se pudieron cargar los movimientos.'); setLoadingMovimientos(false) }
    )
    return () => {
      unsubProv()
      unsubMov()
      Object.values(timersRef.current).forEach(clearTimeout)
      timersRef.current = {}
    }
  }, [])

  const proveedoresActivos = useMemo(() => proveedores.filter(p => p.activo), [proveedores])

  const nombrePorProveedorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of proveedores) map.set(p.id, p.nombre)
    return map
  }, [proveedores])

  const agregarProveedor = useCallback(async (nombreCrudo: string): Promise<boolean> => {
    const nombre = nombreCrudo.trim()
    if (!nombre) { setErrorProveedor('El nombre no puede estar vacío.'); return false }
    const yaExiste = proveedores.some(p => p.nombre.trim().toLowerCase() === nombre.toLowerCase())
    if (yaExiste) { setErrorProveedor('Ya existe un proveedor con ese nombre.'); return false }
    setErrorProveedor(null)
    try {
      await addProveedorDoc(genId(), nombre)
      return true
    } catch {
      setErrorProveedor('No se pudo guardar el proveedor. Intentá de nuevo.')
      return false
    }
  }, [proveedores])

  const agregarFila = useCallback(() => {
    const id = genId()
    const nuevo: MovimientoProveedor = {
      id,
      proveedorId: filtros.proveedorId || '',
      servicio: '',
      formaPago: '',
      fecha: hoyISO(),
      aPagar: 0,
      pagado: 0,
      creadoPor: currentUserId || undefined,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    }
    // Optimista: aparece en pantalla ya; la suscripción reconcilia cuando Firestore confirma.
    setMovimientos(prev => [...prev, nuevo])
    setEstadoFilas(prev => ({ ...prev, [id]: 'guardando' }))
    addMovimientoProveedorDoc(id, {
      proveedorId: nuevo.proveedorId, servicio: nuevo.servicio, formaPago: nuevo.formaPago,
      fecha: nuevo.fecha, aPagar: nuevo.aPagar, pagado: nuevo.pagado, creadoPor: nuevo.creadoPor,
    })
      .then(() => setEstadoFilas(prev => ({ ...prev, [id]: 'guardado' })))
      .catch(() => setEstadoFilas(prev => ({ ...prev, [id]: 'error' })))
  }, [filtros.proveedorId, currentUserId])

  const flushFila = useCallback((id: string) => {
    delete timersRef.current[id]
    const fila = movimientosRef.current.find(m => m.id === id)
    if (!fila) return
    const campos: CamposEditables = {
      proveedorId: fila.proveedorId, servicio: fila.servicio, formaPago: fila.formaPago,
      fecha: fila.fecha, aPagar: fila.aPagar, pagado: fila.pagado,
    }
    updateMovimientoProveedorDoc(id, campos)
      .then(() => setEstadoFilas(prev => ({ ...prev, [id]: 'guardado' })))
      .catch(() => setEstadoFilas(prev => ({ ...prev, [id]: 'error' })))
  }, [])

  const actualizarFila = useCallback((id: string, patch: Partial<CamposEditables>) => {
    setMovimientos(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
    setEstadoFilas(prev => ({ ...prev, [id]: 'guardando' }))
    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => flushFila(id), DEBOUNCE_MS)
  }, [flushFila])

  const eliminarFila = useCallback((id: string) => {
    // Cancela cualquier autosave pendiente de esta fila para que no reescriba
    // el documento justo después de borrarlo.
    if (timersRef.current[id]) { clearTimeout(timersRef.current[id]); delete timersRef.current[id] }
    // Optimista: desaparece ya. Si el borrado en Firestore falla, la
    // suscripción vuelve a reponer la fila en el próximo snapshot.
    setMovimientos(prev => prev.filter(m => m.id !== id))
    setEstadoFilas(prev => { const next = { ...prev }; delete next[id]; return next })
    deleteMovimientoProveedorDoc(id).catch(console.error)
  }, [])

  const hayFiltrosActivos = useMemo(() => (
    filtros.proveedorId !== '' || filtros.servicio.trim() !== '' || filtros.formaPago !== '' ||
    filtros.fechaDesde !== '' || filtros.fechaHasta !== '' || filtros.soloAPagar || filtros.soloPagado
  ), [filtros])

  const limpiarFiltros = useCallback(() => setFiltros(FILTROS_VACIOS), [])

  // Cuando hay un filtro "desde" activo, el saldo de las filas visibles no
  // arranca de cero: arrastra la deuda acumulada de todo lo anterior al
  // período (respetando el resto de los filtros que definen la cuenta).
  const hayPeriodo = filtros.fechaDesde !== ''

  // Filtrado + saldo corrido: memoizado porque recalcula sobre todo el set en
  // cada cambio de filtro/movimiento, y el saldo depende del orden acumulado
  // (no se puede paralelizar ni cachear por fila individual).
  //
  // El acumulado corre sobre TODAS las filas que matchean los filtros no-fecha,
  // ordenadas por fecha; la ventana [desde, hasta] solo decide cuáles se
  // muestran. Así el saldo de cada fila visible ya incluye lo de antes del
  // período (saldoAnterior) y la continuidad queda garantizada.
  const { filasConSaldo, saldoAnterior } = useMemo(() => {
    const matcheaNoFecha = (m: MovimientoProveedor) => {
      if (filtros.proveedorId && m.proveedorId !== filtros.proveedorId) return false
      if (filtros.servicio.trim() && !m.servicio.toLowerCase().includes(filtros.servicio.trim().toLowerCase())) return false
      if (filtros.formaPago && m.formaPago !== filtros.formaPago) return false
      if (filtros.soloAPagar && !m.aPagar) return false
      if (filtros.soloPagado && !m.pagado) return false
      return true
    }
    const base = [...movimientos].sort(compararMovimientos).filter(matcheaNoFecha)
    // Reduce inmutable: se acarrea el acumulado y el saldo anterior en el
    // estado del reduce, sin reasignar variables compartidas entre iteraciones.
    const resultado = base.reduce<{ acumulado: number; saldoAnterior: number; visibles: MovimientoConSaldo[] }>(
      (estado, m) => {
        const acumulado = estado.acumulado + m.aPagar - m.pagado
        if (filtros.fechaDesde && m.fecha < filtros.fechaDesde) {
          return { acumulado, saldoAnterior: acumulado, visibles: estado.visibles }
        }
        if (filtros.fechaHasta && m.fecha > filtros.fechaHasta) {
          return { ...estado, acumulado }
        }
        return { acumulado, saldoAnterior: estado.saldoAnterior, visibles: [...estado.visibles, { ...m, saldo: acumulado }] }
      },
      { acumulado: 0, saldoAnterior: 0, visibles: [] },
    )
    return { filasConSaldo: resultado.visibles, saldoAnterior: resultado.saldoAnterior }
  }, [movimientos, filtros])

  const totales = useMemo(() => {
    const aPagar = filasConSaldo.reduce((s, m) => s + m.aPagar, 0)
    const pagado = filasConSaldo.reduce((s, m) => s + m.pagado, 0)
    // Saldo final = última fila visible (que ya arrastra el saldo anterior); si
    // no hubo movimientos en el período, el final es el propio saldo anterior.
    const saldo = filasConSaldo.length > 0 ? filasConSaldo[filasConSaldo.length - 1].saldo : saldoAnterior
    return { aPagar, pagado, saldo, cantidad: filasConSaldo.length }
  }, [filasConSaldo, saldoAnterior])

  const proveedorFiltrado = filtros.proveedorId ? proveedores.find(p => p.id === filtros.proveedorId) : undefined

  return {
    proveedores, proveedoresActivos, nombrePorProveedorId,
    loading: loadingProveedores || loadingMovimientos,
    error,
    filasConSaldo, totales, saldoAnterior, hayPeriodo,
    filtros, setFiltros, hayFiltrosActivos, limpiarFiltros,
    proveedorFiltrado,
    estadoFilas,
    agregarProveedor, errorProveedor, setErrorProveedor,
    agregarFila, actualizarFila, eliminarFila,
    hayMovimientos: movimientos.length > 0,
  }
}
