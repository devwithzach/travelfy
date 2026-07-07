import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Plane, TrendingUp, RefreshCw,
  Crown, Building2, UserCheck, UserX, Lock, Eye, EyeOff,
  MapPin, Package, BookOpen, DollarSign, Calendar,
  Trash2, CheckCircle, XCircle, Globe, ChevronRight,
  Search, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/utils/cn'

// ── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'traveler' | 'operator' | 'admin'

interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name: string
  created_at: string
}

interface AdminStats {
  total_users: number
  total_trips: number
  total_bookings: number
  total_expenses_php: number
  tour_packages: number
  new_users_this_week: number
}

interface TripRow {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  status: string
  trip_type: string
  user_id: string
}

interface TourPackage {
  id: string
  name: string
  destination: string
  duration_days: number
  price: number
  slots: number
  status: string
  operator_id: string
  created_at: string
}

interface Booking {
  id: string
  traveler_name: string
  traveler_email: string
  status: string
  created_at: string
  tour_packages: { name: string; destination: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function avatarBg(role: UserRole): string {
  switch (role) {
    case 'admin':    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    case 'operator': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
    default:         return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

function roleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'admin':    return 'border-transparent bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    case 'operator': return 'border-transparent bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
    default:         return 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}

function RoleIcon({ role }: { role: UserRole }) {
  switch (role) {
    case 'admin':    return <Crown className="h-3 w-3" />
    case 'operator': return <Building2 className="h-3 w-3" />
    default:         return <UserCheck className="h-3 w-3" />
  }
}

function statusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'published':
    case 'confirmed':
    case 'ongoing':
      return 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'upcoming':
    case 'pending':
    case 'draft':
      return 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'cancelled':
    case 'closed':
    case 'rejected':
      return 'border-transparent bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
    case 'completed':
    case 'past':
      return 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    default:
      return 'border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  }
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center"
      >
        <Plane className="h-6 w-6 text-white" />
      </motion.div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ open, title, description, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-9"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: string | number
  icon: React.ElementType
  colorClass: string
}

function StatTile({ label, value, icon: Icon, colorClass }: StatTileProps) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-1">
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-1', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaded = useRef(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

      const [
        usersRes,
        tripsRes,
        bookingsRes,
        packagesRes,
        newUsersRes,
        expensesRes,
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('trips').select('*', { count: 'exact', head: true }),
        supabase.from('tour_bookings').select('*', { count: 'exact', head: true }),
        supabase.from('tour_packages').select('*', { count: 'exact', head: true }),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo),
        supabase
          .from('expenses')
          .select('amount, currency')
          .eq('currency', 'PHP'),
      ])

      const totalExpensesPHP = (expensesRes.data ?? []).reduce(
        (sum: number, e: { amount: number }) => sum + (e.amount ?? 0),
        0,
      )

      setStats({
        total_users: usersRes.count ?? 0,
        total_trips: tripsRes.count ?? 0,
        total_bookings: bookingsRes.count ?? 0,
        tour_packages: packagesRes.count ?? 0,
        new_users_this_week: newUsersRes.count ?? 0,
        total_expenses_php: totalExpensesPHP,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchStats()
  }, [fetchStats])

  if (loading) return <LoadingSpinner label="Fetching overview…" />

  if (error) return (
    <Card className="border-destructive/40">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchStats} className="h-7 text-xs shrink-0">Retry</Button>
      </CardContent>
    </Card>
  )

  if (!stats) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 gap-3"
    >
      <StatTile label="Total Users" value={stats.total_users} icon={Users}
        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      <StatTile label="Total Trips" value={stats.total_trips} icon={Plane}
        colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      <StatTile label="Total Bookings" value={stats.total_bookings} icon={BookOpen}
        colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
      <StatTile
        label="Expenses (PHP)"
        value={'₱' + stats.total_expenses_php.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
        icon={DollarSign}
        colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      />
      <StatTile label="Tour Packages" value={stats.tour_packages} icon={Package}
        colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
      <StatTile label="New Users This Week" value={stats.new_users_this_week} icon={TrendingUp}
        colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
    </motion.div>
  )
}

