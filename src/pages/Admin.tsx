import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Plane, TrendingUp, RefreshCw,
  Crown, Building2, UserCheck, UserX,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'

// ── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'traveler' | 'operator' | 'admin'

interface AdminUser {
  id: string
  email: string
  role: UserRole
  full_name: string
  trip_count: number
  created_at: string
  last_sign_in_at: string
}

interface AdminStats {
  total_users: number
  total_trips: number
  operators: number
  admins: number
  new_this_week: number
}

interface AdminResponse {
  users: AdminUser[]
  stats: AdminStats
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatJoined(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function roleColor(role: UserRole): string {
  switch (role) {
    case 'admin':    return 'rose'
    case 'operator': return 'violet'
    default:         return 'slate'
  }
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

// ── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: number
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
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

// ── User card ────────────────────────────────────────────────────────────────

interface UserCardProps {
  user: AdminUser
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>
  updating: boolean
}

function UserCard({ user, onRoleChange, updating }: UserCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase()
  const color = roleColor(user.role)
  const ROLES: UserRole[] = ['traveler', 'operator', 'admin']

  const handleRolePick = async (role: UserRole) => {
    if (role === user.role) { setPickerOpen(false); return }
    await onRoleChange(user.id, role)
    setPickerOpen(false)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
            avatarBg(user.role),
          )}>
            {initial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate max-w-[160px]">
                {user.full_name || 'Unnamed'}
              </p>
              <Badge className={cn('text-[10px] px-1.5 py-0 flex items-center gap-1', roleBadgeClass(user.role))}>
                <RoleIcon role={user.role} />
                {user.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Plane className="h-3 w-3" />
                <span className="tabular-nums">{user.trip_count}</span> trip{user.trip_count !== 1 ? 's' : ''}
              </span>
              <span>Joined {formatJoined(user.created_at)}</span>
            </div>

            {/* Role picker */}
            {pickerOpen ? (
              <div className="mt-3 flex flex-col gap-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  Assign role
                </p>
                <div className="flex gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      disabled={updating}
                      onClick={() => handleRolePick(r)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95',
                        r === user.role
                          ? cn(
                              'border-transparent',
                              r === 'admin'    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                              r === 'operator' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                                                 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                            )
                          : 'border-border text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground mt-1"
                  onClick={() => setPickerOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs"
                onClick={() => setPickerOpen(true)}
              >
                <Shield className="h-3 w-3 mr-1.5" />
                Change Role
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [myRole, setMyRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  const [data, setData] = useState<AdminResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ── 1. Derive own role from user_profiles ──────────────────────────────
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

  // ── 2. Fetch admin data directly from Supabase ────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profileErr) throw new Error(profileErr.message)

      const users: AdminUser[] = (profiles ?? []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role as UserRole,
        trip_count: 0,
        created_at: p.created_at,
        last_sign_in_at: '',
      }))

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const stats: AdminStats = {
        total_users: users.length,
        total_trips: 0,
        operators: users.filter(u => u.role === 'operator').length,
        admins: users.filter(u => u.role === 'admin').length,
        new_this_week: users.filter(u => u.created_at > oneWeekAgo).length,
      }

      setData({ users, stats })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (myRole === 'admin') fetchData()
  }, [myRole, fetchData])

  // ── 3. Change role directly via Supabase (admin RLS policy allows it) ──
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (error) throw new Error(error.message)
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, role: newRole } : u),
        }
      })
    } catch {
      await fetchData()
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Loading role check ─────────────────────────────────────────────────
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

  // ── Access denied ──────────────────────────────────────────────────────
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

  // ── Page loading ───────────────────────────────────────────────────────
  const pageLoading = loading && !data

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Users & platform overview"
        icon={Shield}
        iconColor="text-rose-600"
        hideTripContext
        action={
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="px-4 space-y-4 pb-8">

        {/* Error banner */}
        {error && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchData} className="shrink-0 h-7 text-xs">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {pageLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center"
            >
              <Plane className="h-6 w-6 text-white" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Loading admin data...</p>
          </div>
        ) : data ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Total Users"
                value={data.stats.total_users}
                icon={Users}
                colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              />
              <StatTile
                label="Total Trips"
                value={data.stats.total_trips}
                icon={Plane}
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              />
              <StatTile
                label="Operators"
                value={data.stats.operators}
                icon={Building2}
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
              />
              <StatTile
                label="New This Week"
                value={data.stats.new_this_week}
                icon={TrendingUp}
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              />
            </div>

            {/* Users list */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
                <Users className="h-3 w-3 inline mr-1.5 align-middle" />
                All Users ({data.users.length})
              </p>
              <div className="space-y-3">
                {data.users.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                      No users found.
                    </CardContent>
                  </Card>
                ) : (
                  data.users.map(u => (
                    <UserCard
                      key={u.id}
                      user={u}
                      onRoleChange={handleRoleChange}
                      updating={updatingId === u.id}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
