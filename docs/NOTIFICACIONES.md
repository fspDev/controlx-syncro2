# Notificaciones en Control X Syncro

Cómo funcionan las notificaciones de la app, tanto en celular (Android/PWA instalada) como en PC (navegador de escritorio). Documento generado a partir del código actual — si algo cambia en `src/lib/fcm.ts`, `functions/index.js` o `public/firebase-messaging-sw.js`, actualizar acá.

## Resumen de una línea

La app usa **Firebase Cloud Messaging (FCM) con payloads "data-only"**: el navegador/celular no recibe una notificación lista para mostrar, sino un paquete de datos (`title`, `body`, `url`) que un Service Worker (o el propio código de la app, si está en primer plano) transforma en una notificación del sistema operativo. Todo el envío se dispara desde **Cloud Functions**, nunca desde el navegador de otro usuario.

---

## 1. Los dos "carriles" de notificación

| | Push (FCM) | Recordatorio in-app (campanita) |
|---|---|---|
| Dónde vive | Service Worker + navegador/OS | Dropdown de configuración en el Header |
| Cuándo llega | Con la app cerrada, en segundo plano o en primer plano | Solo mientras la app está abierta y el usuario configura su hora |
| Quién dispara | Cloud Functions (triggers de Firestore + cron) | — (es solo la config de horario, el envío real también es FCM) |
| Requiere permiso del navegador | Sí | Sí (comparten el mismo permiso) |

No hay un "centro de notificaciones" propio dentro de la app (sin campana con historial/lista) — el ícono de campana (`NotificationBell.tsx`) es únicamente el control para **activar el permiso** y **configurar la hora del recordatorio diario**.

---

## 2. Flujo de activación (usuario ve la campana)

Archivo: [`src/components/ui/NotificationBell.tsx`](../src/components/ui/NotificationBell.tsx)

1. Al loguearse, la campana lee `Notification.permission` del navegador: `default`, `granted` o `denied`.
2. **`default`** → se muestra un ícono de campana con un punto ámbar. Al hacer click:
   - Se llama a `registerFcmToken(userId)` (ver sección 3).
   - El navegador muestra el prompt nativo de "permitir notificaciones".
3. **`denied`** → la campana queda gris, deshabilitada, con tooltip explicando que hay que habilitarlo manualmente desde la config del navegador. La app **no puede** volver a pedir el permiso por código una vez denegado (limitación del navegador, no de la app).
4. **`granted`** → la campana abre un dropdown donde el usuario elige una **hora del día (0–23)** para recibir recordatorios de tareas próximas a vencer. Se guarda en `users/{uid}.horaRecordatorio` (Firestore).

Este flujo es **idéntico en PC y en celular** — es el mismo componente React, sin ramas de código por plataforma. La diferencia real está en el sistema operativo/navegador de cada uno (ver sección 6).

---

## 3. Registro del token FCM (dueño real de "quién puede recibir push")

Archivo: [`src/lib/fcm.ts`](../src/lib/fcm.ts)

```
registerFcmToken(userId)
  → pide permiso al navegador (Notification.requestPermission())
  → si granted: registra/obtiene el Service Worker (firebase-messaging-sw.js)
  → getToken(messaging, { vapidKey, serviceWorkerRegistration })
  → guarda el token en users/{uid}.fcmTokens  (arrayUnion — un usuario puede tener varios tokens)
  → suscribe onMessage() para cuando la pestaña está en foreground
```

Puntos clave:
- **`fcmTokens` es un array**, no un string único: un mismo usuario logueado en el celu y en la PC tiene *dos* tokens distintos guardados, y ambos dispositivos reciben cada push.
- El registro se dispara automáticamente **cada vez que el usuario inicia sesión** (`useAppStore.ts`, línea ~178: `registerFcmToken(profile.id).catch(() => {})` dentro del listener de `onAuthStateChanged`). No hace falta que el usuario vuelva a tocar la campana en cada dispositivo nuevo — al loguearse ahí, si el permiso ya está `granted` (o lo concede en el momento), el token de ESE dispositivo se agrega solo.
- Si `VITE_FIREBASE_VAPID_KEY` no está configurada, la función corta silenciosamente (`console.warn`) — no rompe el login.

