const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onRequest } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

const REGION = 'us-central1'

initializeApp()
const db = getFirestore()
const messaging = getMessaging()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFcmTokens(userId) {
  if (!userId) return []
  const snap = await db.collection('users').doc(userId).get()
  if (!snap.exists) return []
  const tokens = snap.data().fcmTokens || []
  return Array.isArray(tokens) ? tokens.filter(Boolean) : []
}

async function sendNotification(userId, { title, body, url }) {
  const tokens = await getFcmTokens(userId)
  console.log(`[FCM] sendNotification → userId=${userId} tokens=${tokens.length} title="${title}"`)
  if (!tokens.length) return

  const message = {
    data: { title, body: body || '', url: url || '/controlx-syncro2/' },
    webpush: {
      headers: { Urgency: 'high' },
      fcmOptions: { link: `https://fspdev.github.io${url || '/controlx-syncro2/'}` },
    },
    tokens,
  }

  const result = await messaging.sendEachForMulticast(message)
  console.log(`[FCM] result: success=${result.successCount} failure=${result.failureCount}`)

  // Limpiar tokens inválidos
  const invalid = []
  result.responses.forEach((r, i) => {
    if (r.error) console.warn(`[FCM] token error:`, r.error.code, r.error.message)
    if (!r.success && (
      r.error?.code === 'messaging/invalid-registration-token' ||
      r.error?.code === 'messaging/registration-token-not-registered'
    )) {
      invalid.push(tokens[i])
    }
  })
  if (invalid.length) {
    await db.collection('users').doc(userId).update({
      fcmTokens: tokens.filter(t => !invalid.includes(t))
    })
  }
}

async function getUserName(userId) {
  if (!userId) return 'Alguien'
  const snap = await db.collection('users').doc(userId).get()
  if (!snap.exists) return 'Alguien'
  const d = snap.data()
  return d.displayName || d.username || 'Alguien'
}

// ─── HTTP: test de notificación ───────────────────────────────────────────────
// Llamar con: POST https://us-central1-control-x-prod.cloudfunctions.net/testNotification
// Body JSON: { "userId": "UID_DEL_USUARIO" }

exports.testNotification = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const userId = req.body?.userId
  if (!userId) {
    res.status(400).json({ error: 'userId requerido' })
    return
  }
  const tokens = await getFcmTokens(userId)
  if (!tokens.length) {
    res.status(404).json({ error: 'Sin tokens FCM para este usuario', userId })
    return
  }
  await sendNotification(userId, {
    title: '🔔 Notificación de prueba',
    body: 'Las notificaciones push están funcionando correctamente',
    url: '/controlx-syncro2/',
  })
  res.json({ ok: true, tokensEncontrados: tokens.length })
})

// ─── Trigger: cambio en un evento (proyectos y tareas) ───────────────────────

exports.onEventoChanged = onDocumentUpdated(
  { document: 'events/{eventoId}', region: REGION },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()
    const eventoId = event.params.eventoId
    const titulo = after.titulo || 'un evento'

    console.log(`[onEventoChanged] eventoId=${eventoId} titulo="${titulo}"`)

    const beforeProyectos = before.proyectos || []
    const afterProyectos = after.proyectos || []

    const promises = []

    afterProyectos.forEach((proyAfter) => {
      const proyBefore = beforeProyectos.find(p => p.id === proyAfter.id) || {}

      // Responsable de proyecto cambió
      if (proyAfter.responsableId && proyAfter.responsableId !== proyBefore.responsableId) {
        promises.push((async () => {
          const who = await getUserName(after.updatedBy || null)
          await sendNotification(proyAfter.responsableId, {
            title: '📋 Nuevo proyecto asignado',
            body: `${who} te asignó como responsable en "${titulo}"`,
            url: `/controlx-syncro2/proyectos/${eventoId}`,
          })
        })())
      }

      // Tareas: responsable cambió
      const tareasBefore = proyBefore.tareas || []
      const tareasAfter = proyAfter.tareas || []
      tareasAfter.forEach((tareaAfter) => {
        const tareaAntes = tareasBefore.find(t => t.id === tareaAfter.id) || {}
        if (tareaAfter.responsableId && tareaAfter.responsableId !== tareaAntes.responsableId) {
          promises.push((async () => {
            const who = await getUserName(after.updatedBy || null)
            await sendNotification(tareaAfter.responsableId, {
              title: '✅ Tarea asignada',
              body: `${who} te asignó "${tareaAfter.titulo}" en "${titulo}"`,
              url: `/controlx-syncro2/proyectos/${eventoId}`,
            })
          })())
        }
      })
    })

    await Promise.all(promises)
  }
)

