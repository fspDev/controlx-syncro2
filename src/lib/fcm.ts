import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { messaging, db } from '@/lib/firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

async function getSwRegistration(): Promise<ServiceWorkerRegistration> {
  // Reusa el SW existente si ya está registrado en este scope
  const existing = await navigator.serviceWorker.getRegistration('/controlx-syncro2/')
  if (existing) return existing
  return navigator.serviceWorker.register('/controlx-syncro2/firebase-messaging-sw.js', {
    scope: '/controlx-syncro2/',
  })
}

export async function registerFcmToken(userId: string): Promise<void> {
  try {
    if (!VAPID_KEY) { console.warn('[FCM] VAPID_KEY no configurada'); return }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const msg = await messaging
    if (!msg) return

    const swReg = await getSwRegistration()
    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
    if (!token) return

    await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) })
    console.log('[FCM] Token registrado OK')

    // Mostrar notificaciones cuando la app está en primer plano
    onMessage(msg, payload => {
      const { title, body } = payload.notification || {}
      if (!title) return
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/controlx-syncro2/icon-192.png',
        })
      }
    })
  } catch (err) {
    console.warn('[FCM] No se pudo registrar token:', err)
  }
}