### Service Worker: por qué existe

`getSwRegistration()` registra explícitamente `public/firebase-messaging-sw.js` con `scope: '/controlx-syncro2/'`. Esto es necesario porque:
- Firebase Messaging **requiere** un Service Worker activo para poder entregar pushes cuando la pestaña no está en foreground (o directamente cerrada).
- El registro es idempotente: si ya hay un SW con ese mismo script en ese scope, reutiliza el registro existente en vez de duplicar.

---

## 4. Qué pasa cuando llega un push, según el estado de la app

Archivo del SW: [`public/firebase-messaging-sw.js`](../public/firebase-messaging-sw.js)

**A) App en primer plano (pestaña/app abierta y visible)**
- Firebase entrega el mensaje directo al JS de la página (no pasa por el SW).
- Lo captura el `onMessage()` registrado en `fcm.ts`, que arma una `new Notification(title, { body, icon })` manual.

**B) App en segundo plano o cerrada**
- El Service Worker recibe el evento vía `messaging.onBackgroundMessage(payload)`.
- Como el payload es **data-only** (nunca `notification: {...}`), es el SW el que decide el título/cuerpo/ícono y llama a `self.registration.showNotification(...)`.
- Se agrega vibración (`vibrate: [200,100,200]`) y un `badge` — esto solo tiene efecto visible en Android; en desktop el navegador lo ignora sin error.

**Por qué "data-only" y no `notification` payload:** con un payload data-only, el código de la app siempre controla el display (mismo formato en foreground y background), en vez de dejar que Firebase muestre automáticamente una notificación "genérica" cuando está en background y otra manual cuando está en foreground.

**Click en la notificación** (`notificationclick` en el SW):
- Busca si ya hay una pestaña/ventana abierta de la app (`https://fspdev.github.io/controlx-syncro2*`) y la enfoca, navegando a la URL específica del evento/tarea (`payload.data.url`, ej: `/proyectos/{eventoId}`).
- Si no hay ninguna abierta, abre una pestaña nueva (`clients.openWindow`).

---

## 5. Quién dispara las notificaciones (backend)

Archivo: [`functions/index.js`](../functions/index.js) — Cloud Functions v2, región `us-central1`.

Todo el envío pasa por `sendNotification(userId, { title, body, url })`, que:
1. Lee `users/{userId}.fcmTokens`.
2. Llama a `messaging.sendEachForMulticast(...)` (uno o varios tokens a la vez → uno o varios dispositivos).
3. Si algún token responde `invalid-registration-token` o `registration-token-not-registered` (dispositivo desinstaló la app, token vencido, etc.), lo **elimina automáticamente** del array en Firestore. Esto evita que `fcmTokens` crezca indefinidamente con tokens muertos.

### Triggers activos

| Trigger | Dispara cuando | Notifica a |
|---|---|---|
| `onEventoChanged` | Se actualiza un documento `events/{id}` y cambia el `responsableId` de un proyecto, o el `responsableId` de una tarea dentro de un proyecto | El nuevo responsable asignado |
| `onTareaUsuarioNueva` | Se crea una tarea personal (`tareas_usuario`) con `compartidaCon` no vacío | Cada usuario con quien se compartió |
| `onTareaUsuarioActualizada` | Se edita una tarea personal y se agregan nuevos usuarios a `compartidaCon` | Solo los usuarios *nuevos* agregados (no vuelve a notificar a los que ya estaban) |
| `recordatorioFechas` (cron, cada 1 hora) | — | Ver detalle abajo |
| `testNotification` (HTTP, manual) | `POST` a la Cloud Function con `{ userId }` | Ese usuario — para testear el pipeline sin esperar un trigger real |

