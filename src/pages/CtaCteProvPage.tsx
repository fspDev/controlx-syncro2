import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { CtaCteProv } from '@/components/ctaCteProv/CtaCteProv'

export function CtaCteProvPage() {
  const { currentUser } = useAppStore()

  // Mismo patrón de protección que el resto de las páginas del repo: early
  // return con redirect silencioso, sin componente de "sin acceso" dedicado
  // (no existe uno en el proyecto — ver AdminPage.tsx). El título y las
  // acciones viven dentro de <CtaCteProv /> para poder ubicarlos junto a los
  // botones de la barra superior.
  if (currentUser?.permisos?.ctaCteProv !== true) return <Navigate to="/dashboard" replace />

  return <CtaCteProv />
}
