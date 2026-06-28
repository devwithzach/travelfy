import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'

// Auto-reload-on-update behavior:
//   1. registerSW.onNeedRefresh fires when a new SW is installed and waiting.
//   2. We immediately call updateSW(true) which tells the new SW to skipWaiting
//      and become active. Because src/sw.ts also calls clientsClaim(), the new
//      SW takes over the current page instantly.
//   3. We show a brief "Updating…" toast and trigger a single reload so the
//      stale React bundle gets replaced. Subsequent SW updates won't re-trigger
//      because the freshly-loaded page already has the new bundle.
//
// This eliminates the "tap Reload to see your changes" friction that left
// users staring at stale data after each commit.
export default function PWAUpdatePrompt() {
  const [updating, setUpdating] = useState(false)
  const handledRef = useRef(false)

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (handledRef.current) return
        handledRef.current = true
        setUpdating(true)
        // Activate the waiting SW; once it controls the page, reload once.
        updateSW(true).then(() => {
          // Defer slightly so the user actually sees the "Updating…" hint.
          setTimeout(() => window.location.reload(), 600)
        }).catch(() => {
          window.location.reload()
        })
      },
      onRegisterError(err) {
        // eslint-disable-next-line no-console
        console.warn('SW registration failed:', err)
      },
    })
  }, [])

  return (
    <AnimatePresence>
      {updating && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-3 left-3 right-3 z-[1900] bg-primary text-white rounded-2xl shadow-xl p-3 flex items-center gap-3 max-w-lg mx-auto"
          role="status"
        >
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <p className="flex-1 text-xs font-medium">Updating to the latest version…</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
