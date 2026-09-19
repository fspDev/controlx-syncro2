# Registro de usuarios y contraseñas — funcionamiento detallado

Documento para replicar el sistema de auth de Control X en otro proyecto.
Se basa en **Firebase Authentication (email/password)** + un documento espejo por
usuario en **Firestore** (`users/{uid}`) que guarda el perfil y los permisos.

---

## 1. Concepto general

Firebase Auth NO guarda roles ni datos de perfil, solo credenciales. Por eso el
sistema tiene **dos piezas por usuario**:

1. **Cuenta en Firebase Auth** — email + contraseña. Firebase genera un `uid` único
   y guarda la contraseña **hasheada** (nunca la vemos ni la almacenamos nosotros).
2. **Documento de perfil en Firestore** — en `users/{uid}`, con `username`,
   `displayName`, `rol`, `permisos`, `createdAt`. El id del doc **es el `uid`** de
   Auth, así se vinculan.

**No hay auto-registro público.** Solo un `admin` crea usuarios desde el panel. No
existe pantalla de "crear cuenta" para el usuario final.

---

## 2. Truco username → email

La UI pide "usuario" y "contraseña", no un email. Internamente se fabrica un email
sintético agregando un dominio fijo:

```
username = "fabio"  →  email = "fabio@controlx.app"
```

Firebase Auth **requiere un email**, pero el usuario nunca lo ve ni lo necesita. El
dominio `@controlx.app` no tiene que existir de verdad; es solo un formato válido.

- Al **crear** (`addUsuario`): `email = \`${username}@controlx.app\``.
- Al **loguear** (`LoginPage`): `email = raw.includes('@') ? raw : \`${raw}@controlx.app\``
  (permite que un admin entre con email completo si hiciera falta).

Si en el otro proyecto querés emails reales, salteás este truco y usás el email tal
cual. El resto del flujo es idéntico.

---

## 3. Creación de un usuario (el admin crea la cuenta)

Código en `store/useAppStore.ts → addUsuario`:

```ts
addUsuario: async (data) => {
  const username = data.username.trim().toLowerCase()
  const email = `${username}@controlx.app`
  // 1. Crea la cuenta real en Firebase Auth, en la instancia SECUNDARIA
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, data.password)
  const id = cred.user.uid
  // 2. Crea el documento de perfil en Firestore con el uid como id
  const u: Usuario = { id, username, displayName: data.displayName, rol: data.rol,
                       createdAt: new Date().toISOString(), permisos: data.permisos }
  await saveUsuario(u)
  // 3. Cierra la sesión secundaria (no afecta al admin)
  await signOutSecondary(secondaryAuth)
  // 4. Actualiza el estado local
  set(s => ({ usuarios: [...s.usuarios, u] }))
}
```

### El problema de la "instancia secundaria" (clave)

`createUserWithEmailAndPassword` **loguea automáticamente** en la app de Firebase
donde se ejecuta. Si lo llamaras sobre la instancia principal, el admin quedaría
deslogueado y logueado como el usuario recién creado.

Solución: se inicializa una **segunda app de Firebase** solo para esto
(`lib/firebase.ts`):

```ts
export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)                 // sesión del admin (principal)

const secondaryApp = initializeApp(firebaseConfig, 'Secondary')  // 2° instancia
export const secondaryAuth = getAuth(secondaryApp)               // se usa solo para crear
```

Así la cuenta se crea en `secondaryAuth`, se guarda el perfil, y se hace
`signOut(secondaryAuth)` — la sesión del admin en `auth` nunca se toca.

---

## 4. Persistencia del perfil (`saveUsuario`)

En `lib/db.ts`. El id del documento es el `uid`:

```ts
export async function saveUsuario(u: Usuario): Promise<void> {
  await setDoc(doc(db, 'users', u.id), stripUndefined({
    username: u.username,
    displayName: u.displayName || '',
    role: u.rol,   // se escribe role Y rol por compatibilidad de nombres legados
    rol: u.rol,
    createdAt: u.createdAt,
    permisos: u.permisos,
  }), { merge: true })
}
```

Nunca se guarda la contraseña acá: esa vive solo en Firebase Auth.

---

## 5. Login

`LoginPage` arma el email y llama `login`:

```ts
login: async (email, password) => {
  await signInWithEmailAndPassword(auth, email, password)  // sobre la instancia principal
}
```

No hay más lógica en el login: el listener global `onAuthStateChanged` (ver abajo)
detecta la sesión nueva y carga el perfil y los datos.

Errores traducidos a mensajes amigables (`firebaseErrorMessage`):
`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` →
"Usuario o contraseña incorrectos"; `auth/too-many-requests` → reintentar luego.

