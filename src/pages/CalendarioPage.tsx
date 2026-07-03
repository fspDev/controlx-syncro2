import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { NuevoEventoDialog } from '@/components/eventos/NuevoEventoDialog'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

type CalView = 'armado' | 'evento' | 'desarme'

interface CalEvent {
  eventoId: string
  titulo: string
  type: CalView
  dateStr: string
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const TYPE_COLORS: Record<CalView, string> = {
  armado: 'bg-blue-500/80 text-white',
  evento: 'bg-brand-500/80 text-white',
  desarme: 'bg-violet-500/80 text-white',
}

const TYPE_LABEL: Record<CalView, string> = {
  armado: 'A',
  evento: 'E',
  desarme: 'D',
}

export function CalendarioPage() {
  const { eventos } = useAppStore()
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [filters, setFilters] = useState<Set<CalView>>(new Set(['armado', 'evento', 'desarme']))
  const [newFromDate, setNewFromDate] = useState<string | null>(null)

  const toggleFilter = (f: CalView) => {
    setFilters(prev => {
      const n = new Set(prev)
      n.has(f) ? n.delete(f) : n.add(f)
      return n
    })
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  // Build calendar events per date
  const calEvents: Record<string, CalEvent[]> = {}
  const addCalEvent = (dateStr: string | undefined, type: CalView, e: typeof eventos[0]) => {
    if (!dateStr || !filters.has(type)) return
    const d = dateStr.slice(0, 10)
    if (!calEvents[d]) calEvents[d] = []
    calEvents[d].push({ eventoId: e.id, titulo: e.titulo, type, dateStr: d })
  }

  eventos.forEach(e => {
    if (e.proyectos.length > 0 && e.proyectos.every(p => p.estado === 'Cancelado')) return
    addCalEvent(e.armadoInicio, 'armado', e)
    if (e.armadoFin) addCalEvent(e.armadoFin, 'armado', e)
    addCalEvent(e.eventoInicio, 'evento', e)
    if (e.eventoFin) addCalEvent(e.eventoFin, 'evento', e)
    addCalEvent(e.desarme, 'desarme', e)
  })

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-100">Calendario</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {(['armado', 'evento', 'desarme'] as CalView[]).map(f => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                filters.has(f)
                  ? f === 'armado' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : f === 'evento' ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                  : 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                  : 'bg-transparent border-[var(--border)] text-gray-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                f === 'armado' ? 'bg-blue-400' : f === 'evento' ? 'bg-brand-400' : 'bg-violet-400'
              } ${!filters.has(f) && 'opacity-30'}`} />
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        {/* Nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-gray-400 cursor-pointer transition-colors"><ChevronLeft size={16} /></button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
              className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer px-2 py-1 rounded hover:bg-[var(--surface-2)] transition-colors"
            >
              Hoy
            </button>
            <h2 className="text-base font-semibold text-gray-200 min-w-[160px] text-center">
              {MONTH_NAMES[month]} {year}
            </h2>
          </div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-gray-400 cursor-pointer transition-colors"><ChevronRight size={16} /></button>
        </div>

        <div className="min-w-[560px]">
        {/* Days header */}
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-s)]">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[90px] bg-[var(--bg)]/30" />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const dayEvents = calEvents[dateStr] || []

            return (
              <div
                key={i}
                className="group min-h-[90px] p-1.5 hover:bg-[var(--surface-h)] transition-colors cursor-pointer"
                onClick={() => setNewFromDate(dateStr)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-500 text-white' : 'text-gray-500'}`}>
                    {day}
                  </div>
                  <Plus size={11} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mr-0.5" />
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <button
                      key={j}
                      onClick={e => { e.stopPropagation(); navigate(`/proyectos/${ev.eventoId}`) }}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded font-medium truncate cursor-pointer transition-opacity hover:opacity-80 ${TYPE_COLORS[ev.type]}`}
                      title={ev.titulo}
                    >
                      <span className="opacity-70 mr-1">{TYPE_LABEL[ev.type]}</span>
                      {ev.titulo}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-gray-600 px-1">+{dayEvents.length - 3} más</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/80" />Armado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500/80" />Evento</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500/80" />Desarme</span>
        <span className="ml-auto text-gray-600 italic">Hacé click en un día para agregar un evento</span>
      </div>

      {/* New evento dialog from calendar */}
      <NuevoEventoDialog
        open={!!newFromDate}
        onClose={() => setNewFromDate(null)}
        onCreated={id => { setNewFromDate(null); navigate(`/proyectos/${id}`) }}
        title={`Nuevo Evento — ${newFromDate ? new Date(newFromDate + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}`}
        initial={{ eventoInicio: newFromDate || '' }}
      />
    </div>
  )
}
