import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { EstadoBadge } from '@/components/eventos/EstadoBadge'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Building2, Phone, Mail, MapPin, User, FileText } from 'lucide-react'

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clientes, eventos } = useAppStore()

  const cliente = clientes.find(c => c.id === id)
  if (!cliente) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-500">Cliente no encontrado</p>
      <Button onClick={() => navigate('/clientes')}>Volver a Clientes</Button>
    </div>
  )

  const eventosCliente = eventos.filter(e => e.clienteId === cliente.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/clientes')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[var(--surface-2)] transition-all cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
            <span className="text-lg font-bold text-brand-400">{cliente.nombre.slice(0,2).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">{cliente.nombre}</h1>
            {cliente.cuit && <p className="text-sm text-gray-500">CUIT: {cliente.cuit}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</h3>
            {cliente.contacto && (
              <div className="flex items-center gap-2.5">
                <User size={14} className="text-gray-600 shrink-0" />
                <span className="text-sm text-gray-300">{cliente.contacto}</span>
              </div>
            )}
            {cliente.telefono && (
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="text-gray-600 shrink-0" />
                <span className="text-sm text-gray-300">{cliente.telefono}</span>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="text-gray-600 shrink-0" />
                <a href={`mailto:${cliente.email}`} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">{cliente.email}</a>
              </div>
            )}
            {cliente.direccion && (
              <div className="flex items-center gap-2.5">
                <MapPin size={14} className="text-gray-600 shrink-0" />
                <span className="text-sm text-gray-300">{cliente.direccion}</span>
              </div>
            )}
            {cliente.notas && (
              <div className="flex gap-2.5 pt-3 border-t border-[var(--border)]">
                <FileText size={14} className="text-gray-600 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{cliente.notas}</p>
              </div>
            )}
            <p className="text-xs text-gray-600 pt-2 border-t border-[var(--border)]">Cliente desde {formatDate(cliente.createdAt)}</p>
          </div>
        </div>

        {/* Eventos */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Historial de Eventos ({eventosCliente.length})
          </h3>
          {eventosCliente.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
              <Building2 size={28} className="mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500">Sin eventos asociados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventosCliente.map(e => (
                <div
                  key={e.id}
                  onClick={() => navigate(`/proyectos/${e.id}`)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-h)] cursor-pointer transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EstadoBadge estado={e.estado} />
                    </div>
                    <p className="font-medium text-gray-200 truncate">{e.titulo}</p>
                    <p className="text-xs text-gray-500">{e.lugar || '—'} · {formatDate(e.eventoInicio)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
