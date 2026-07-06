import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { registerFcmToken } from '@/lib/fcm'
import { useAppStore } from '@/store/useAppStore'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const HORAS = Array.from({ length: 24 }, (_, i) => i)

export function NotificationBell() {
  const currentUser = useAppStore(s => s.currentUser)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [hora, setHora] = useState<number>(currentUser?.horaRecordatorio ?? 9)
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    setHora(currentUser?.horaRecordatorio ?? 9)
  }, [currentUser?.horaRecordatorio])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleActivar = async () => {
    if (!currentUser || loading) return
    setLoading(true)
    await registerFcmToken(currentUser.id)
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
    setLoading(false)
  }

  const handleSaveHora = async () => {
    if (!currentUser) return
    await updateDoc(doc(db, 'users', currentUser.id), { horaRecordatorio: hora })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Permiso denegado
  if (permission === 'denied') {
    return (
      <button title="Notificaciones bloqueadas — habilitá en la configuración del navegador" className="p-1.5 text-gray-600 cursor-not-allowed shrink-0">
        <BellOff size={16} />
      </button>
    )
  }

  // Permiso no solicitado aún
  if (permission !== 'granted') {
    return (
      <button
        onClick={handleActivar}
        title="Activar notificaciones push"
        disabled={loading}
        className={`relative p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)] transition-all cursor-pointer shrink-0 ${loading ? 'animate-pulse' : ''}`}
      >
        <Bell size={16} />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
      </button>
    )
  }

  // Permiso concedido — mostrar campana con dropdown de configuración
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        title="Configurar recordatorios"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[var(--surface-2)] transition-all cursor-pointer"
      >
        <Bell size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-300">Notificaciones activadas ✓</p>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Hora de recordatorio diario</label>
            <div className="flex items-center gap-2">
              <select
                value={hora}
                onChange={e => setHora(Number(e.target.value))}
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500/50"
              >
                {HORAS.map(h => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveHora}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-brand-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {saved ? <><Check size={12} /> Guardado</> : 'Guardar'}
              </button>
            </div>
            <p className="text-xs text-gray-600">Se envían recordatorios de tareas próximas a esta hora.</p>
          </div>
        </div>
      )}
    </div>
  )
}
