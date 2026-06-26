import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plane, X } from 'lucide-react'
import BottomNav from './BottomNav'
import ReminderBanner from '@/components/common/ReminderBanner'
import { useTrip } from '@/contexts/TripContext'
import { useFlightStatusSync } from '@/hooks/useFlightStatusSync'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function MainLayout() {
  const location = useLocation()
  const { activeTripId, loading, error, clearError } = useTrip()
  useFlightStatusSync()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center"
        >
          <Plane className="h-5 w-5 text-white" />
        </motion.div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!activeTripId) return <Navigate to="/trips" replace />

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            role="alert"
            className="fixed top-0 left-0 right-0 z-[2000] bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center gap-3 shadow-lg"
          >
            <p className="flex-1 text-xs font-medium">{error}</p>
            <button onClick={clearError} aria-label="Dismiss error" className="p-1 rounded hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <ReminderBanner />
      <BottomNav />
    </div>
  )
}