---

## 6. Sesión activa y carga de perfil (`initAuth`)

Se registra una sola vez al montar la app. Es el corazón del sistema:

```ts
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Busca el perfil en Firestore por uid
    let profile = await getUsuarioByUid(firebaseUser.uid).catch(() => null)
    if (!profile) {
      // Fallback: si el doc no existe, arma un perfil mínimo con rol 'user'
      profile = userFromFirestore(firebaseUser.uid, { username, role: 'user', ... })
    }
    set({ currentUser: profile, authLoading: false })
    registerFcmToken(profile.id)          // token push
    // abre suscripciones en tiempo real y carga el resto de los datos
  } else {
    set({ currentUser: null, authLoading: false, /* limpia colecciones */ })
  }
})
```

- La sesión **persiste sola** entre recargas (Firebase Auth guarda el token en el
  navegador). Al recargar, `onAuthStateChanged` dispara con el usuario ya logueado.
- El **fallback** evita que un usuario con cuenta en Auth pero sin doc de perfil
  quede trabado: entra con permisos mínimos (`user`).

`logout`: `signOut(auth)` + limpieza del estado local.

---

## 7. Roles y permisos

- `rol: 'admin' | 'administrativo' | 'user'`.
- `permisos?: { ctaCteProv: boolean }` — flags para features puntuales.
- Se aplican en **dos capas**:
  1. **UI** (conveniencia): páginas con early-return `<Navigate>` y menús ocultos
     según rol.
  2. **Firestore Rules** (seguridad real): el servidor valida cada lectura/escritura.

### Reglas relevantes al doc de usuario (`firestore.rules`)

```
match /users/{userId} {
  allow read: if isAuth();
  allow write: if isAdmin();               // solo un admin gestiona perfiles/permisos
  // Un usuario puede tocar SU propio doc, pero solo dos campos que la app
  // necesita escribir sola (token push y hora de recordatorio). Si pudiera
  // escribir cualquier campo, se auto-asignaría permisos/rol.
  allow update: if isAuth() && request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['fcmTokens', 'horaRecordatorio']);
}
```

Helper defensivo para leer el rol sin que reviente si falta el campo:

```
function isAdmin() {
  return isAuth() && get(/databases/$(database)/documents/users/$(request.auth.uid))
    .data.get('rol', '') in ['admin', 'administrativo'];
}
```

---

## 8. Editar / cambiar contraseña / borrar

- **Editar perfil** (`updateUsuario`): actualización optimista + `saveUsuario`.
  Cambia `displayName`, `rol`, `permisos`. (El `username`/email no se cambia porque
  es la credencial en Auth.)
- **Cambiar contraseña**: Firebase Auth solo deja cambiar la contraseña del
  **usuario logueado** (`updatePassword`) o vía email de reseteo. Un admin **no
  puede** cambiar la contraseña de otro usuario desde el cliente — eso requiere el
  **Admin SDK** en un entorno de servidor (Cloud Function con
  `admin.auth().updateUser(uid, { password })`). En Control X el reseteo se maneja
  recreando la cuenta o con Admin SDK aparte.
- **Borrar** (`deleteUsuario`): borra el doc de Firestore (`deleteUsuarioDoc`). Ojo:
  esto **no elimina la cuenta de Firebase Auth** — para eso también hace falta el
  Admin SDK (`admin.auth().deleteUser(uid)`). Sin eso, la credencial sigue
  existiendo aunque el perfil desaparezca.

---

## 9. Piezas necesarias para replicarlo

1. Proyecto Firebase con **Authentication → Email/Password** habilitado.
2. `lib/firebase.ts` con la app principal + la **instancia secundaria** para crear
   usuarios sin desloguear al admin.
3. Colección `users/{uid}` con el perfil (id = uid).
4. `addUsuario` (crear en secondaryAuth → guardar perfil → signOut secondary),
   `login` (signInWithEmailAndPassword), `initAuth` (onAuthStateChanged + carga de
   perfil con fallback), `logout`.
5. Reglas de Firestore: escritura de `users` solo para admin; el propio usuario solo
   campos inocuos.
6. (Opcional) Admin SDK en una Cloud Function para reset de contraseña y borrado
   real de cuentas.

### Notas de seguridad

- La contraseña nunca viaja ni se guarda fuera de Firebase Auth (llega hasheada).
- Nunca commitear `serviceAccount.json` (Admin SDK) — va en `.gitignore`.
- El truco username→email es cómodo pero acopla el login a un dominio fijo; para un
  producto con emails reales, usar el email directamente.
