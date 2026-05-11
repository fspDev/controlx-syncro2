import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { PlanillaGrafica, Evento, Cliente, Usuario } from '@/types'
import { TIPO_LABEL, TIPO_COLOR_HEX } from '@/types'

// A4 portrait: 595pt width, 842pt height
// Content area with 30pt margins: 535pt wide
const CW = 535   // content width in points
const PH = 30    // page horizontal padding
const MARKER_R = 12  // marker circle radius in points
const COL_GAP = 8    // gap between columns in 2-per-page mode
const COL_W = (CW - COL_GAP) / 2  // column width for 2-per-page

function fmtDate(val?: string) {
  if (!val) return '—'
  const d = new Date(val + (val.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#fff', paddingBottom: 35 },

  // Header
  headerBar: { backgroundColor: '#111', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PH, paddingVertical: 8 },
  headerLogo: { width: 80, height: 24, objectFit: 'contain' },
  headerLogoPlaceholder: { width: 80 },
  headerTitle: { color: '#fff', fontSize: 13, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerLabel: { color: '#aaa', fontSize: 8 },
  headerName: { color: '#fff', fontSize: 11, fontFamily: 'Helvetica-Bold' },

  // Info rows
  infoRow: { flexDirection: 'row', paddingHorizontal: PH, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  infoCell: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  infoLabel: { fontSize: 7, color: '#6b7280' },
  infoValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111' },
  infoValueRed: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#cc0000' },

  // Section
  sectionBar: { paddingHorizontal: PH, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db', marginTop: 6 },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#374151', letterSpacing: 0.8, textTransform: 'uppercase' },

  content: { paddingHorizontal: PH, paddingTop: 10 },

  // Render page — single
  renderWrapper: { position: 'relative' },

  // Render page — two per page
  twoColRow: { flexDirection: 'row', gap: COL_GAP, paddingHorizontal: PH, paddingTop: 8 },
  twoColItem: { flex: 1 },
  twoColTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  twoColWrapper: { position: 'relative' },

  // Marker
  markerCircle: { position: 'absolute', width: MARKER_R * 2, height: MARKER_R * 2, borderRadius: MARKER_R, justifyContent: 'center', alignItems: 'center' },
  markerText: { color: '#fff', fontSize: 6.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },

  // Legend
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: PH, paddingTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 7, color: '#374151' },

  // Two-col legend (scoped per column)
  colLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  colLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  colLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  colLegendText: { fontSize: 6, color: '#374151' },

  // Piece cards
  card: { border: '0.5pt solid #d1d5db', borderRadius: 4, overflow: 'hidden' },
  cardImgEmpty: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  cardImgEmptyText: { fontSize: 7, color: '#9ca3af' },
  cardBody: { padding: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  cardBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardBadgeText: { color: '#fff', fontSize: 6, fontFamily: 'Helvetica-Bold' },
  cardTipo: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#111' },
  cardSubtipo: { fontSize: 6.5, color: '#6b7280' },
  cardInfo: { fontSize: 7, color: '#374151', lineHeight: 1.5 },
  cardQty: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#e5e7eb' },
  cardQtyLabel: { fontSize: 6.5, color: '#6b7280' },
  cardQtyValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111' },

  // Footer
  footer: { position: 'absolute', bottom: 10, left: PH, right: PH, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 5 },
  footerText: { fontSize: 6.5, color: '#9ca3af' },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#cc0000' },
})

interface Props {
  planilla: PlanillaGrafica
  evento: Evento
  cliente?: Cliente
  responsable?: Usuario
  rendersPerPage?: 1 | 2
  logoUrl?: string
}

export function PlanillaPDF({ planilla, evento, cliente, responsable, rendersPerPage = 1, logoUrl }: Props) {
  const now = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const piezas = planilla.piezas

  const getCantidad = (piezaId: string) =>
    planilla.renders.reduce((sum, r) => sum + r.marcadores.filter(m => m.piezaId === piezaId).length, 0)

  const HeaderInfo = () => (
    <>
      <View style={S.headerBar}>
        {/* Logo */}
        {logoUrl ? (
          <Image src={logoUrl} style={S.headerLogo} />
        ) : (
          <View style={S.headerLogoPlaceholder} />
        )}

        {/* Center title */}
        <Text style={S.headerTitle}>Planilla de Gráficas</Text>

        {/* Right: stand name */}
        <View style={S.headerRight}>
          <Text style={S.headerLabel}>stand </Text>
          <Text style={S.headerName}>{evento.titulo.toUpperCase()}</Text>
        </View>
      </View>
      <View style={S.infoRow}>
        <View style={S.infoCell}><Text style={S.infoLabel}>cliente </Text><Text style={S.infoValue}>{cliente?.nombre || '—'}</Text></View>
        <View style={S.infoCell}><Text style={S.infoLabel}>lugar </Text><Text style={S.infoValue}>{evento.lugar || '—'}</Text></View>
        <View style={S.infoCell}><Text style={S.infoLabel}>responsable </Text><Text style={S.infoValue}>{responsable ? (responsable.displayName || responsable.username) : '—'}</Text></View>
      </View>
      <View style={S.infoRow}>
        <View style={S.infoCell}><Text style={S.infoLabel}>armado </Text><Text style={S.infoValue}>{fmtDate(evento.armadoInicio)}</Text></View>
        <View style={S.infoCell}><Text style={S.infoLabel}>evento </Text><Text style={S.infoValue}>{fmtDate(evento.eventoInicio)}</Text></View>
        <View style={S.infoCell}><Text style={S.infoLabel}>actualización </Text><Text style={S.infoValueRed}>{fmtDate(evento.updatedAt)}</Text></View>
      </View>
    </>
  )

  const Footer = () => (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>Generado el {now}</Text>
      <Text style={S.footerBrand}>Control X Syncro</Text>
    </View>
  )

  // ── Card layout helpers ────────────────────────────────────────────────────
  //
  // Each piece card gets a width bucket based on its image aspect ratio:
  //   'full'  → CW        (very wide, e.g. banners  >2.5:1)
  //   'half'  → (CW-8)/2  (landscape 1.4:1 – 2.5:1)
  //   'third' → (CW-16)/3 (portrait / square  <1.4:1, or no image)
  //
  // Cards are greedily packed into rows (column fractions must sum ≤ 1.0).

  const CARD_GAP = 8
  const W_FULL  = CW
  const W_HALF  = (CW - CARD_GAP) / 2
  const W_THIRD = (CW - CARD_GAP * 2) / 3

  type CardBucket = 'full' | 'half' | 'third'
  const getBucket = (p: typeof piezas[0]): CardBucket => {
    const w = p.imagenDetalleW, h = p.imagenDetalleH
    if (!w || !h) return 'third'
    const r = w / h
    if (r > 2.5) return 'full'
    if (r > 1.4) return 'half'
    return 'third'
  }
  const bucketFraction: Record<CardBucket, number> = { full: 1, half: 0.5, third: 1 / 3 }
  const bucketWidth:    Record<CardBucket, number> = { full: W_FULL, half: W_HALF, third: W_THIRD }

  // Group pieces into rows
  const cardRows: (typeof piezas)[] = []
  let row: typeof piezas = []
  let rowFrac = 0
  for (const p of piezas) {
    const frac = bucketFraction[getBucket(p)]
    if (row.length > 0 && rowFrac + frac > 1.001) {
      cardRows.push(row)
      row = [p]
      rowFrac = frac
    } else {
      row.push(p)
      rowFrac += frac
    }
  }
  if (row.length > 0) cardRows.push(row)

  // Render a single piece card at a given width
  const PiezaCard = ({ p, cardW }: { p: typeof piezas[0]; cardW: number }) => {
    const bucket = getBucket(p)
    const aspect = p.imagenDetalleW && p.imagenDetalleH ? p.imagenDetalleW / p.imagenDetalleH : 16 / 9
    // Cap image height so very tall portraits don't eat the page
    const rawImgH = cardW / aspect
    const imgH = Math.min(rawImgH, bucket === 'full' ? 220 : 160)

    return (
      <View style={[S.card, { width: cardW }]}>
        {p.imagenDetalle ? (
          <Image src={p.imagenDetalle} style={{ width: cardW, height: imgH, objectFit: 'contain', backgroundColor: '#f3f4f6' }} />
        ) : (
          <View style={[S.cardImgEmpty, { width: cardW, height: 60 }]}>
            <Text style={S.cardImgEmptyText}>Sin imagen</Text>
          </View>
        )}
        <View style={S.cardBody}>
          <View style={S.cardHeader}>
            <View style={[S.cardBadge, { backgroundColor: TIPO_COLOR_HEX[p.tipo] }]}>
              <Text style={S.cardBadgeText}>{p.label}</Text>
            </View>
            <View>
              <Text style={S.cardTipo}>{TIPO_LABEL[p.tipo]}</Text>
              <Text style={S.cardSubtipo}>{p.subtipo}</Text>
            </View>
          </View>
          {(p.ancho || p.alto) && (
            <Text style={S.cardInfo}>{p.ancho ?? '?'} × {p.alto ?? '?'} mm</Text>
          )}
          {p.materialidad && (
            <Text style={S.cardInfo}>{p.materialidad}</Text>
          )}
          <View style={S.cardQty}>
            <Text style={S.cardQtyLabel}>Cantidad</Text>
            <Text style={S.cardQtyValue}>{getCantidad(p.id)}</Text>
          </View>
        </View>
      </View>
    )
  }

  // ── Helper: render a single render image with markers ──────────────────────
  const RenderBlock = ({ render, colWidth }: { render: typeof planilla.renders[0]; colWidth: number }) => {
    const imgH = colWidth * (render.natH / render.natW)
    const markerR = rendersPerPage === 2 ? 9 : MARKER_R  // smaller markers in 2-up mode

    return (
      <View style={{ position: 'relative' }}>
        <Image src={render.imagen} style={{ width: colWidth, height: imgH }} />
        {render.marcadores.map(m => {
          const pieza = piezas.find(p => p.id === m.piezaId)
          if (!pieza) return null
          return (
            <View
              key={m.id}
              style={[
                S.markerCircle,
                {
                  width: markerR * 2,
                  height: markerR * 2,
                  borderRadius: markerR,
                  left: colWidth * (m.x / 100) - markerR,
                  top: imgH * (m.y / 100) - markerR,
                  backgroundColor: TIPO_COLOR_HEX[pieza.tipo],
                  borderWidth: 2,
                  borderColor: '#ffffff',
                  borderStyle: 'solid',
                },
              ]}
            >
              <Text style={[S.markerText, { fontSize: rendersPerPage === 2 ? 5.5 : 6.5 }]}>{pieza.label}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  // ── Helper: legend for a render ────────────────────────────────────────────
  const RenderLegend = ({ render, compact = false }: { render: typeof planilla.renders[0]; compact?: boolean }) => {
    if (render.marcadores.length === 0) return null
    const piezasEnRender = [...new Set(render.marcadores.map(m => m.piezaId))]
      .map(id => piezas.find(p => p.id === id)).filter(Boolean) as typeof piezas

    if (compact) {
      return (
        <View style={S.colLegendRow}>
          {piezasEnRender.map(p => (
            <View key={p.id} style={S.colLegendItem}>
              <View style={[S.colLegendDot, { backgroundColor: TIPO_COLOR_HEX[p.tipo] }]} />
              <Text style={S.colLegendText}>{p.label} — {TIPO_LABEL[p.tipo]} {p.subtipo}{p.ancho && p.alto ? ` ${p.ancho}×${p.alto}mm` : ''}</Text>
            </View>
          ))}
        </View>
      )
    }

    return (
      <View style={S.legendRow}>
        {piezasEnRender.map(p => (
          <View key={p.id} style={S.legendItem}>
            <View style={[S.legendDot, { backgroundColor: TIPO_COLOR_HEX[p.tipo] }]} />
            <Text style={S.legendText}>{p.label} — {TIPO_LABEL[p.tipo]} {p.subtipo}{p.ancho && p.alto ? ` (${p.ancho}×${p.alto}mm)` : ''}</Text>
          </View>
        ))}
      </View>
    )
  }

  // ── 1 render per page layout ───────────────────────────────────────────────
  const SinglePerPagePages = () => (
    <>
      {planilla.renders.map((render) => (
        <Page key={render.id} size="A4" style={S.page}>
          <HeaderInfo />
          <View style={S.sectionBar}>
            <Text style={S.sectionTitle}>{render.nombre}</Text>
          </View>
          <View style={[S.content, { paddingTop: 8 }]}>
            <RenderBlock render={render} colWidth={CW} />
          </View>
          <RenderLegend render={render} />
          <Footer />
        </Page>
      ))}
    </>
  )

  // ── 2 renders per page layout ──────────────────────────────────────────────
  const TwoPerPagePages = () => {
    // group renders in pairs
    const pairs: (typeof planilla.renders)[] = []
    for (let i = 0; i < planilla.renders.length; i += 2) {
      pairs.push(planilla.renders.slice(i, i + 2))
    }

    return (
      <>
        {pairs.map((pair, pi) => (
          <Page key={pi} size="A4" style={S.page}>
            <HeaderInfo />
            <View style={S.twoColRow}>
              {pair.map((render) => (
                <View key={render.id} style={S.twoColItem}>
                  <Text style={S.twoColTitle}>{render.nombre}</Text>
                  <RenderBlock render={render} colWidth={COL_W} />
                  <RenderLegend render={render} compact />
                </View>
              ))}
              {/* If odd number of renders in last pair, empty spacer */}
              {pair.length === 1 && <View style={S.twoColItem} />}
            </View>
            <Footer />
          </Page>
        ))}
      </>
    )
  }

  return (
    <Document>
      {/* ── Render pages ── */}
      {rendersPerPage === 2 ? <TwoPerPagePages /> : <SinglePerPagePages />}

      {/* ── Piece detail page ── */}
      {piezas.length > 0 && (
        <Page size="A4" style={S.page}>
          <HeaderInfo />

          <View style={S.sectionBar}>
            <Text style={S.sectionTitle}>Detalle de piezas gráficas — {piezas.length} tipo{piezas.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Adaptive card grid — one row at a time */}
          <View style={{ paddingHorizontal: PH, paddingTop: 10, gap: CARD_GAP }}>
            {cardRows.map((rowPiezas, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: CARD_GAP }}>
                {rowPiezas.map(p => (
                  <PiezaCard key={p.id} p={p} cardW={bucketWidth[getBucket(p)]} />
                ))}
              </View>
            ))}
          </View>

          <Footer />
        </Page>
      )}
    </Document>
  )
}
