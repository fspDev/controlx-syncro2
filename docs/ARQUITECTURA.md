# Control X Syncro — Arquitectura y flujo de funcionamiento

Documento de referencia para entender cómo está construida la plataforma y poder
armar otra de características similares. Describe el stack, la estructura, el flujo
de datos, la autenticación, los permisos y el despliegue.

---

## 1. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework UI | React 19 + TypeScript |
| Bundler / dev server | Vite 8 |
| Estilos | Tailwind CSS v4 (con `@tailwindcss/vite`) |
| Componentes base | Radix UI (dialog, select, checkbox, tooltip, etc.) |
| Íconos | lucide-react |
| Estado global | Zustand 5 (con middleware `persist`) |
| Persistencia local | IndexedDB (adaptador propio en `lib/idbStorage.ts`) |
| Backend / BaaS | Firebase (Auth, Firestore, Storage, Cloud Messaging, Cloud Functions v2) |
| Ruteo | react-router-dom 7 |
| PDFs | @react-pdf/renderer |
| Fechas | date-fns |
| Hosting / CI | GitHub Pages + GitHub Actions |

**Idea central:** es una SPA sin backend propio. Toda la lógica de negocio vive en
el cliente; Firebase provee autenticación, base de datos en tiempo real,
almacenamiento de archivos y notificaciones push. Las reglas de seguridad de
Firestore son el único "backend" que valida permisos.

---

## 2. Estructura de carpetas

```
src/
├── App.tsx                 # Router + ThemeProvider + arranque de auth
├── main.tsx                # Punto de entrada; registra el service worker (FCM + PWA)
├── firebase-messaging-sw.js (en /public)  # Service worker único (push + instalabilidad)
├── lib/
│   ├── firebase.ts         # Init de Firebase (app, auth, db, storage, messaging)
│   ├── db.ts               # TODA la capa de acceso a Firestore/Storage (fetch/save/subscribe + mappers)
│   ├── fcm.ts              # Registro de token FCM en el cliente
│   ├── idbStorage.ts       # Adaptador IndexedDB para el persist de Zustand
│   ├── notifications.ts    # Hook de notificaciones in-app (si aplica)
│   └── utils.ts            # Helpers puros: formato, labels, colores, cálculos de estado
├── store/
│   └── useAppStore.ts      # Store Zustand: estado + acciones + auth + carga de datos
├── types/
│   └── index.ts            # Todas las interfaces del dominio + constantes derivadas
├── pages/                  # Una página por ruta
├── components/
│   ├── layout/             # Layout, Sidebar, BottomNav, Header
│   ├── eventos/            # Formularios y badges del dominio "evento/proyecto"
│   ├── ctaCteProv/         # Feature de cuenta corriente de proveedores
│   ├── pdf/                # Documentos PDF (@react-pdf)
│   └── ui/                 # Componentes reutilizables (Button, Input, Dialog, MontoInput...)
functions/                  # Cloud Functions v2 (notificaciones, triggers, cron)
firestore.rules             # Reglas de seguridad (el "backend" de permisos)
firestore.indexes.json      # Índices compuestos de Firestore
```

**Regla de oro de la arquitectura:** ningún componente habla con Firestore
directamente. Todo pasa por `lib/db.ts` (acceso a datos) y por `store/useAppStore.ts`
(estado + acciones). Los componentes solo leen del store y llaman acciones.

---

## 3. Modelo de datos (dominio)

Definido en `src/types/index.ts`. Entidades principales:

- **Usuario** — `{ id, username, displayName, rol, permisos?, horaRecordatorio? }`.
  Roles: `admin | administrativo | user`. `permisos` habilita features puntuales
  (ej. `ctaCteProv`).
- **Cliente** — datos de contacto de un cliente.
- **Evento** — agrupa proyectos. Tiene fechas (armado/evento/desarme), lugar y un
  array embebido de **Proyecto**.
- **Proyecto (stand)** — dentro de un evento: `{ clienteId, nombreStand?, estado,
  responsableId?, importe, tareas[], renders[] }`. Un evento puede tener varios
  clientes, cada uno con uno o más proyectos.
- **Tarea** — subtarea de un proyecto (embebida en el proyecto).
- **TareaUsuario** — tareas personales, con compartición (`compartidaCon[]`).
- **TrabajoExterno** — trabajos sueltos con estado de cobro.
- **RegistroAdmin** — datos administrativos de un proyecto (pagos parciales,
  facturado, nº de factura). Colección aparte, vinculada por `proyectoId`.
- **Proveedor / MovimientoProveedor** — cuenta corriente de proveedores.
- **PlanillaGrafica** — renders + piezas + marcadores para producción gráfica.

**Decisión de modelado clave:** los **proyectos y tareas van embebidos dentro del
documento del evento** (no en colecciones separadas). Guardar un cambio en un
proyecto reescribe el evento completo (`saveEvento`). Esto simplifica las lecturas
(un solo doc trae todo el evento) a costa de escrituras más grandes. Lo
administrativo (`RegistroAdmin`) sí es colección aparte porque cambia con otra
frecuencia y tiene otros permisos.

