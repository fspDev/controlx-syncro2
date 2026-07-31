import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { CtaCteProv } from '@/components/ctaCteProv/CtaCteProv'
import { Wallet } from 'lucide-react'

export function CtaCteProvPage() {
  const { currentUser } = useAppStore()

  // Mismo patrón de protección que el resto de las páginas del repo: early
  // return con redirect silencioso, sin componente de "sin acceso" dedicado
  // (no existe uno en el proyecto — ver AdminPage.tsx).
  if (currentUser?.permisos?.ctaCteProv !== true) return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Wallet size={20} className="text-brand-400" />
        <h1 className="text-xl font-bold text-gray-100">Cuenta Corriente de Proveedores</h1>
      </div>
      <CtaCteProv />
    </div>
  )
}
