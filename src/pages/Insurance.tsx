import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Copy,
  Check,
  Calendar,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsurancePolicy {
  id: string
  insurer: string
  policyNumber: string
  type: 'comprehensive' | 'medical' | 'trip-cancellation' | 'baggage' | 'other'
  coverageStart: string
  coverageEnd: string
  emergencyHotline: string
  coverageAmount: string
  deductible: string
  notes: string
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InsurancePolicy['type'],
  { label: string; badgeClass: string; btnClass: string }
> = {
  comprehensive: {
    label: 'Comprehensive',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    btnClass:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  },
  medical: {
    label: 'Medical',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    btnClass:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  },
  'trip-cancellation': {
    label: 'Trip Cancellation',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    btnClass:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  },
  baggage: {
    label: 'Baggage',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    btnClass:
      'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  },
  other: {
    label: 'Other',
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    btnClass:
      'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
  },
}

const POLICY_TYPES = Object.keys(TYPE_CONFIG) as InsurancePolicy['type'][]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStorageKey(tripId: string) {
  return `travelfy-insurance-${tripId}`
}

function loadPolicies(tripId: string): InsurancePolicy[] {
  try {
    const raw = localStorage.getItem(getStorageKey(tripId))
    return raw ? (JSON.parse(raw) as InsurancePolicy[]) : []
  } catch {
    return []
  }
}

function savePolicies(tripId: string, policies: InsurancePolicy[]) {
  localStorage.setItem(getStorageKey(tripId), JSON.stringify(policies))
}

type ActiveStatus = 'active' | 'expired' | 'upcoming' | 'none'

function getCoverageStatus(start: string, end: string): ActiveStatus {
  if (!start && !end) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = start ? new Date(start) : null
  const endDate = end ? new Date(end) : null
  if (startDate && endDate) {
    if (today > endDate) return 'expired'
    if (today < startDate) return 'upcoming'
    return 'active'
  }
  if (endDate && today > endDate) return 'expired'
  if (startDate && today < startDate) return 'upcoming'
  return 'none'
}

const STATUS_CONFIG: Record<
  Exclude<ActiveStatus, 'none'>,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function defaultPolicy(): InsurancePolicy {
  return {
    id: crypto.randomUUID(),
    insurer: '',
    policyNumber: '',
    type: 'comprehensive',
    coverageStart: '',
    coverageEnd: '',
    emergencyHotline: '',
    coverageAmount: '',
    deductible: '',
    notes: '',
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Insurance() {
  const { trip } = useTrip()
  const tripId = trip.tripInfo.id

  const [policies, setPolicies] = useState<InsurancePolicy[]>(() => loadPolicies(tripId))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InsurancePolicy | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Sync to localStorage whenever policies change
  useEffect(() => {
    savePolicies(tripId, policies)
  }, [tripId, policies])

  // Re-load when tripId changes (user switches trip)
  useEffect(() => {
    setPolicies(loadPolicies(tripId))
  }, [tripId])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(defaultPolicy())
    setDialogOpen(true)
  }

  const openEdit = (policy: InsurancePolicy) => {
    setEditing({ ...policy })
    setDialogOpen(true)
  }

  const save = () => {
    if (!editing) return
    setPolicies(prev => {
      const exists = prev.find(p => p.id === editing.id)
      return exists
        ? prev.map(p => (p.id === editing.id ? editing : p))
        : [editing, ...prev]
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id))
  }

  // ── Copy helpers ──────────────────────────────────────────────────────────

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Field updater ──────────────────────────────────────────────────────────

  const setField = <K extends keyof InsurancePolicy>(key: K, value: InsurancePolicy[K]) =>
    setEditing(prev => (prev ? { ...prev, [key]: value } : prev))

  const isExistingPolicy = editing
    ? policies.some(p => p.id === editing.id)
    : false

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Insurance"
        subtitle={
          policies.length === 0
            ? 'No policies added'
            : `${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}`
        }
        icon={Shield}
        iconColor="text-blue-600"
        action={
          <Button size="icon-sm" onClick={openAdd} aria-label="Add policy">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 pb-24 space-y-3">
        {policies.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No insurance added"
            description="Add your travel insurance policy for quick access to emergency hotlines and coverage details."
            actionLabel="Add Policy"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {policies.map((policy, i) => {
              const typeCfg = TYPE_CONFIG[policy.type]
              const status = getCoverageStatus(policy.coverageStart, policy.coverageEnd)
              const statusCfg = status !== 'none' ? STATUS_CONFIG[status] : null

              return (
                <motion.div
                  key={policy.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm leading-tight truncate">
                              {policy.insurer || 'Unnamed Insurer'}
                            </p>
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                                typeCfg.badgeClass
                              )}
                            >
                              {typeCfg.label}
                            </span>
                            {statusCfg && (
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                                  statusCfg.className
                                )}
                              >
                                {statusCfg.label}
                              </span>
                            )}
                          </div>

                          {/* Policy number */}
                          {policy.policyNumber && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="font-mono text-xs text-muted-foreground truncate">
                                {policy.policyNumber}
                              </span>
                              <button
                                className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors active:scale-95"
                                onClick={() => copyText(policy.policyNumber, `pn-${policy.id}`)}
                                aria-label="Copy policy number"
                              >
                                {copied === `pn-${policy.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Edit / Delete */}
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            onClick={() => openEdit(policy)}
                            aria-label="Edit policy"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            onClick={() => remove(policy.id)}
                            aria-label="Delete policy"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Coverage dates */}
                      {(policy.coverageStart || policy.coverageEnd) && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {formatDateDisplay(policy.coverageStart)}
                            {' — '}
                            {formatDateDisplay(policy.coverageEnd)}
                          </span>
                          {status === 'expired' && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                      )}

                      {/* Coverage amount + deductible */}
                      {(policy.coverageAmount || policy.deductible) && (
                        <div className="flex gap-4 mb-2">
                          {policy.coverageAmount && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Coverage
                              </p>
                              <p className="text-xs font-semibold tabular-nums">
                                {policy.coverageAmount}
                              </p>
                            </div>
                          )}
                          {policy.deductible && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Deductible
                              </p>
                              <p className="text-xs font-semibold tabular-nums">{policy.deductible}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {policy.notes && (
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                          {policy.notes}
                        </p>
                      )}

                      {/* Emergency hotline */}
                      {policy.emergencyHotline && (
                        <div className="flex gap-2 mt-1">
                          <button
                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white text-xs font-semibold"
                            onClick={() => window.open(`tel:${policy.emergencyHotline}`, '_self')}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {policy.emergencyHotline}
                          </button>
                          <button
                            className="h-10 w-10 flex items-center justify-center rounded-xl border bg-card hover:bg-muted active:scale-95 transition-all shrink-0"
                            onClick={() => copyText(policy.emergencyHotline, `hl-${policy.id}`)}
                            aria-label="Copy hotline"
                          >
                            {copied === `hl-${policy.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isExistingPolicy ? 'Edit Policy' : 'Add Insurance Policy'}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid gap-3">
              {/* Type selector — button grid */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Policy Type
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {POLICY_TYPES.map(type => {
                    const cfg = TYPE_CONFIG[type]
                    const isSelected = editing.type === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setField('type', type)}
                        className={cn(
                          'py-2 px-2 rounded-xl border text-[11px] font-semibold text-center transition-all active:scale-95',
                          isSelected
                            ? cfg.btnClass + ' ring-2 ring-offset-1 ring-current'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Insurer */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Insurance Company
                </Label>
                <Input
                  value={editing.insurer}
                  onChange={e => setField('insurer', e.target.value)}
                  placeholder="e.g. Malayan Insurance"
                />
              </div>

              {/* Policy number */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Policy Number
                </Label>
                <Input
                  value={editing.policyNumber}
                  onChange={e => setField('policyNumber', e.target.value)}
                  placeholder="e.g. POL-2026-123456"
                  className="font-mono"
                />
              </div>

              {/* Coverage dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={editing.coverageStart}
                    onChange={e => setField('coverageStart', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={editing.coverageEnd}
                    onChange={e => setField('coverageEnd', e.target.value)}
                  />
                </div>
              </div>

              {/* Emergency hotline */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Emergency Hotline
                </Label>
                <Input
                  type="tel"
                  value={editing.emergencyHotline}
                  onChange={e => setField('emergencyHotline', e.target.value)}
                  placeholder="+63 2 8888 8888"
                />
              </div>

              {/* Coverage amount + deductible */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Coverage Amount
                  </Label>
                  <Input
                    value={editing.coverageAmount}
                    onChange={e => setField('coverageAmount', e.target.value)}
                    placeholder="USD 50,000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Deductible
                  </Label>
                  <Input
                    value={editing.deductible}
                    onChange={e => setField('deductible', e.target.value)}
                    placeholder="USD 100"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Notes
                </Label>
                <textarea
                  value={editing.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Coverage details, exclusions, claim process..."
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              {isExistingPolicy ? 'Save Changes' : 'Add Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