Colecciones en Firestore: `events`, `clientes`, `users`, `external_jobs`,
`registros_admin`, `tareas_usuario`, `proveedores`, `movimientos_proveedores`,
`config` (docs sueltos como `tareasPlantilla`, `carpetaBase`).

---

## 4. Capa de acceso a datos (`lib/db.ts`)

Patrón uniforme por entidad:

- `fetchX()` — lectura puntual (`getDocs`).
- `subscribeX(cb, onError)` — suscripción en tiempo real (`onSnapshot`). Se usa
  para lo que tiene que estar siempre fresco entre dispositivos (eventos, clientes).
- `saveX(obj)` — `setDoc(..., { merge: true })`.
- `deleteXDoc(id)`.
- **Mappers** `xFromFirestore(id, data)` / `xToFirestore(obj)` — traducen entre el
  shape de Firestore (que puede tener campos legados, Timestamps, formatos viejos)
  y el shape limpio de TypeScript. Acá se normalizan estados, se filtran URLs
  válidas, se aplican fallbacks de compatibilidad, etc.

Dos utilidades transversales importantes:

- `stripUndefined(obj)` — Firestore rechaza `undefined` en cualquier nivel
  (incluso anidado en arrays). Todo lo que se escribe pasa por acá.
- `tsToIso(val)` — convierte Timestamp de Firestore a string ISO; las fechas se
  manejan como strings `YYYY-MM-DD` en el dominio para evitar corrimientos por
  zona horaria y para que ordenen lexicográfico = cronológico.

---

## 5. Estado global (`store/useAppStore.ts`)

Un único store Zustand con `persist` sobre IndexedDB. Contiene:

- **Estado de auth**: `currentUser`, `authLoading`, `dataLoading`.
- **Colecciones en memoria**: `usuarios`, `clientes`, `eventos`, `trabajos`,
  `registrosAdmin`, `tareasUsuario`, `tareasPlantilla`, `planillas`, etc.
- **Acciones CRUD** por entidad. Patrón: **actualización optimista** — primero se
  actualiza el estado local (la UI reacciona al instante) y en paralelo se dispara
  el guardado en Firestore con `.catch(console.error)`. Las suscripciones
  `onSnapshot` reconcilian si el servidor difiere.
- **UI**: `sidebarOpen`, `theme`.

Ejemplo del patrón (proyecto embebido en evento):

```ts
updateProyecto: (eventoId, proyectoId, data) => {
  const now = new Date().toISOString()
  set(s => ({ eventos: s.eventos.map(e => e.id === eventoId
    ? { ...e, proyectos: e.proyectos.map(p => p.id === proyectoId ? { ...p, ...data, updatedAt: now } : p), updatedAt: now }
    : e) }))
  const updated = get().eventos.find(e => e.id === eventoId)
  if (updated) saveEvento(updated, get().currentUser?.id).catch(console.error)
}
```

---

## 6. Flujo de autenticación y arranque

1. `App.tsx` monta y llama `initAuth()` (una vez, en `useEffect`).
2. `initAuth()` registra `onAuthStateChanged`. Cuando hay sesión Firebase:
   - Busca el perfil del usuario en Firestore (`getUsuarioByUid`). Si no existe,
     arma un perfil de fallback con rol `user`.
   - Setea `currentUser` y baja `authLoading`.
   - Registra el token FCM para push (`registerFcmToken`).
   - Abre suscripciones en tiempo real de `eventos` y `clientes`.
   - Llama `loadAllData()` para traer el resto (con `Promise.allSettled`, así una
     colección que falle por permisos no tumba las demás).
3. Sin sesión → limpia el estado y `Layout` redirige a `/login`.
4. `login(email, password)` usa `signInWithEmailAndPassword`. El `onAuthStateChanged`
   se encarga del resto (no hay lógica de carga en el login mismo).

**Detalle de creación de usuarios:** para que un admin cree cuentas sin
desloguearse, se usa una **segunda instancia de Firebase** (`secondaryAuth`).
`createUserWithEmailAndPassword` loguea automáticamente en la instancia donde se
llama; usando una app aparte, la sesión del admin no se toca.

---

## 7. Ruteo y permisos de UI

- Rutas en `App.tsx`. Todo cuelga de `<Layout>` salvo `/login`. `basename` =
  `/controlx-syncro2` (porque se sirve desde un subpath en GitHub Pages).
- `Layout` protege: si no hay `currentUser`, redirige a login.
- Los permisos por rol se aplican en **dos niveles**:
  1. **UI** — la página hace un early-return con `<Navigate>` si el rol no
     corresponde (ej. Administración solo `admin`/`administrativo`), y la
     Sidebar/BottomNav esconden los links.
  2. **Firestore Rules** — el gate REAL. La UI es solo conveniencia; cualquiera
     con la consola del navegador podría montar un componente igual, así que la
     seguridad vive en las reglas del servidor.