### Cron `recordatorioFechas` — el más elaborado

Corre **cada hora**, en huso horario `America/Argentina/Buenos_Aires`, y filtra en cada corrida quién debe recibir algo **en esa hora exacta** según `users/{uid}.horaRecordatorio` (default `9` si el usuario nunca lo configuró — ver sección 2).

Revisa dos cosas:
- **Tareas** (`tareas_usuario`, `completada == false`): si vencen mañana → "Tarea vence mañana"; si vencen en 3 días → "Recordatorio de tarea".
- **Eventos**: si el `armadoInicio` es mañana → notifica a todos los responsables de proyectos y tareas de ese evento — "Armado mañana".

Al correr cada hora y comparar contra `horaRecordatorio`, cada usuario recibe sus recordatorios **una sola vez por día**, a la hora que eligió, sin necesidad de un cron por usuario.

---

## 6. Diferencias reales entre PC y celular

El código de la app **no tiene ramas por plataforma** — mismo `fcm.ts`, mismo Service Worker, mismo flujo de permiso. Las diferencias vienen del sistema operativo/navegador:

- **Android (Chrome u otro navegador con la PWA instalada o desde el navegador)**: soporta FCM + Service Worker de forma nativa. Notificaciones con vibración y badge, aparecen aunque la app esté cerrada, siempre que el sistema no haya matado el proceso en background agresivamente (algunos fabricantes — Xiaomi, Huawei — restringen esto por batería; es una limitación del OS, no de la app).
- **iOS/Safari**: Web Push solo funciona si la PWA fue **agregada a la pantalla de inicio** (instalada); Safari en pestaña normal no entrega push en background. No hay código especial acá — es una restricción de Apple sobre Web Push en general.
- **PC (Chrome, Edge, Firefox)**: mismo pipeline. La diferencia principal es que el usuario suele tener la pestaña abierta más seguido, por lo que muchos pushes se resuelven por la rama de foreground (`onMessage`) en vez de por el Service Worker.
- **Multi-dispositivo**: como `fcmTokens` es un array, el mismo usuario logueado en el celu y en la PC recibe la notificación en **ambos** a la vez — no hay lógica de "solo el dispositivo activo".

---

## 7. Configuración / requisitos para que todo esto funcione

- `VITE_FIREBASE_VAPID_KEY` (env var del frontend, Vite) — clave pública VAPID del proyecto Firebase, necesaria para `getToken()`.
- `public/firebase-messaging-sw.js` debe desplegarse en la raíz servida (`/controlx-syncro2/firebase-messaging-sw.js`) — está *hardcodeado* con la config de Firebase (`apiKey`, `projectId`, etc.) porque un Service Worker no tiene acceso a las env vars de Vite en build time.
- Cloud Functions deployadas (`firebase deploy --only functions`) para que los triggers y el cron estén activos — no corren solas, hay que deployarlas manualmente como el resto de la infra de este proyecto (reglas, índices).
- El usuario debe conceder el permiso de notificaciones del navegador — si lo bloquea, no hay forma de re-pedirlo por código; debe reactivarlo manualmente en la config del sitio.

---

## 8. Diagrama rápido del flujo completo

```
Usuario A cambia el responsable de un proyecto
        │
        ▼
Firestore: events/{id} se actualiza
        │
        ▼
Cloud Function onEventoChanged (trigger automático)
        │
        ▼
sendNotification(nuevoResponsableId, {title, body, url})
        │
        ▼
Lee users/{uid}.fcmTokens → uno o varios tokens (celu + PC)
        │
        ▼
messaging.sendEachForMulticast(...) → FCM envía a cada dispositivo
        │
   ┌────┴─────┐
   ▼          ▼
App abierta   App cerrada/background
(onMessage)   (Service Worker → onBackgroundMessage → showNotification)
   │          │
   ▼          ▼
Notification  Notificación del SO, con click → abre/enfoca
del navegador   la URL específica (ej: el proyecto asignado)
```
