import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  X,
  DollarSign,
  ArrowRight,
  Check,
  Trash2,
  SplitSquareHorizontal,
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { getRate } from '@/utils/currency'
import { formatDate } from '@/utils/dateUtils'

// ── Types ──────────────────────────────────────────────────────────────────

interface SplitRecord {
  expenseId: string
  splitWith: string[]   // subset of travelers
  paidBy: string        // one of travelers
}

// ── Avatar chip colors (deterministic per traveler index) ──────────────────

const CHIP_COLORS = [
  'bg-rose-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
]

function travelerColor(name: string, travelers: string[]): string {
  const idx = travelers.indexOf(name)
  return CHIP_COLORS[idx % CHIP_COLORS.length]
}

// ── localStorage helpers ───────────────────────────────────────────────────

function loadSplits(tripId: string): SplitRecord[] {
  try {
    const raw = localStorage.getItem(`travelfy-splits-${tripId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SplitRecord[]
  } catch {
    return []
  }
}

function saveSplits(tripId: string, splits: SplitRecord[]) {
  localStorage.setItem(`travelfy-splits-${tripId}`, JSON.stringify(splits))
}

// ── Settle-up greedy algorithm ─────────────────────────────────────────────

interface NetBalance {
  traveler: string
  net: number   // positive = others owe them; negative = they owe others
}

interface Settlement {
  from: string
  to: string
  amount: number
}

function computeSettlements(balances: NetBalance[]): Settlement[] {
  // Clone and sort: most negative first (owes most), most positive last
  const working = balances.map(b => ({ ...b }))
  working.sort((a, b) => a.net - b.net)

  const settlements: Settlement[] = []
  let lo = 0
  let hi = working.length - 1

  while (lo < hi) {
    const debtor = working[lo]
    const creditor = working[hi]

    if (Math.abs(debtor.net) < 0.01) { lo++; continue }
    if (Math.abs(creditor.net) < 0.01) { hi--; continue }

    const amount = Math.min(-debtor.net, creditor.net)
    if (amount > 0.005) {
      settlements.push({ from: debtor.traveler, to: creditor.traveler, amount })
    }
    debtor.net += amount
    creditor.net -= amount

    if (Math.abs(debtor.net) < 0.01) lo++
    if (Math.abs(creditor.net) < 0.01) hi--
  }

  return settlements
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Splitter() {
  const { trip } = useTrip()
  const { expenses, settings, currencyRates, tripInfo } = trip
  const travelers = settings.travelers ?? []
  const homeCurrency = settings.homeCurrency

  // ── Split state ──────────────────────────────────────────────────────────
  const [splits, setSplits] = useState<SplitRecord[]>(() => loadSplits(tripInfo.id))

  // Persist whenever splits change
  useEffect(() => {
    saveSplits(tripInfo.id, splits)
  }, [tripInfo.id, splits])

  // Re-load when tripId changes (switching trips)
  useEffect(() => {
    setSplits(loadSplits(tripInfo.id))
  }, [tripInfo.id])

  // Track which expense card is expanded for split editing
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getSplit = useCallback(
    (expenseId: string): SplitRecord | undefined =>
      splits.find(s => s.expenseId === expenseId),
    [splits],
  )

  const upsertSplit = (record: SplitRecord) => {
    setSplits(prev => {
      const without = prev.filter(s => s.expenseId !== record.expenseId)
      return [...without, record]
    })
  }

  const removeSplit = (expenseId: string) => {
    setSplits(prev => prev.filter(s => s.expenseId !== expenseId))
  }

  // Convert an expense amount to homeCurrency; returns null when no rate path
  const toHome = (amount: number, currency: string): number | null => {
    if (currency === homeCurrency) return amount
    const rate = getRate(currencyRates, currency, homeCurrency)
    return rate === null ? null : amount * rate
  }

  // ── Summary calculations ─────────────────────────────────────────────────

  const { netBalances, unconvertedCount } = useMemo(() => {
    const paid: Record<string, number> = {}
    const owed: Record<string, number> = {}
    let unconverted = 0

    travelers.forEach(t => { paid[t] = 0; owed[t] = 0 })

    for (const split of splits) {
      const expense = expenses.find(e => e.id === split.expenseId)
      if (!expense) continue
      if (!split.splitWith.length) continue

      const homeAmount = toHome(expense.amount, expense.currency)
      if (homeAmount === null) { unconverted++; continue }

      // The payer gets credit for the full amount
      if (split.paidBy in paid) {
        paid[split.paidBy] += homeAmount
      }

      // Each person in splitWith owes an equal share
      const share = homeAmount / split.splitWith.length
      for (const t of split.splitWith) {
        if (t in owed) {
          owed[t] += share
        }
      }
    }

    const netBalances: NetBalance[] = travelers.map(t => ({
      traveler: t,
      net: (paid[t] ?? 0) - (owed[t] ?? 0),
    }))

    return { netBalances, unconvertedCount: unconverted }
  }, [splits, expenses, travelers, currencyRates, homeCurrency]) // eslint-disable-line react-hooks/exhaustive-deps

  const settlements = useMemo(() => computeSettlements(netBalances), [netBalances])

  const activeSplitCount = splits.filter(s => s.splitWith.length > 0).length

  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date))

  // ── Empty states ─────────────────────────────────────────────────────────

  if (travelers.length === 0) {
    return (
      <div>
        <PageHeader
          title="Expense Splitter"
          subtitle="Split costs among travelers"
          icon={SplitSquareHorizontal}
          iconColor="text-violet-600"
        />
        <div className="px-4">
          <EmptyState
            icon={Users}
            title="No travelers added"
            description="Go to Settings → Travelers to add the people you're traveling with. Then come back here to split expenses."
          />
        </div>
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div>
        <PageHeader
          title="Expense Splitter"
          subtitle="Split costs among travelers"
          icon={SplitSquareHorizontal}
          iconColor="text-violet-600"
        />
        <div className="px-4">
          <EmptyState
            icon={DollarSign}
            title="No expenses yet"
            description="Add expenses in the Expenses tab, then come back here to split them among your travel group."
          />
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      <PageHeader
        title="Expense Splitter"
        subtitle={activeSplitCount > 0 ? `${activeSplitCount} expense${activeSplitCount === 1 ? '' : 's'} split` : 'Split costs among travelers'}
        icon={SplitSquareHorizontal}
        iconColor="text-violet-600"
      />

      <div className="px-4 space-y-3">

        {/* ── Travelers bar ─────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">
              Travelers on this trip
            </p>
            <div className="flex flex-wrap gap-2">
              {travelers.map(name => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0',
                      travelerColor(name, travelers),
                    )}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Expense list ──────────────────────────────────────────────── */}
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold px-0.5">
          Tap an expense to configure splitting
        </p>

        <AnimatePresence initial={false}>
          {sortedExpenses.map((expense, i) => {
            const split = getSplit(expense.id)
            const isSplit = !!(split && split.splitWith.length > 0)
            const isExpanded = expandedId === expense.id
            const homeAmount = toHome(expense.amount, expense.currency)

            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className={cn(isSplit && 'ring-1 ring-violet-500/40')}>
                  <CardContent className="p-0">
                    {/* Row header — always visible */}
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition-transform"
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      aria-expanded={isExpanded}
                    >
                      {/* Color dot */}
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                        <DollarSign className="h-5 w-5 text-violet-600" />
                      </div>

                      {/* Title / date */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{expense.title}</p>
                          {isSplit && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-violet-500/40 text-violet-600"
                            >
                              Split
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(expense.date, { month: 'short', day: 'numeric' })}
                          {isSplit && split && (
                            <span className="ml-1">
                              · paid by <span className="font-medium">{split.paidBy}</span>
                              {' '}· split {split.splitWith.length} way{split.splitWith.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm tabular-nums">
                          {expense.currency} {expense.amount.toLocaleString()}
                        </p>
                        {homeAmount !== null && expense.currency !== homeCurrency && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            ≈ {homeCurrency} {Math.round(homeAmount).toLocaleString()}
                          </p>
                        )}
                        {homeAmount === null && expense.currency !== homeCurrency && (
                          <p className="text-[10px] text-amber-600">no rate</p>
                        )}
                      </div>
                    </button>

                    {/* Expanded split configuration */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="split-config"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <SplitEditor
                            expense={expense}
                            split={split}
                            travelers={travelers}
                            homeCurrency={homeCurrency}
                            homeAmount={homeAmount}
                            onSave={record => {
                              upsertSplit(record)
                              setExpandedId(null)
                            }}
                            onRemove={() => {
                              removeSplit(expense.id)
                              setExpandedId(null)
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* ── Summary card ──────────────────────────────────────────────── */}
        {activeSplitCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-violet-500/30">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <SplitSquareHorizontal className="h-4 w-4 text-violet-600" />
                  <p className="text-sm font-bold">Summary</p>
                </div>

                {/* Per-traveler net balances */}
                <div className="space-y-2">
                  {netBalances.map(({ traveler, net }) => {
                    const paid = splits
                      .filter(s => s.paidBy === traveler && s.splitWith.length > 0)
                      .reduce((acc, s) => {
                        const exp = expenses.find(e => e.id === s.expenseId)
                        if (!exp) return acc
                        const h = toHome(exp.amount, exp.currency)
                        return h === null ? acc : acc + h
                      }, 0)

                    const share = splits
                      .filter(s => s.splitWith.includes(traveler) && s.splitWith.length > 0)
                      .reduce((acc, s) => {
                        const exp = expenses.find(e => e.id === s.expenseId)
                        if (!exp) return acc
                        const h = toHome(exp.amount, exp.currency)
                        return h === null ? acc : acc + h / s.splitWith.length
                      }, 0)

                    const isPositive = net > 0.005
                    const isNegative = net < -0.005

                    return (
                      <div key={traveler} className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                            travelerColor(traveler, travelers),
                          )}
                        >
                          {traveler.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{traveler}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            paid {homeCurrency} {Math.round(paid).toLocaleString()}
                            {' · '}share {homeCurrency} {Math.round(share).toLocaleString()}
                          </p>
                        </div>
                        <div className={cn(
                          'text-right shrink-0 text-sm font-bold tabular-nums',
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                        )}>
                          {isPositive && '+'}
                          {homeCurrency} {Math.round(Math.abs(net)).toLocaleString()}
                          <p className="text-[10px] font-normal text-muted-foreground">
                            {isPositive ? 'owed to them' : isNegative ? 'they owe' : 'settled'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {unconvertedCount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {unconvertedCount} split expense{unconvertedCount === 1 ? '' : 's'} excluded — no exchange rate available.
                  </p>
                )}

                {/* Settle-up statements */}
                {settlements.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      Settle Up
                    </p>
                    {settlements.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-muted"
                      >
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0',
                            travelerColor(s.from, travelers),
                          )}
                        >
                          {s.from.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold truncate">{s.from}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0',
                            travelerColor(s.to, travelers),
                          )}
                        >
                          {s.to.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold truncate flex-1">{s.to}</span>
                        <span className="text-sm font-bold tabular-nums shrink-0">
                          {homeCurrency} {Math.round(s.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {settlements.length === 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      All settled up!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Sub-component: SplitEditor ─────────────────────────────────────────────

interface SplitEditorProps {
  expense: { id: string; amount: number; currency: string }
  split: SplitRecord | undefined
  travelers: string[]
  homeCurrency: string
  homeAmount: number | null
  onSave: (record: SplitRecord) => void
  onRemove: () => void
}

function SplitEditor({
  expense,
  split,
  travelers,
  homeCurrency,
  homeAmount,
  onSave,
  onRemove,
}: SplitEditorProps) {
  const [paidBy, setPaidBy] = useState<string>(split?.paidBy ?? travelers[0] ?? '')
  const [splitWith, setSplitWith] = useState<string[]>(
    split?.splitWith ?? travelers,
  )

  const toggleTraveler = (name: string) => {
    setSplitWith(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name],
    )
  }

  const shareAmount =
    homeAmount !== null && splitWith.length > 0
      ? homeAmount / splitWith.length
      : null

  const canSave = paidBy !== '' && splitWith.length > 0

  return (
    <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
      {/* Paid by */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          Paid by
        </p>
        <div className="flex flex-wrap gap-2">
          {travelers.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => setPaidBy(name)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                paidBy === name
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-muted border-border text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0',
                  paidBy === name ? 'bg-white/30' : 'bg-muted-foreground/30',
                )}
              >
                {name.charAt(0).toUpperCase()}
              </span>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Split with */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          Split with
        </p>
        <div className="flex flex-wrap gap-2">
          {travelers.map(name => {
            const selected = splitWith.includes(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleTraveler(name)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                  selected
                    ? 'bg-violet-100 text-violet-700 border-violet-400 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-600'
                    : 'bg-muted border-border text-muted-foreground',
                )}
              >
                {selected && <Check className="h-3 w-3 shrink-0" />}
                {name}
              </button>
            )
          })}
        </div>

        {splitWith.length > 0 && shareAmount !== null && (
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">
            {homeCurrency} {Math.round(shareAmount).toLocaleString()} per person
            ({splitWith.length} way{splitWith.length !== 1 ? 's' : ''})
          </p>
        )}
        {splitWith.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            Select at least one traveler to split with.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
          disabled={!canSave}
          onClick={() =>
            onSave({ expenseId: expense.id, paidBy, splitWith })
          }
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Save Split
        </Button>
        {split && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
