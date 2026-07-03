import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Evento, Proyecto, Cliente, Usuario } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(val?: string) {
  if (!val) return '—'
  const d = new Date(val + (val.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateShort(val?: string) {
  if (!val) return '—'
  const d = new Date(val + (val.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingBottom: 30,
  },

  // Header bar — negro igual al PDF de referencia
  headerBar: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerStandLabel: {
    color: '#aaaaaa',
    fontSize: 8,
    fontFamily: 'Helvetica',
    marginRight: 4,
  },
  headerStandName: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    gap: 0,
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  infoLabel: {
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'Helvetica',
  },
  infoValue: {
    fontSize: 8,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    flexShrink: 1,
  },
  infoValueRed: {
    fontSize: 8,
    color: '#cc0000',
    fontFamily: 'Helvetica-Bold',
  },

  // Section header
  sectionBar: {
    paddingHorizontal: 18,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Content wrapper
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  // Renders
  rendersRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  renderImg: {
    flex: 1,
    height: 120,
    objectFit: 'cover',
    borderRadius: 3,
  },
  renderEmpty: {
    flex: 1,
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },

  // Tasks
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    gap: 7,
  },
  checkbox: {
    width: 9,
    height: 9,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  checkboxDone: {
    width: 9,
    height: 9,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  taskText: {
    fontSize: 8,
    color: '#374151',
    flex: 1,
    fontFamily: 'Helvetica',
  },
  taskTextDone: {
    fontSize: 8,
    color: '#9ca3af',
    flex: 1,
    fontFamily: 'Helvetica',
    textDecoration: 'line-through',
  },
  taskResp: {
    fontSize: 6.5,
    color: '#9ca3af',
    fontFamily: 'Helvetica',
  },

  // Notes
  notasText: {
    fontSize: 8,
    color: '#374151',
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },

  // Fabricacion
  fabricText: {
    fontSize: 8,
    color: '#374151',
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6.5,
    color: '#9ca3af',
    fontFamily: 'Helvetica',
  },
  footerBrand: {
    fontSize: 6.5,
    color: '#cc0000',
    fontFamily: 'Helvetica-Bold',
  },
  noContent: {
    fontSize: 8,
    color: '#9ca3af',
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
})

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  evento: Evento
  proyecto: Proyecto
  cliente?: Cliente
  responsable?: Usuario
  usuarios: Usuario[]
}

// ─── Document ───────────────────────────────────────────────────────────────

export function ProyectoPDF({ evento, proyecto, cliente, responsable, usuarios }: Props) {
  const renders = evento.renders || []
  const tareas = proyecto.tareas || []
  const now = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Fecha evento display
  const fechaEvento = evento.eventoInicio
    ? `${fmtDateShort(evento.eventoInicio)}${evento.eventoFin ? ' al ' + fmtDateShort(evento.eventoFin) : ''}`
    : '—'

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header negro ── */}
        <View style={S.headerBar}>
          <Text style={S.headerTitle}>Planilla de Proyecto</Text>
          <View style={S.headerRight}>
            <Text style={S.headerStandLabel}>stand </Text>
            <Text style={S.headerStandName}>{evento.titulo.toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Fila 1: cliente, lugar, responsable ── */}
        <View style={S.infoRow}>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>cliente </Text>
            <Text style={S.infoValue}>{cliente?.nombre || '—'}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>lugar </Text>
            <Text style={S.infoValue}>{evento.lugar || '—'}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>responsable </Text>
            <Text style={S.infoValue}>
              {responsable ? (responsable.displayName || responsable.username) : '—'}
            </Text>
          </View>
        </View>

        {/* ── Fila 2: fechas ── */}
        <View style={S.infoRow}>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>fecha armado </Text>
            <Text style={S.infoValue}>{fmtDateShort(evento.armadoInicio)}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>fecha evento </Text>
            <Text style={S.infoValue}>{fechaEvento}</Text>
          </View>
          <View style={S.infoCell}>
            <Text style={S.infoLabel}>actualización </Text>
            <Text style={S.infoValueRed}>{fmtDate(evento.updatedAt)}</Text>
          </View>
        </View>

        {/* ── Renders ── */}
        {renders.length > 0 && (
          <>
            <View style={S.sectionBar}>
              <Text style={S.sectionTitle}>Renders del proyecto</Text>
            </View>
            <View style={[S.content, { paddingBottom: 4 }]}>
              <View style={S.rendersRow}>
                {renders.map((src, i) => (
                  <Image key={i} src={src} style={S.renderImg} />
                ))}
                {Array.from({ length: 3 - renders.length }).map((_, i) => (
                  <View key={`ph${i}`} style={S.renderEmpty} />
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Fabricación ── */}
        {proyecto.fabricacion && (
          <>
            <View style={S.sectionBar}>
              <Text style={S.sectionTitle}>Fabricación</Text>
            </View>
            <View style={S.content}>
              <Text style={S.fabricText}>{proyecto.fabricacion}</Text>
            </View>
          </>
        )}

        {/* ── Tareas ── */}
        <View style={S.sectionBar}>
          <Text style={S.sectionTitle}>
            Tareas — {tareas.filter(t => t.completada).length}/{tareas.length} completadas
          </Text>
        </View>
        <View style={S.content}>
          {tareas.length === 0 ? (
            <Text style={S.noContent}>Sin tareas asignadas</Text>
          ) : (
            tareas.map(t => {
              const resp = usuarios.find(u => u.id === t.responsableId)
              return (
                <View key={t.id} style={S.taskRow}>
                  <View style={t.completada ? S.checkboxDone : S.checkbox}>
                    {t.completada && <Text style={S.checkmark}>✓</Text>}
                  </View>
                  <Text style={t.completada ? S.taskTextDone : S.taskText}>{t.titulo}</Text>
                  {resp && <Text style={S.taskResp}>{resp.displayName || resp.username}</Text>}
                </View>
              )
            })
          )}
        </View>

        {/* ── Notas ── */}
        {proyecto.notas && (
          <>
            <View style={S.sectionBar}>
              <Text style={S.sectionTitle}>Notas</Text>
            </View>
            <View style={S.content}>
              <Text style={S.notasText}>{proyecto.notas}</Text>
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generado el {now}</Text>
          <Text style={S.footerBrand}>Control X Syncro</Text>
        </View>

      </Page>
    </Document>
  )
}
