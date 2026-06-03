import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { WelcomeModal } from '@/components/WelcomeModal'

import { Layout } from '@/components/layout/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProyectosPage } from '@/pages/ProyectosPage'
import { EventoDetailPage } from '@/pages/EventoDetailPage'
import { CalendarioPage } from '@/pages/CalendarioPage'
import { ClientesPage } from '@/pages/ClientesPage'
import { ClienteDetailPage } from '@/pages/ClienteDetailPage'
import { TrabajosPage } from '@/pages/TrabajosPage'
import { AdminPage } from '@/pages/AdminPage'
import { PlanillaPage } from '@/pages/PlanillaPage'
import { MisTareasPage } from '@/pages/MisTareasPage'

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore(s => s.theme)

  useEffect(() => {
    const html = document.documentElement
    const applyTheme = (isDark: boolean) => {
      html.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  return <>{children}</>
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true)
  const initAuth = useAppStore(s => s.initAuth)

  useEffect(() => {
    return initAuth()
  }, [])

  return (
    <BrowserRouter basename="/controlx-syncro2">
      <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/proyectos" element={<ProyectosPage />} />
            <Route path="/proyectos/:id" element={<EventoDetailPage />} />
            <Route path="/proyectos/:id/planilla" element={<PlanillaPage />} />
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
            <Route path="/mis-tareas" element={<MisTareasPage />} />
            <Route path="/trabajos" element={<TrabajosPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
