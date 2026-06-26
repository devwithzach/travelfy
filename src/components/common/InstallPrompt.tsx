import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'travelfy-install-dismissed-at'
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export default function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const recent = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (recent && Date.now() - recent < DISMISS_TTL_MS) return

    const handler = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
      // Slight delay so it doesn't pop the moment the app loads.
      setTimeout(() => setVisible(true), 2500)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const install = async () => {
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-3 right-3 z-[1800] bg-background border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3"
          role="dialog"
          aria-label="Install Travelfy"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install Travelfy</p>
            <p className="text-xs text-muted-foreground">Add to home screen for offline use</p>
          </div>
          <button
            onClick={install}
            className="text-xs font-bold bg-primary text-white px-3 py-2 rounded-xl shrink-0"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1.5 rounded-lg hover:bg-muted shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