// ─── Trigger: tarea de usuario creada (nueva) ────────────────────────────────

exports.onTareaUsuarioNueva = onDocumentCreated(
  { document: 'tareas_usuario/{tareaId}', region: REGION },
  async (event) => {
    const data = event.data.data()
    if (!data.compartidaCon?.length) return
    const creatorName = await getUserName(data.userId)
    await Promise.all(data.compartidaCon.map(uid =>
      sendNotification(uid, {
        title: '📌 Tarea compartida',
        body: `${creatorName} compartió "${data.titulo}" con vos`,
        url: '/controlx-syncro2/mis-tareas',
      })
    ))
  }
)

// ─── Trigger: tarea de usuario actualizada (nuevos compartidos) ───────────────

exports.onTareaUsuarioActualizada = onDocumentUpdated(
  { document: 'tareas_usuario/{tareaId}', region: REGION },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()
    const newShared = (after.compartidaCon || []).filter(uid => !(before.compartidaCon || []).includes(uid))
    if (!newShared.length) return
    const creatorName = await getUserName(after.userId)
    await Promise.all(newShared.map(uid =>
      sendNotification(uid, {
        title: '📌 Tarea compartida',
        body: `${creatorName} compartió "${after.titulo}" con vos`,
        url: '/controlx-syncro2/mis-tareas',
      })
    ))
  }
)

// ─── Cron: recordatorios de fechas — corre cada hora, respeta hora del usuario ─

exports.recordatorioFechas = onSchedule({ schedule: 'every 1 hours', timeZone: 'America/Argentina/Buenos_Aires', region: REGION }, async () => {
  // Hora actual en Argentina
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const horaActual = now.getHours()

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const manana = new Date(today)
  manana.setDate(manana.getDate() + 1)
  const mananaStr = manana.toISOString().slice(0, 10)
  const enTresDias = new Date(today)
  enTresDias.setDate(enTresDias.getDate() + 3)
  const enTresDiasStr = enTresDias.toISOString().slice(0, 10)

  // Cargar preferencias de hora de todos los usuarios
  const usersSnap = await db.collection('users').get()
  const userHora = {}
  usersSnap.forEach(doc => {
    const hora = doc.data().horaRecordatorio ?? 9  // default 9am
    userHora[doc.id] = hora
  })

  const tareasSnap = await db.collection('tareas_usuario').where('completada', '==', false).get()
  const promises = []

  tareasSnap.forEach(doc => {
    const t = doc.data()
    if (!t.fechaVencimiento || !t.userId) return
    // Solo enviar si esta es la hora configurada por el usuario
    if (userHora[t.userId] !== horaActual) return
    const fechaStr = t.fechaVencimiento.slice(0, 10)
    if (fechaStr === mananaStr) {
      promises.push(sendNotification(t.userId, {
        title: '⏰ Tarea vence mañana',
        body: `"${t.titulo}" vence mañana`,
        url: '/controlx-syncro2/mis-tareas',
      }))
    } else if (fechaStr === enTresDiasStr) {
      promises.push(sendNotification(t.userId, {
        title: '⏰ Recordatorio de tarea',
        body: `"${t.titulo}" vence en 3 días`,
        url: '/controlx-syncro2/mis-tareas',
      }))
    }
  })

  const eventosSnap = await db.collection('events').get()
  eventosSnap.forEach(doc => {
    const e = doc.data()
    if (!e.armadoInicio) return
    const armadoStr = e.armadoInicio.slice(0, 10)
    if (armadoStr !== mananaStr) return

    const responsables = new Set()
    ;(e.proyectos || []).forEach(p => {
      if (p.responsableId) responsables.add(p.responsableId)
      ;(p.tareas || []).forEach(t => { if (t.responsableId) responsables.add(t.responsableId) })
    })
    responsables.forEach(uid => {
      if (userHora[uid] !== horaActual) return
      promises.push(sendNotification(uid, {
        title: '🔧 Armado mañana',
        body: `"${e.titulo}" empieza el armado mañana`,
        url: `/controlx-syncro2/proyectos/${doc.id}`,
      }))
    })
  })

  await Promise.all(promises)
})
