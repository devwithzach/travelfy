import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

  if (loading) return null

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
