import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { registerFcmToken } from '@/lib/fcm'
import { useAppStore } from '@/store/useAppStore'

export function NotificationBell() {
  const currentUser = useAppStore(s => s.currentUser)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  const handleClick = async () => {
    if (!currentUser || loading) return
    if (permission === 'granted') return
    setLoading(true)
    await registerFcmToken(currentUser.id)
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
    setLoading(false)
  }

  if (permission === 'granted') return null

  return (
    <button
      onClick={handleClick}
      title={permission === 'denied' ? 'Notificaciones bloqueadas en el navegador' : 'Activar notificaciones push'}
      disabled={loading || permission === 'denied'}
      className={`relative p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
        permission === 'denied'
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)]'
      } ${loading ? 'animate-pulse' : ''}`}
    >
      <Bell size={16} />
      {permission !== 'denied' && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
    </button>
  )
}
