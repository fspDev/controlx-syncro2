import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { registerFcmToken } from '@/lib/fcm'
import { useAppStore } from '@/store/useAppStore'

export function NotificationBell() {
  const currentUser = useAppStore(s => s.currentUser)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  const handleClick = async () => {
    if (!currentUser) return
    if (permission === 'granted') return

    await registerFcmToken(currentUser.id)
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }

  if (permission === 'granted') return null

  return (
    <button
      onClick={handleClick}
      title="Activar notificaciones push"
      className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[var(--surface-2)] transition-all cursor-pointer shrink-0"
    >
      <Bell size={16} />
      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
    </button>
  )
}
