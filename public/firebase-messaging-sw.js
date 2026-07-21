// v5 - skipWaiting + clients.claim para activacion inmediata
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim())
})

firebase.initializeApp({
  apiKey: "AIzaSyDyfjvBPYLBn_x8y5u29J1z8iz63xCvicM",
  authDomain: "control-x-prod.firebaseapp.com",
  projectId: "control-x-prod",
  storageBucket: "control-x-prod.firebasestorage.app",
  messagingSenderId: "965478460447",
  appId: "1:965478460447:web:2cf560dce2886ad194392a"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  console.log('[SW] onBackgroundMessage', JSON.stringify(payload))
  const title = payload.notification?.title || payload.data?.title || 'Control X'
  const body = payload.notification?.body || payload.data?.body || ''
  const url = payload.data?.url || payload.fcmOptions?.link || '/controlx-syncro2/'
  return self.registration.showNotification(title, {
    body,
    icon: '/controlx-syncro2/icon-192.png',
    badge: '/controlx-syncro2/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url },
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = 'https://fspdev.github.io' + (event.notification.data?.url || '/controlx-syncro2/')
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith('https://fspdev.github.io/controlx-syncro2') && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})