---

## 8. Reglas de seguridad (`firestore.rules`)

Es el backend de permisos. Patrones usados:

- Helpers `isAuth()`, `isAdmin()` (lee el rol del doc del usuario con `get(...)`),
  `tieneCtaCteProv()` (lee `permisos`).
- **Defensivo con `.get('campo', default)`**: leer `data.rol` directo revienta si
  el doc todavía no tiene ese campo y deniega hasta a un admin. Usar
  `.get('rol', '')` no explota.
- **Validación de escritura** por colección: tipos, longitudes, rangos numéricos,
  existencia de referencias (ej. que el `proveedorId` exista).
- **Restricciones finas**: un usuario solo puede editar su propio doc en dos
  campos (`fcmTokens`, `horaRecordatorio`) — si pudiera tocar cualquier campo se
  auto-asignaría permisos. Un movimiento de cta cte solo lo borra quien lo creó
  (`resource.data.creadoPor == request.auth.uid`).

Regla práctica: **el nombre de la colección en las reglas tiene que coincidir
exacto con el usado en `db.ts`** (fue una fuente de bugs: `external_jobs` no
`trabajos`, `registros_admin` no `registrosAdmin`).

---

## 9. Notificaciones push (FCM) — ver también `docs/NOTIFICACIONES.md`

- **Cliente** (`lib/fcm.ts`): pide permiso, obtiene token con la VAPID key, lo
  guarda en `users/{id}.fcmTokens`. Registra `onMessage` para foreground.
- **Service worker único** (`public/firebase-messaging-sw.js`): maneja push en
  background (`onBackgroundMessage`) + click + instalabilidad PWA. **Debe haber un
  solo SW por scope** — tener dos (uno de PWA sin handler y el de FCM) hace que el
  push llegue al SW equivocado y Chrome muestre un mensaje genérico. Lección
  aprendida y documentada.
- **Servidor** (`functions/index.js`, Cloud Functions v2): triggers
  `onDocumentCreated/Updated` que detectan asignaciones/compartidos y envían push;
  un `onSchedule` (cron) para recordatorios por fecha. Payload **data-only** para
  que el SW controle el display. **La región de las functions debe coincidir con
  la de Firestore** (`us-central1`).

---

## 10. Despliegue (CI/CD)

- **Frontend**: GitHub Actions build (`npm run build`) → deploy a GitHub Pages en
  cada push a `main`. Variables sensibles (ej. `VITE_FIREBASE_VAPID_KEY`) van como
  secrets del repo y se inyectan en el step de build.
- **Firestore rules e indexes**: se deployan con `firebase deploy --only
  firestore:rules` / `firestore:indexes` (directo, no por CI).
- **Cloud Functions**: `firebase deploy --only functions`.
- Config en `firebase.json` (`firestore.rules`, `firestore.indexes`, `functions`
  con `runtime: nodejs22`) y `.firebaserc` (proyecto default).
- **Nunca** commitear `serviceAccount.json` (está en `.gitignore`; se usa solo para
  scripts de seed con el Admin SDK).

---

## 11. Convenciones y decisiones a replicar

- **Fechas como string `YYYY-MM-DD`**, no Date ni Timestamp, para el dominio.
  Ordenan bien lexicográficamente y evitan el bug de "un día menos" por UTC.
- **Actualización optimista** en todas las acciones del store.
- **Mappers from/to Firestore** para aislar el dominio de formatos legados.
- **`stripUndefined`** obligatorio antes de escribir.
- **Permisos en dos capas** (UI + reglas), la real es la de reglas.
- **Un solo service worker** por scope.
- **Colecciones planas + embebido selectivo**: embeber lo que se lee junto
  (proyectos/tareas en el evento), separar lo que cambia distinto (admin, cta cte).
- **Componentes nunca tocan Firestore**: siempre store → db.
- **Tailwind con variables CSS** (`var(--surface)`, `var(--border)`, etc.) para
  soportar tema claro/oscuro desde `data-theme` en `<html>`.

---

## 12. Para arrancar una plataforma nueva similar

1. Crear proyecto Firebase (Auth email/password, Firestore, Storage, plan Blaze si
   se usan Functions/FCM).
2. Vite + React + TS + Tailwind v4. Copiar `lib/firebase.ts`, `lib/idbStorage.ts`,
   `lib/db.ts` (adaptando entidades), `store/useAppStore.ts` (patrón auth + CRUD).
3. Definir el modelo en `types/index.ts` y las colecciones.
4. Escribir `firestore.rules` con los helpers defensivos desde el día uno.
5. Layout + ruteo protegido + roles.
6. (Opcional) FCM con un único service worker; Cloud Functions en la región de
   Firestore.
7. CI a GitHub Pages con los secrets necesarios.
