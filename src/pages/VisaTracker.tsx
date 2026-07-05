import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileCheck, Plus, Edit2, Trash2, Calendar, Clock,
  CheckCircle2, XCircle, AlertTriangle, Globe, Stamp,
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { VisaInfo } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { formatDate, getDaysUntil } from '@/utils/dateUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

const VISA_TYPES = [
  'Tourist', 'Business', 'Student', 'Work',
  'Transit', 'E-Visa', 'On Arrival', 'Other',
] as const

/** Simple country → flag emoji lookup via Unicode regional indicators. */
function countryFlag(country: string): string {
  // Common country name → ISO 3166-1 alpha-2
  const map: Record<string, string> = {
    'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Andorra': 'AD',
    'Angola': 'AO', 'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU',
    'Austria': 'AT', 'Azerbaijan': 'AZ', 'Bahamas': 'BS', 'Bahrain': 'BH',
    'Bangladesh': 'BD', 'Belgium': 'BE', 'Bolivia': 'BO', 'Brazil': 'BR',
    'Bulgaria': 'BG', 'Cambodia': 'KH', 'Cameroon': 'CM', 'Canada': 'CA',
    'Chile': 'CL', 'China': 'CN', 'Colombia': 'CO', 'Croatia': 'HR',
    'Cuba': 'CU', 'Cyprus': 'CY', 'Czech Republic': 'CZ', 'Denmark': 'DK',
    'Ecuador': 'EC', 'Egypt': 'EG', 'Estonia': 'EE', 'Ethiopia': 'ET',
    'Finland': 'FI', 'France': 'FR', 'Georgia': 'GE', 'Germany': 'DE',
    'Ghana': 'GH', 'Greece': 'GR', 'Guatemala': 'GT', 'Haiti': 'HT',
    'Honduras': 'HN', 'Hong Kong': 'HK', 'Hungary': 'HU', 'Iceland': 'IS',
    'India': 'IN', 'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ',
    'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT', 'Jamaica': 'JM',
    'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE',
    'Kuwait': 'KW', 'Kyrgyzstan': 'KG', 'Laos': 'LA', 'Latvia': 'LV',
    'Lebanon': 'LB', 'Libya': 'LY', 'Lithuania': 'LT', 'Luxembourg': 'LU',
    'Macau': 'MO', 'Malaysia': 'MY', 'Maldives': 'MV', 'Malta': 'MT',
    'Mexico': 'MX', 'Moldova': 'MD', 'Monaco': 'MC', 'Mongolia': 'MN',
    'Morocco': 'MA', 'Mozambique': 'MZ', 'Myanmar': 'MM', 'Nepal': 'NP',
    'Netherlands': 'NL', 'New Zealand': 'NZ', 'Nicaragua': 'NI',
    'Nigeria': 'NG', 'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK',
    'Palestine': 'PS', 'Panama': 'PA', 'Paraguay': 'PY', 'Peru': 'PE',
    'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT', 'Qatar': 'QA',
    'Romania': 'RO', 'Russia': 'RU', 'Rwanda': 'RW', 'Saudi Arabia': 'SA',
    'Senegal': 'SN', 'Serbia': 'RS', 'Singapore': 'SG', 'Slovakia': 'SK',
    'Slovenia': 'SI', 'Somalia': 'SO', 'South Africa': 'ZA',
    'South Korea': 'KR', 'Spain': 'ES', 'Sri Lanka': 'LK', 'Sudan': 'SD',
    'Sweden': 'SE', 'Switzerland': 'CH', 'Syria': 'SY', 'Taiwan': 'TW',
    'Tajikistan': 'TJ', 'Tanzania': 'TZ', 'Thailand': 'TH', 'Tunisia': 'TN',
    'Turkey': 'TR', 'Turkmenistan': 'TM', 'Uganda': 'UG', 'Ukraine': 'UA',
    'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
    'United States': 'US', 'Uruguay': 'UY', 'Uzbekistan': 'UZ',
    'Venezuela': 'VE', 'Vietnam': 'VN', 'Yemen': 'YE', 'Zambia': 'ZM',
    'Zimbabwe': 'ZW',
  }
  const code = map[country]
  if (!code) return '🌐'
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('')
}

type DerivedStatus = 'expired' | 'expiring-soon' | 'valid' | 'pending'

function deriveStatus(visa: VisaInfo): DerivedStatus {
  if (!visa.expiryDate) return visa.status === 'pending' ? 'pending' : 'valid'
  const days = getDaysUntil(visa.expiryDate)
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring-soon'
  if (visa.status === 'pending') return 'pending'
  return 'valid'
}

