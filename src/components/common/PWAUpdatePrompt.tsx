import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'

export default function PWAUpdatePrompt() {
  const [needsUpdate, setNeedsUpdate] = useState(false)

  useEffect(() => {
    registerSW({
      onNeedRefresh() {
        setNeedsUpdate(true)
      },
      onRegisterError(err) {
        // eslint-disable-next-line no-console
        console.warn('SW registration failed:', err)
      },
    })
  }, [])

  const reload = () => {
    // Easiest cross-browser way to activate the waiting SW.
    window.location.reload()
  }

  if (!needsUpdate) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-3 left-3 right-3 z-[1900] bg-primary text-white rounded-2xl shadow-xl p-3 flex items-center gap-3"
        role="status"
      >
        <RefreshCw className="h-4 w-4 shrink-0" />
        <p className="flex-1 text-xs font-medium">New version available</p>
        <button
          onClick={reload}
          className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg"
        >
          Reload
        </button>
        <button
          onClick={() => setNeedsUpdate(false)}
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
