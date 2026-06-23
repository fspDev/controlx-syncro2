import { Outlet, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function Layout() {
  const { currentUser, authLoading, sidebarOpen, setSidebarOpen } = useAppStore()

  if (authLoading) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6 bg-[var(--bg)]">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
