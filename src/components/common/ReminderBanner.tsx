import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, MapPin, X } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import {
  computeDueReminders,
  loadFired,
  saveFired,
  type DueReminder,
} from '@/utils/reminders'

// In-app banner that surfaces "starts in 15min" and "starting now" reminders
// for the active trip's itinerary. Also fires a browser Notification if
// permission has been granted. Permission must be explicitly requested by the
// user — we never auto-prompt.
export default function ReminderBanner() {
  const { trip } = useTrip()
  const navigate = useNavigate()
  const firedRef = useRef<Set<string>>(loadFired())
  const [active, setActive] = useState<DueReminder[]>([])
  const [permissionAsked, setPermissionAsked] = useState<boolean>(
    typeof Notification !== 'undefined' && Notification.permission !== 'default',
  )

  useEffect(() => {
    const tick = () => {
      const due = computeDueReminders(trip.itinerary, new Date())
      const fresh = due.filter(r => !firedRef.current.has(r.id))
      if (fresh.length === 0) return
      fresh.forEach(r => firedRef.current.add(r.id))
      saveFired(firedRef.current)

      // Browser notification (only if user granted permission)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        for (const r of fresh) {
          try {
            new Notification(r.type === 'soon' ? 'Starting in 15 min' : 'Starting now', {
              body: `${r.time} · ${r.title}${r.location ? ' · ' + r.location : ''}`,
              icon: '/icon-192.png',
              tag: r.id,
              silent: false,
            })
          } catch {
            // Some browsers throw outside of a SW context — ignore.
          }
        }
      }

      setActive(prev => {
        // Most recent first; cap at 3 visible.
        const next = [...fresh.reverse(), ...prev].slice(0, 3)
        return next
      })
    }
    tick() // run once on mount
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [trip.itinerary])

  const dismiss = (id: string) => {
    setActive(prev => prev.filter(r => r.id !== id))
  }

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return
    try {
      const result = await Notification.requestPermission()
      setPermissionAsked(result !== 'default')
    } catch {
      setPermissionAsked(true)
    }
  }

  const canAskPermission =
    typeof Notification !== 'undefined' &&
    !permissionAsked &&
    active.length > 0 // only show the "Enable" pill alongside an active banner

  return (
    <>
      <AnimatePresence>
        {active.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 24 }}
            style={{ top: `${12 + i * 70}px` }}
            className="fixed left-3 right-3 z-[1850] max-w-lg mx-auto"
          >
            <div
              onClick={() => navigate('/timeline')}
              className={
                'cursor-pointer rounded-2xl shadow-2xl p-3 flex items-center gap-3 ' +
                (r.type === 'now'
                  ? 'bg-primary text-white'
                  : 'bg-amber-500 text-white')
              }
              role="alert"
            >
              <Bell className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {r.type === 'now' ? 'Starting now' : `In ~15 min · ${r.time}`}
                </p>
                <p className="text-sm font-bold truncate">{r.title}</p>
                {r.location && (
                  <p className="text-xs opacity-90 flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" /> {r.location}
                  </p>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); dismiss(r.id) }}
                aria-label="Dismiss"
                className="p-1.5 rounded-lg hover:bg-white/15 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {canAskPermission && (
        <motion.button
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={enableNotifications}
          style={{ top: `${12 + active.length * 70}px` }}
          className="fixed left-3 right-3 z-[1849] max-w-lg mx-auto rounded-xl bg-background border border-border shadow-md px-3 py-1.5 flex items-center gap-2 text-xs"
        >
          <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 text-left text-muted-foreground">Allow notifications for activity reminders</span>
          <span className="text-primary font-bold">Enable</span>
        </motion.button>
      )}
    </>
  )
}
