import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import BottomNav from './BottomNav'
import { useTrip } from '@/contexts/TripContext'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function MainLayout() {
  const location = useLocation()
  const { activeTripId, loading } = useTrip()

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

  if (!activeTripId) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      <BottomNav />
    </div>
  )
}
