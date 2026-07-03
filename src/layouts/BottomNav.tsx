import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Plane, Building2, FileText, ListChecks,
  DollarSign, AlertCircle, StickyNote, Map, Link2, Settings,
  MapPin, Camera, Globe, Layers, MoreHorizontal, X, TrendingUp, BarChart3, LogOut, Anchor, Bus, Bike, CloudRain, ShieldAlert
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/trips', icon: Layers, label: 'My Trips' },
  { to: '/timeline', icon: Map, label: 'Timeline' },
  { to: '/map', icon: MapPin, label: 'Explore' },
]

const moreItems = [
  { to: '/checklist', icon: ListChecks, label: 'Checklist', color: '#f59e0b' },
  { to: '/flights', icon: Plane, label: 'Flights', color: '#3b82f6' },
  { to: '/ferries', icon: Anchor, label: 'Ferries', color: '#06b6d4' },
  { to: '/buses', icon: Bus, label: 'Bus / Van', color: '#f59e0b' },
  { to: '/local-transport', icon: Bike, label: 'Local Rides', color: '#10b981' },
  { to: '/weather', icon: CloudRain, label: 'Weather', color: '#38bdf8' },
  { to: '/advisories', icon: ShieldAlert, label: 'Advisories', color: '#ef4444' },
  { to: '/hotels', icon: Building2, label: 'Hotels', color: '#8b5cf6' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses', color: '#f43f5e' },
  { to: '/stats', icon: BarChart3, label: 'Stats', color: '#10b981' },
  { to: '/photos', icon: Camera, label: 'Photos', color: '#ec4899' },
  { to: '/documents', icon: FileText, label: 'Docs', color: '#06b6d4' },
  { to: '/emergency', icon: AlertCircle, label: 'Emergency', color: '#ef4444' },
  { to: '/notes', icon: StickyNote, label: 'Notes', color: '#f59e0b' },
  { to: '/links', icon: Link2, label: 'Links', color: '#6366f1' },
  { to: '/passport', icon: Globe, label: 'Passport', color: '#10b981' },
  { to: '/currency', icon: TrendingUp, label: 'Currency', color: '#14b8a6' },
  { to: '/settings', icon: Settings, label: 'Settings', color: '#94a3b8' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()
  const { activeTripId, trip } = useTrip()
  const { signOut, user } = useAuth()
  const inLobby = !activeTripId
  const isDomestic = trip?.tripInfo.tripType === 'domestic'
  // In lobby mode the user hasn't picked a trip — only the Home and Trips
  // tabs are valid. Trip-scoped destinations are hidden so they can't be
  // tapped into an empty trip context.
  const visibleMain = inLobby ? mainNav.filter(n => n.to === '/' || n.to === '/trips') : mainNav
  const PH_ONLY = ['/ferries', '/buses', '/local-transport', '/weather', '/advisories']
  const INTL_ONLY = ['/passport', '/currency']
  const visibleMore = moreItems.filter(n => {
    if (isDomestic && INTL_ONLY.includes(n.to)) return false
    if (!isDomestic && PH_ONLY.includes(n.to)) return false
    return true
  })

  const handleMoreItem = (to: string) => {
    setMoreOpen(false)
    navigate(to)
  }

  return (
    <div className="lg:hidden">
      {/* More Drawer Backdrop */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More Drawer Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-background border-t border-border rounded-t-3xl pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">More</p>
                {user?.email && (
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5 truncate max-w-[200px]">{user.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { setMoreOpen(false); await signOut() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 active:scale-95 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-1 px-3 pb-6">
              {visibleMore.map(({ to, icon: Icon, label, color }) => (
                <button
                  key={to}
                  onClick={() => handleMoreItem(to)}
                  className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl hover:bg-accent active:scale-95 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: color + '20' }}
                  >
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[1500] bg-background/95 backdrop-blur-lg border-t border-border safe-bottom">
        <div className="flex px-2 py-1">
          {visibleMain.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 relative',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <Icon className="h-5 w-5 relative z-10" strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium mt-0.5 relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button — hidden in lobby (drawer contents are all trip-scoped) */}
          {!inLobby && (
            <button
              onClick={() => setMoreOpen(v => !v)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 relative',
                moreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {moreOpen && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <MoreHorizontal className="h-5 w-5 relative z-10" strokeWidth={moreOpen ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium mt-0.5 relative z-10">More</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