// ── Tab 2: Users ──────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const loaded = useRef(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw new Error(err.message)
      setUsers((data ?? []) as UserProfile[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId)
    try {
      const { error: err } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (err) throw new Error(err.message)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      await fetchUsers()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: err } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', deleteTarget.id)
      if (err) throw new Error(err.message)
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      await fetchUsers()
    } finally {
      setDeleting(false)
    }
  }

  const filtered = users.filter(u =>
    search === '' ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) return <LoadingSpinner label="Loading users…" />

  if (error) return (
    <Card className="border-destructive/40">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchUsers} className="h-7 text-xs shrink-0">Retry</Button>
      </CardContent>
    </Card>
  )

  const ROLES: UserRole[] = ['traveler', 'operator', 'admin']

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {users.length} users
      </p>

      {filtered.length === 0 ? (
        <EmptyState message="No users match your search." />
      ) : (
        filtered.map(u => {
          const initial = (u.full_name || u.email || '?').charAt(0).toUpperCase()
          return (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                    avatarBg(u.role),
                  )}>
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate max-w-[160px]">
                        {u.full_name || 'Unnamed'}
                      </p>
                      <Badge className={cn('text-[10px] px-1.5 py-0 flex items-center gap-1', roleBadgeClass(u.role))}>
                        <RoleIcon role={u.role} />
                        {u.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Joined {formatDate(u.created_at)}</p>

                    {/* Role picker */}
                    <div className="mt-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">
                        Role
                      </p>
                      <div className="flex gap-1.5">
                        {ROLES.map(r => (
                          <button
                            key={r}
                            disabled={updatingId === u.id}
                            onClick={() => r !== u.role && handleRoleChange(u.id, r)}
                            className={cn(
                              'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95',
                              r === u.role
                                ? roleBadgeClass(r) + ' border-transparent'
                                : 'border-border text-muted-foreground hover:border-primary/50',
                            )}
                          >
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      Delete User
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteTarget?.full_name || deleteTarget?.email}"? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

// ── Tab 3: Trips ──────────────────────────────────────────────────────────────

function TripsTab() {
  const [trips, setTrips] = useState<TripRow[]>([])
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TripRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const loaded = useRef(false)

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tripsRes, profilesRes] = await Promise.all([
        supabase
          .from('trips')
          .select('id, name, destination, start_date, end_date, status, trip_type, user_id')
          .order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id, email'),
      ])

      if (tripsRes.error) throw new Error(tripsRes.error.message)
      setTrips((tripsRes.data ?? []) as TripRow[])

      const map: Record<string, string> = {}
      for (const p of profilesRes.data ?? []) {
        map[p.id] = p.email
      }
      setUserMap(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trips')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchTrips()
  }, [fetchTrips])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: err } = await supabase.from('trips').delete().eq('id', deleteTarget.id)
      if (err) throw new Error(err.message)
      setTrips(prev => prev.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      await fetchTrips()
    } finally {
      setDeleting(false)
    }
  }

  const filtered = trips.filter(t =>
    search === '' ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) return <LoadingSpinner label="Loading trips…" />
  if (error) return (
    <Card className="border-destructive/40">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchTrips} className="h-7 text-xs shrink-0">Retry</Button>
      </CardContent>
    </Card>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Search by name or destination…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {trips.length} trips
      </p>

      {filtered.length === 0 ? (
        <EmptyState message="No trips match your search." />
      ) : (
        filtered.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Plane className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{t.name || 'Unnamed Trip'}</p>
                    <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', statusBadgeClass(t.status))}>
                      {t.status || 'unknown'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{t.destination || '—'}</p>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {t.trip_type && (
                      <Badge className="text-[10px] px-1.5 py-0 border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Globe className="h-2.5 w-2.5 mr-1" />
                        {t.trip_type}
                      </Badge>
                    )}
                    {t.start_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(t.start_date)}
                        {t.end_date && <><ChevronRight className="h-3 w-3" />{formatDate(t.end_date)}</>}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Owner: {userMap[t.user_id] || t.user_id?.slice(0, 8) + '…'}
                  </p>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Delete Trip
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Trip"
        description={`Delete "${deleteTarget?.name}"? All associated data will be removed.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

// ── Tab 4: Tour Packages ──────────────────────────────────────────────────────

function PackagesTab() {
  const [packages, setPackages] = useState<TourPackage[]>([])
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TourPackage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const loaded = useRef(false)

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pkgRes, profilesRes] = await Promise.all([
        supabase.from('tour_packages').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id, full_name, email'),
      ])
      if (pkgRes.error) throw new Error(pkgRes.error.message)
      setPackages((pkgRes.data ?? []) as TourPackage[])

      const map: Record<string, string> = {}
      for (const p of profilesRes.data ?? []) {
        map[p.id] = p.full_name || p.email
      }
      setOperatorMap(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load packages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchPackages()
  }, [fetchPackages])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const { error: err } = await supabase.from('tour_packages').update({ status }).eq('id', id)
      if (err) throw new Error(err.message)
      setPackages(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    } catch {
      await fetchPackages()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error: err } = await supabase.from('tour_packages').delete().eq('id', deleteTarget.id)
      if (err) throw new Error(err.message)
      setPackages(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      await fetchPackages()
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner label="Loading packages…" />
  if (error) return (
    <Card className="border-destructive/40">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchPackages} className="h-7 text-xs shrink-0">Retry</Button>
      </CardContent>
    </Card>
  )

  if (packages.length === 0) return <EmptyState message="No tour packages found." />

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {packages.map(pkg => {
        const busy = updatingId === pkg.id
        return (
          <Card key={pkg.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{pkg.name}</p>
                    <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', statusBadgeClass(pkg.status))}>
                      {pkg.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{pkg.destination}</p>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground tabular-nums flex-wrap">
                    <span>{pkg.duration_days}d</span>
                    <span>₱{(pkg.price ?? 0).toLocaleString()}</span>
                    <span>{pkg.slots} slots</span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Operator: {operatorMap[pkg.operator_id] || pkg.operator_id?.slice(0, 8) + '…'}
                  </p>

                  {/* Status actions */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {pkg.status !== 'published' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        disabled={busy}
                        onClick={() => updateStatus(pkg.id, 'published')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Publish
                      </Button>
                    )}
                    {pkg.status !== 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={busy}
                        onClick={() => updateStatus(pkg.id, 'draft')}
                      >
                        Unpublish
                      </Button>
                    )}
                    {pkg.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        disabled={busy}
                        onClick={() => updateStatus(pkg.id, 'closed')}
                      >
                        Close
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2"
                      onClick={() => setDeleteTarget(pkg)}
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Package"
        description={`Delete "${deleteTarget?.name}"? All bookings for this package may also be affected.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

// ── Tab 5: Bookings ───────────────────────────────────────────────────────────

function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const loaded = useRef(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tour_bookings')
        .select('*, tour_packages(name, destination)')
        .order('created_at', { ascending: false })
      if (err) throw new Error(err.message)
      setBookings((data ?? []) as Booking[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchBookings()
  }, [fetchBookings])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const { error: err } = await supabase.from('tour_bookings').update({ status }).eq('id', id)
      if (err) throw new Error(err.message)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    } catch {
      await fetchBookings()
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <LoadingSpinner label="Loading bookings…" />
  if (error) return (
    <Card className="border-destructive/40">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={fetchBookings} className="h-7 text-xs shrink-0">Retry</Button>
      </CardContent>
    </Card>
  )

  if (bookings.length === 0) return <EmptyState message="No bookings found." />

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {bookings.map(b => {
        const busy = updatingId === b.id
        const pkg = b.tour_packages
        return (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">
                      {b.traveler_name || 'Unknown Traveler'}
                    </p>
                    <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', statusBadgeClass(b.status))}>
                      {b.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground truncate mt-0.5">{b.traveler_email}</p>

                  {pkg && (
                    <div className="flex items-center gap-1 mt-1">
                      <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">
                        {pkg.name} · {pkg.destination}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Booked {formatDate(b.created_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {b.status !== 'confirmed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        disabled={busy}
                        onClick={() => updateStatus(b.id, 'confirmed')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Confirm
                      </Button>
                    )}
                    {b.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        disabled={busy}
                        onClick={() => updateStatus(b.id, 'cancelled')}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </motion.div>
  )
}

// ── Standalone admin login form ───────────────────────────────────────────────

function AdminLogin() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) { setError(err); setLoading(false) }
    // On success, AuthContext sets user → page re-renders into admin dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with your admin account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-rose-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [myRole, setMyRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Derive own role from user_profiles
  useEffect(() => {
    if (!user) { setRoleLoading(false); return }
    supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data: row }) => {
        setMyRole(row?.role ?? null)
        setRoleLoading(false)
      })
  }, [user])

  // Not logged in
  if (!user) return <AdminLogin />

  // Loading role check
  if (roleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center"
        >
          <Plane className="h-6 w-6 text-white" />
        </motion.div>
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    )
  }

  // Access denied
  if (myRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <UserX className="h-8 w-8 text-rose-600" />
        </div>
        <div>
          <p className="text-lg font-bold">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-1">
            You don't have permission to view the Admin Dashboard.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>Go Back</Button>
      </div>
    )
  }

  // ── Admin dashboard ────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform overview & management"
        icon={Shield}
        iconColor="text-rose-600"
        hideTripContext
      />

      <div className="px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 h-9 mb-4 text-[11px]">
            <TabsTrigger value="overview" className="px-1">Overview</TabsTrigger>
            <TabsTrigger value="users" className="px-1">Users</TabsTrigger>
            <TabsTrigger value="trips" className="px-1">Trips</TabsTrigger>
            <TabsTrigger value="packages" className="px-1">Packages</TabsTrigger>
            <TabsTrigger value="bookings" className="px-1">Bookings</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="users" className="mt-0">
              <UsersTab />
            </TabsContent>
            <TabsContent value="trips" className="mt-0">
              <TripsTab />
            </TabsContent>
            <TabsContent value="packages" className="mt-0">
              <PackagesTab />
            </TabsContent>
            <TabsContent value="bookings" className="mt-0">
              <BookingsTab />
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  )
}
