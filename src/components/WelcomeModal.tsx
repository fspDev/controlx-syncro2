import { Dialog } from './ui/Dialog'
import { FolderKanban, Users, Clock, ShieldCheck, ArrowRight } from 'lucide-react'

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Control X Syncro" 
      size="md"
    >
      <div className="space-y-6 py-2">
        <div className="space-y-2">
          <p className="text-sm text-gray-400 leading-relaxed">
            Bienvenido al <span className="text-brand-400 font-semibold italic">Sistema de Gestión de Operaciones y Sincronización</span>. 
            Esta plataforma ha sido diseñada para optimizar la coordinación técnica y operativa en tiempo real.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">¿Qué puedes hacer?</h3>
          
          <div className="grid gap-4">
            <div className="flex gap-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30">
              <div className="p-2 bg-brand-500/10 rounded-lg shrink-0">
                <FolderKanban className="text-brand-400" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Gestión de Proyectos</h4>
                <p className="text-xs text-gray-500 mt-0.5">Seguimiento detallado desde la fase de negociación hasta el cierre operativo.</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30">
              <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                <Clock className="text-amber-400" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Sincronización de Tareas</h4>
                <p className="text-xs text-gray-500 mt-0.5">Control de plazos, armados y responsabilidades de equipo.</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30">
              <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                <Users className="text-blue-400" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Base de Clientes</h4>
                <p className="text-xs text-gray-500 mt-0.5">Centralización de información, contactos y requerimientos específicos.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-tighter">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Acceso Seguro / Protocolo v2.0.25</span>
          </div>
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 group text-sm cursor-pointer"
          >
            Sincronizar Panel
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </Dialog>
  )
}