const STATUS_CONFIG: Record<DerivedStatus, {
  label: string
  badgeClass: string
  barClass: string
  bgClass: string
  Icon: typeof CheckCircle2
  iconClass: string
}> = {
  valid: {
    label: 'Valid',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    barClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-500/10',
    Icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  'expiring-soon': {
    label: 'Expiring Soon',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    barClass: 'bg-amber-500',
    bgClass: 'bg-amber-500/10',
    Icon: AlertTriangle,
    iconClass: 'text-amber-500',
  },
  expired: {
    label: 'Expired',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    barClass: 'bg-rose-500',
    bgClass: 'bg-rose-500/10',
    Icon: XCircle,
    iconClass: 'text-rose-500',
  },
  pending: {
    label: 'Pending',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    barClass: 'bg-amber-400',
    bgClass: 'bg-amber-500/10',
    Icon: Clock,
    iconClass: 'text-amber-500',
  },
}

function emptyVisa(): VisaInfo {
  return {
    id: crypto.randomUUID(),
    country: '',
    visaType: '',
    visaNumber: '',
    issueDate: '',
    expiryDate: '',
    status: 'valid',
    notes: '',
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ visas }: { visas: VisaInfo[] }) {
  const total = visas.length
  const valid = visas.filter(v => deriveStatus(v) === 'valid').length
  const expiring = visas.filter(v => deriveStatus(v) === 'expiring-soon').length
  const expired = visas.filter(v => deriveStatus(v) === 'expired').length
  const pending = visas.filter(v => deriveStatus(v) === 'pending').length

  const stats = [
    { label: 'Total', value: total, className: 'text-foreground' },
    { label: 'Valid', value: valid, className: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Expiring', value: expiring, className: 'text-amber-600 dark:text-amber-400' },
    { label: 'Expired', value: expired, className: 'text-rose-600 dark:text-rose-400' },
    ...(pending > 0 ? [{ label: 'Pending', value: pending, className: 'text-amber-500' }] : []),
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Stamp className="h-4 w-4 text-violet-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Visa Summary
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stats.slice(0, 4).map(({ label, value, className }) => (
            <div key={label} className="text-center">
              <p className={cn('text-xl font-bold tabular-nums', className)}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {pending > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {pending} visa{pending !== 1 ? 's' : ''} pending approval
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface VisaCardProps {
  visa: VisaInfo
  onEdit: () => void
  onDelete: () => void
}

function VisaCard({ visa, onEdit, onDelete }: VisaCardProps) {
  const derived = deriveStatus(visa)
  const cfg = STATUS_CONFIG[derived]
  const StatusIcon = cfg.Icon
  const days = visa.expiryDate ? getDaysUntil(visa.expiryDate) : null

  const daysLabel = (() => {
    if (days === null) return null
    if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
    if (days === 0) return 'Expires today'
    return `${days} day${days !== 1 ? 's' : ''} until expiry`
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      layout
    >
      <Card className="overflow-hidden">
        {/* color bar */}
        <div className={cn('h-1 w-full', cfg.barClass)} />
        <CardContent className="p-4">
          {/* top row: flag + country + status + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', cfg.bgClass)}>
                {countryFlag(visa.country)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-sm truncate">{visa.country || '—'}</p>
                  <Badge
                    className={cn(
                      'text-[10px] font-bold px-2 py-0 h-4 rounded-full border',
                      cfg.badgeClass,
                    )}
                  >
                    <StatusIcon className="h-2.5 w-2.5 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                {visa.visaType && (
                  <p className="text-xs text-muted-foreground mt-0.5">{visa.visaType}</p>
                )}
                {visa.visaNumber && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5 tabular-nums">
                    #{visa.visaNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-1 shrink-0">
              <button
                onClick={onEdit}
                aria-label="Edit visa"
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
              >
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={onDelete}
                aria-label="Delete visa"
                className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center hover:bg-rose-500/20 transition-colors active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              </button>
            </div>
          </div>

          {/* date range row */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {visa.issueDate && (
              <div className="px-3 py-2 rounded-xl bg-muted">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Issued</p>
                <p className="text-xs font-semibold mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {formatDate(visa.issueDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
            {visa.expiryDate && (
              <div className={cn('px-3 py-2 rounded-xl', derived === 'expired' ? 'bg-rose-500/10' : derived === 'expiring-soon' ? 'bg-amber-500/10' : 'bg-muted')}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Expires</p>
                <p className={cn('text-xs font-semibold mt-0.5 flex items-center gap-1', derived === 'expired' ? 'text-rose-500' : derived === 'expiring-soon' ? 'text-amber-600 dark:text-amber-400' : '')}>
                  <Calendar className="h-3 w-3" />
                  {formatDate(visa.expiryDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* days label */}
          {daysLabel && (
            <div className={cn(
              'mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium',
              derived === 'expired'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : derived === 'expiring-soon'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground',
            )}>
              <Clock className="h-3 w-3 shrink-0" />
              {daysLabel}
            </div>
          )}

          {/* notes */}
          {visa.notes && (
            <p className="text-xs text-muted-foreground mt-2 px-1 italic leading-relaxed">
              {visa.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function VisaTracker() {
  const { trip, updateTrip } = useTrip()
  const visas = trip.visas

  // Sort by expiry date (soonest first; no-date entries go last)
  const sorted = [...visas].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return a.expiryDate.localeCompare(b.expiryDate)
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VisaInfo>(emptyVisa())
  const [isNew, setIsNew] = useState(true)

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<VisaInfo | null>(null)

  const openAdd = () => {
    setEditing(emptyVisa())
    setIsNew(true)
    setDialogOpen(true)
  }

  const openEdit = (visa: VisaInfo) => {
    setEditing({ ...visa })
    setIsNew(false)
    setDialogOpen(true)
  }

  const save = () => {
    if (!editing.country || !editing.expiryDate) return
    updateTrip(prev => {
      const exists = prev.visas.find(v => v.id === editing.id)
      return {
        ...prev,
        visas: exists
          ? prev.visas.map(v => v.id === editing.id ? editing : v)
          : [...prev.visas, editing],
      }
    })
    setDialogOpen(false)
  }

  const confirmDelete = (visa: VisaInfo) => setDeleteTarget(visa)

  const deleteVisa = () => {
    if (!deleteTarget) return
    updateTrip(prev => ({ ...prev, visas: prev.visas.filter(v => v.id !== deleteTarget.id) }))
    setDeleteTarget(null)
  }

  const canSave = editing.country.trim().length > 0 && editing.expiryDate.length > 0

  return (
    <div className="min-h-screen bg-background pb-28">
      <PageHeader
        title="Visa Tracker"
        subtitle="Entry permits & visas"
        icon={FileCheck}
        iconColor="text-violet-600"
        action={
          <Button size="icon-sm" onClick={openAdd} aria-label="Add visa">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* Summary card — only show when there are visas */}
        {visas.length > 0 && <SummaryCard visas={visas} />}

        {/* Visa list */}
        {visas.length === 0 ? (
          <EmptyState
            icon={Stamp}
            title="No visas added"
            description="Track your visas and entry permits. Get notified when they're about to expire."
            actionLabel="Add Visa"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {sorted.map(visa => (
                <VisaCard
                  key={visa.id}
                  visa={visa}
                  onEdit={() => openEdit(visa)}
                  onDelete={() => confirmDelete(visa)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-violet-500" />
              {isNew ? 'Add Visa' : 'Edit Visa'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Country */}
            <div className="space-y-1.5">
              <Label htmlFor="vt-country" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Country <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="vt-country"
                placeholder="e.g. Japan"
                value={editing.country}
                onChange={e => setEditing(prev => ({ ...prev, country: e.target.value }))}
              />
            </div>

            {/* Visa Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Visa Type
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {VISA_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, visaType: prev.visaType === type ? '' : type }))}
                    className={cn(
                      'py-2 px-1 rounded-xl border text-[10px] font-bold text-center transition-all active:scale-95 leading-tight',
                      editing.visaType === type
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-400'
                        : 'bg-muted border-border text-muted-foreground',
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Visa Number */}
            <div className="space-y-1.5">
              <Label htmlFor="vt-number" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Visa Number <span className="font-normal opacity-60">(optional)</span>
              </Label>
              <Input
                id="vt-number"
                placeholder="e.g. V12345678"
                value={editing.visaNumber}
                onChange={e => setEditing(prev => ({ ...prev, visaNumber: e.target.value }))}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vt-issue" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Issue Date
                </Label>
                <Input
                  id="vt-issue"
                  type="date"
                  value={editing.issueDate}
                  onChange={e => setEditing(prev => ({ ...prev, issueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vt-expiry" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Expiry <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="vt-expiry"
                  type="date"
                  value={editing.expiryDate}
                  onChange={e => setEditing(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Status override */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Status Override
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['valid', 'pending', 'expired'] as VisaInfo['status'][]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, status: s }))}
                    className={cn(
                      'py-2.5 rounded-xl border text-xs font-bold capitalize transition-colors active:scale-95',
                      editing.status === s
                        ? s === 'valid'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : s === 'pending'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                        : 'bg-muted border-border text-muted-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground px-0.5">
                Status is auto-derived from the expiry date. Override only if needed.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="vt-notes" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Notes <span className="font-normal opacity-60">(optional)</span>
              </Label>
              <textarea
                id="vt-notes"
                value={editing.notes}
                onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Single entry, 30-day stay, applied via embassy…"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={save}
              disabled={!canSave}
            >
              {isNew ? 'Add Visa' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" />
              Remove Visa
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground py-1">
            Remove the{' '}
            <span className="font-semibold text-foreground">
              {deleteTarget?.country}
            </span>{' '}
            {deleteTarget?.visaType ? `(${deleteTarget.visaType}) ` : ''}
            visa? This cannot be undone.
          </p>

          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={deleteVisa}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
