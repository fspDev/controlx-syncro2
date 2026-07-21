importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDyfjvBPYLBn_x8y5u29J1z8iz63xCvicM",
  authDomain: "control-x-prod.firebaseapp.com",
  projectId: "control-x-prod",
  storageBucket: "control-x-prod.firebasestorage.app",
  messagingSenderId: "965478460447",
  appId: "1:965478460447:web:2cf560dce2886ad194392a"
})

const messaging = firebase.messaging()

// Mensajes data-only: onBackgroundMessage siempre controla el display
messaging.onBackgroundMessage(payload => {
  const { title, body, url } = payload.data || {}
  if (!title) return
  self.registration.showNotification(title, {
    body: body || '',
    icon: '/controlx-syncro2/icon-192.png',
    badge: '/controlx-syncro2/icon-192.png',
    data: { url: url || '/controlx-syncro2/' },
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/controlx-syncro2/'
  event.waitUntil(clients.openWindow('https://fspdev.github.io' + url))
})
