import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TripProvider } from '@/contexts/TripContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/Login'
import Trips from '@/pages/Trips'
import Dashboard from '@/pages/Dashboard'
import Flights from '@/pages/Flights'
import Hotels from '@/pages/Hotels'
import Timeline from '@/pages/Timeline'
import Checklist from '@/pages/Checklist'
import Expenses from '@/pages/Expenses'
import Emergency from '@/pages/Emergency'
import Notes from '@/pages/Notes'
import QuickLinks from '@/pages/QuickLinks'
import Documents from '@/pages/Documents'
import Passport from '@/pages/Passport'
import Currency from '@/pages/Currency'
import Settings from '@/pages/Settings'
import MapExplorer from '@/pages/MapExplorer'
import Ferries from '@/pages/Ferries'
import Photos from '@/pages/Photos'
import Stats from '@/pages/Stats'
import Landing from '@/pages/Landing'
import InstallPrompt from '@/components/common/InstallPrompt'
import PWAUpdatePrompt from '@/components/common/PWAUpdatePrompt'
import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'

const queryClient = new QueryClient()

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center"
        >
          <Plane className="h-6 w-6 text-white" />
        </motion.div>
        <p className="text-sm text-muted-foreground">Loading Travelfy...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <TripProvider>
      <Routes>
        {/* Trips list - own layout (no bottom nav). Standalone picker. */}
        <Route path="/trips" element={<Trips />} />

        {/* App pages inside MainLayout, with Dashboard at / */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/flights" element={<Flights />} />
          <Route path="/ferries" element={<Ferries />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/passport" element={<Passport />} />
          <Route path="/currency" element={<Currency />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/links" element={<QuickLinks />} />
          <Route path="/map" element={<MapExplorer />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </TripProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<AppRoutes />} />
            </Routes>
            <InstallPrompt />
            <PWAUpdatePrompt />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
