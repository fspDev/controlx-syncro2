import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  const { currentUser, usuarios, sidebarOpen, setSidebarOpen } = useAppStore()

  // Demo mode: auto-login as admin if no session active
  useEffect(() => {
    if (!currentUser) {
      const admin = usuarios.find(u => u.rol === 'admin')
      if (admin) useAppStore.setState({ currentUser: admin })
    }
  }, [currentUser, usuarios])

  if (!currentUser && !usuarios.find(u => u.rol === 'admin')) return <Navigate to="/login" replace />

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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
