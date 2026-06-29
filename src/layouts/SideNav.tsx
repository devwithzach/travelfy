import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Layers, Map, MapPin, Plane, Building2,
  ListChecks, DollarSign, Camera, FileText, AlertCircle,
  StickyNote, Link2, Globe, TrendingUp, Settings, BarChart3,
  ChevronRight, LogOut, Plane as PlaneLogo
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'

const primaryNav = [
  { to: '/',       icon: LayoutDashboard, label: 'Home',     end: true },
  { to: '/trips',  icon: Layers,          label: 'My Trips', end: true },
  { to: '/timeline', icon: Map,           label: 'Timeline' },
  { to: '/map',    icon: MapPin,          label: 'Explore' },
]

const tripNav = [
  { to: '/flights',   icon: Plane,        label: 'Flights',   color: '#3b82f6' },
  { to: '/hotels',    icon: Building2,    label: 'Hotels',    color: '#8b5cf6' },
  { to: '/checklist', icon: ListChecks,   label: 'Checklist', color: '#f59e0b' },
  { to: '/expenses',  icon: DollarSign,   label: 'Expenses',  color: '#f43f5e' },
  { to: '/photos',    icon: Camera,       label: 'Photos',    color: '#ec4899' },
  { to: '/stats',     icon: BarChart3,    label: 'Stats',     color: '#10b981' },
]

const moreNav = [
  { to: '/documents', icon: FileText,     label: 'Documents', color: '#06b6d4' },
  { to: '/emergency', icon: AlertCircle,  label: 'Emergency', color: '#ef4444' },
  { to: '/notes',     icon: StickyNote,   label: 'Notes',     color: '#f59e0b' },
  { to: '/links',     icon: Link2,        label: 'Links',     color: '#6366f1' },
  { to: '/passport',  icon: Globe,        label: 'Passport',  color: '#10b981' },
  { to: '/currency',  icon: TrendingUp,   label: 'Currency',  color: '#14b8a6' },
  { to: '/settings',  icon: Settings,     label: 'Settings',  color: '#94a3b8' },
]

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 relative group',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidenav-active"
              className="absolute inset-0 bg-primary/10 rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            />
          )}
          <Icon className="h-4.5 w-4.5 relative z-10 shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
          <span className="relative z-10 truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function ColorNavItem({ to, icon: Icon, label, color }: { to: string; icon: React.ElementType; label: string; color: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
          isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: color + '20' }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: isActive ? color : color + 'cc' }} strokeWidth={2} />
          </div>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function SideNav() {
  const { activeTripId, trip, exitTrip } = useTrip()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [moreExpanded, setMoreExpanded] = useState(false)
  const inLobby = !activeTripId

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 h-screen sticky top-0 border-r border-border bg-background/95 backdrop-blur-lg overflow-y-auto">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shrink-0">
            <PlaneLogo className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-bold text-base tracking-tight">Travelfy</span>
        </div>
        {/* Active trip chip */}
        {!inLobby && trip.tripInfo.name && (
          <button
            onClick={() => navigate('/trips')}
            className="mt-3 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-primary/8 hover:bg-primary/12 transition-colors text-left"
          >
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs font-medium text-primary truncate flex-1">{trip.tripInfo.name}</span>
            <ChevronRight className="h-3 w-3 text-primary/60 shrink-0" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {/* Primary */}
        {primaryNav
          .filter(n => !inLobby || n.to === '/' || n.to === '/trips')
          .map(n => <NavItem key={n.to} {...n} />)
        }

        {/* Trip-scoped section */}
        {!inLobby && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">This Trip</p>
            </div>
            {tripNav.map(n => <ColorNavItem key={n.to} {...n} />)}

            {/* More collapsible */}
            <div className="pt-1">
              <button
                onClick={() => setMoreExpanded(v => !v)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150"
              >
                <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">···</span>
                </div>
                <span className="flex-1 text-left">More</span>
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', moreExpanded && 'rotate-90')} />
              </button>
              <AnimatePresence>
                {moreExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-2 pt-0.5 space-y-0.5">
                      {moreNav.map(n => <ColorNavItem key={n.to} {...n} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </nav>

      {/* Bottom: user + sign out */}
      <div className="px-3 py-3 border-t border-border space-y-1">
        {!inLobby && (
          <button
            onClick={() => navigate('/trips')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1 text-left">Switch trip</span>
          </button>
        )}
        <div className="px-3 py-1.5">
          {user?.email && (
            <p className="text-[11px] text-muted-foreground/60 truncate mb-1">{user.email}</p>
          )}
          <button
            onClick={() => { signOut(); exitTrip() }}
            className="w-full flex items-center gap-2.5 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
