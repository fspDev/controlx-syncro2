import { getToken } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { messaging, db } from '@/lib/firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

export async function registerFcmToken(userId: string): Promise<void> {
  try {
    if (!VAPID_KEY) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const msg = await messaging
    if (!msg) return

    // Registrar el service worker de FCM
    const swReg = await navigator.serviceWorker.register('/controlx-syncro2/firebase-messaging-sw.js', {
      scope: '/controlx-syncro2/',
    })

    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
    if (!token) return

    // Guardar token en Firestore (arrayUnion evita duplicados)
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token),
    })
  } catch (err) {
    console.warn('[FCM] No se pudo registrar token:', err)
  }
}
