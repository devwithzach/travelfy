import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, Trash2, Edit2, TrendingUp, X, Pencil, Check, AlertTriangle, TrendingDown, Flame } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useTrip } from '@/contexts/TripContext'
import type { Expense } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/utils/dateUtils'
import { sumExpenses, convert } from '@/utils/currency'
import { cn } from '@/utils/cn'

const CATEGORY_CONFIG = {
  food: { label: 'Food & Dining', color: '#f59e0b' },
  transport: { label: 'Transport', color: '#3b82f6' },
  shopping: { label: 'Shopping', color: '#ec4899' },
  hotel: { label: 'Hotel & Stays', color: '#8b5cf6' },
  activities: { label: 'Activities', color: '#10b981' },
  other: { label: 'Other', color: '#6b7280' },
}

const defaultExpense = (): Expense => ({
  id: crypto.randomUUID(),
  title: '',
  amount: 0,
  currency: 'PHP',
  category: 'other',
  date: new Date().toISOString().split('T')[0],
  notes: '',
})

export default function Expenses() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [receiptView, setReceiptView] = useState<string | null>(null)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const { expenses, settings, currencyRates } = trip
  const totalBudget = settings.totalBudget
  const homeCurrency = settings.homeCurrency

  const { total: totalSpent, unconvertedCount } = sumExpenses(currencyRates, expenses, homeCurrency)
  const budgetUsed = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  const saveBudget = () => {
    const val = parseFloat(budgetInput)
    if (!isNaN(val) && val >= 0) {
      updateTrip(prev => ({ ...prev, settings: { ...prev.settings, totalBudget: val } }))
    }
    setEditingBudget(false)
  }

  // ── Burn rate analytics ────────────────────────────────────
  const burnRate = useMemo(() => {
    const start = trip.tripInfo.startDate
    const end = trip.tripInfo.endDate
    if (!start || !end) return null

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const startD = new Date(start + 'T00:00:00')
    const endD = new Date(end + 'T00:00:00')
    const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1)
    const daysElapsed = Math.max(0, Math.min(totalDays, Math.round((now.getTime() - startD.getTime()) / 86400000) + 1))
    const daysRemaining = Math.max(0, totalDays - daysElapsed)
    const avgPerDay = daysElapsed > 0 ? totalSpent / daysElapsed : 0
    const projectedTotal = avgPerDay * totalDays
    const safePerDay = totalBudget > 0 && daysRemaining > 0 ? (totalBudget - totalSpent) / daysRemaining : null
    const overBudget = totalBudget > 0 && totalSpent > totalBudget
    const atRisk = totalBudget > 0 && !overBudget && projectedTotal > totalBudget * 0.9

    return { totalDays, daysElapsed, daysRemaining, avgPerDay, projectedTotal, safePerDay, overBudget, atRisk }
  }, [trip.tripInfo.startDate, trip.tripInfo.endDate, totalSpent, totalBudget])

  const categoryTotals = Object.keys(CATEGORY_CONFIG).map(cat => {
    const items = expenses.filter(e => e.category === cat)
    const { total } = sumExpenses(currencyRates, items, homeCurrency)
    return {
      name: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG].label,
      value: total,
      color: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG].color,
      key: cat,
    }
  }).filter(c => c.value > 0)

  const openAdd = () => { setEditing({ ...defaultExpense(), currency: homeCurrency }); setDialogOpen(true) }
  const openEdit = (e: Expense) => { setEditing({ ...e }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.expenses.find(e => e.id === editing.id)
      return {
        ...prev,
        expenses: exists
          ? prev.expenses.map(e => e.id === editing.id ? editing : e)
          : [...prev.expenses, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }))
  }

  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} transactions`}
        icon={DollarSign}
        iconColor="text-rose-600"
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {/* Budget Summary card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
                <p className="text-3xl font-bold tabular-nums">{homeCurrency} {Math.round(totalSpent).toLocaleString()}</p>
              </div>
              <div className="text-right">
                {editingBudget ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      autoFocus
                      value={budgetInput}
                      onChange={e => setBudgetInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') setEditingBudget(false) }}
                      className="w-28 px-2 py-1 rounded-lg bg-muted border border-border text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Budget"
                    />
                    <button onClick={saveBudget} className="p-1 rounded-lg bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBudgetInput(totalBudget > 0 ? String(totalBudget) : ''); setEditingBudget(true) }}
                    className="flex items-center gap-1.5 text-right group"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{totalBudget > 0 ? 'Budget' : 'Set budget'}</p>
                      {totalBudget > 0 && <p className="text-lg font-semibold tabular-nums">{homeCurrency} {totalBudget.toLocaleString()}</p>}
                    </div>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </div>

            {totalBudget > 0 && (
              <>
                <Progress
                  value={budgetUsed}
                  className={cn('h-3', budgetUsed > 90 ? '[&>div]:bg-rose-500' : budgetUsed > 70 ? '[&>div]:bg-amber-500' : '')}
                />
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">{Math.round(budgetUsed)}% used</span>
                  <span className={cn('tabular-nums font-medium', totalSpent > totalBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400')}>
                    {totalSpent > totalBudget
                      ? `${homeCurrency} ${Math.round(totalSpent - totalBudget).toLocaleString()} over`
                      : `${homeCurrency} ${Math.round(totalBudget - totalSpent).toLocaleString()} left`}
                  </span>
                </div>
              </>
            )}

            {unconvertedCount > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {unconvertedCount} expense{unconvertedCount === 1 ? '' : 's'} excluded — no exchange rate set.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="list">
          <TabsList className="w-full">
            <TabsTrigger value="list" className="flex-1">Transactions</TabsTrigger>
            <TabsTrigger value="budget" className="flex-1">Budget</TabsTrigger>
            <TabsTrigger value="charts" className="flex-1">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2 mt-3">
            {sortedExpenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No expenses yet</p>
                <Button size="sm" className="mt-3" onClick={openAdd}>Add Expense</Button>
              </div>
            ) : (
              <AnimatePresence>
                {sortedExpenses.map((expense, i) => {
                  const convertedHome = expense.currency === homeCurrency
                    ? null
                    : convert(currencyRates, expense.amount, expense.currency, homeCurrency)
                  return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {expense.receiptUrl ? (
                            <button
                              onClick={() => setReceiptView(expense.receiptUrl ?? null)}
                              aria-label="View receipt"
                              className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-2 ring-offset-2 ring-offset-background ring-border hover:ring-primary active:scale-95 transition-all"
                            >
                              <img src={expense.receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: CATEGORY_CONFIG[expense.category].color }}
                            >
                              {expense.category.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{expense.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {CATEGORY_CONFIG[expense.category].label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{formatDate(expense.date, { month: 'short', day: 'numeric' })}</span>
                            </div>
                            {expense.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{expense.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-base">{expense.currency} {expense.amount.toLocaleString()}</p>
                            {convertedHome !== null && (
                              <p className="text-[10px] text-muted-foreground">
                                ≈ {homeCurrency} {convertedHome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            )}
                            {expense.currency !== homeCurrency && convertedHome === null && (
                              <p className="text-[10px] text-amber-600">no rate</p>
                            )}
                            <div className="flex gap-1 mt-1">
                              <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => openEdit(expense)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => remove(expense.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="budget" className="space-y-3 mt-3">
            {/* No budget set */}
            {totalBudget === 0 && (
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <Flame className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm font-semibold">No budget set</p>
                  <p className="text-xs text-muted-foreground">Tap the "Set budget" button above to start tracking your burn rate.</p>
                  <button
                    onClick={() => { setBudgetInput(''); setEditingBudget(true) }}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all"
                  >
                    Set Budget
                  </button>
                </CardContent>
              </Card>
            )}

            {totalBudget > 0 && (
              <>
                {/* Status alert */}
                {(burnRate?.overBudget || burnRate?.atRisk) && (
                  <div className={cn(
                    'flex gap-3 p-4 rounded-2xl border',
                    burnRate.overBudget
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30',
                  )}>
                    <AlertTriangle className={cn('h-5 w-5 shrink-0 mt-0.5', burnRate.overBudget ? 'text-rose-500' : 'text-amber-500')} />
                    <div>
                      <p className={cn('text-sm font-bold', burnRate.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}>
                        {burnRate.overBudget ? 'Over Budget' : 'At Risk of Overspending'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {burnRate.overBudget
                          ? `You've exceeded your budget by ${homeCurrency} ${Math.round(totalSpent - totalBudget).toLocaleString()}.`
                          : `At your current rate you'll end up at ${homeCurrency} ${Math.round(burnRate.projectedTotal).toLocaleString()} — above your budget.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Burn rate metrics */}
                {burnRate && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Daily Avg</p>
                        </div>
                        <p className="text-xl font-bold tabular-nums">{homeCurrency} {Math.round(burnRate.avgPerDay).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">per day</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Safe to Spend</p>
                        </div>
                        <p className={cn('text-xl font-bold tabular-nums', burnRate.safePerDay !== null && burnRate.safePerDay < 0 ? 'text-rose-500' : '')}>
                          {burnRate.safePerDay !== null
                            ? `${homeCurrency} ${Math.max(0, Math.round(burnRate.safePerDay)).toLocaleString()}`
                            : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {burnRate.daysRemaining > 0 ? `per day · ${burnRate.daysRemaining}d left` : 'trip ended'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Projected Total</p>
                        <p className={cn('text-xl font-bold tabular-nums', burnRate.projectedTotal > totalBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400')}>
                          {homeCurrency} {Math.round(burnRate.projectedTotal).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">at current rate</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Trip Progress</p>
                        <p className="text-xl font-bold tabular-nums">
                          {burnRate.daysElapsed}<span className="text-muted-foreground text-sm font-normal">/{burnRate.totalDays}d</span>
                        </p>
                        <Progress
                          value={(burnRate.daysElapsed / burnRate.totalDays) * 100}
                          className="h-1.5 mt-2"
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Category spending breakdown */}
                {categoryTotals.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold mb-3">Spending by Category</p>
                      <div className="space-y-3">
                        {categoryTotals.map(cat => {
                          const pct = totalSpent > 0 ? (cat.value / totalSpent) * 100 : 0
                          const ofBudget = totalBudget > 0 ? (cat.value / totalBudget) * 100 : 0
                          return (
                            <div key={cat.key}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span className="text-xs font-medium">{cat.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold tabular-nums">{homeCurrency} {Math.round(cat.value).toLocaleString()}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1.5 tabular-nums">({Math.round(pct)}%)</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(ofBudget, 100)}%`, backgroundColor: cat.color }}
                                />
                              </div>
                              {totalBudget > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                  {Math.round(ofBudget)}% of total budget
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-3 mt-3">
            {categoryTotals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Add expenses to see charts</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold mb-3">Spending by Category</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={categoryTotals}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryTotals.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${homeCurrency} ${value.toLocaleString()}`, '']}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {categoryTotals.map(c => (
                        <div key={c.key} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-muted-foreground truncate">{c.name}</span>
                          <span className="font-semibold ml-auto">{c.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold mb-3">Category Breakdown</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={categoryTotals} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} tickFormatter={v => v.split(' ')[0]} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip
                          formatter={(value: number) => [`${homeCurrency} ${value.toLocaleString()}`, '']}
                          contentStyle={{ borderRadius: '12px', border: 'none' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {categoryTotals.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Expense Bottom Sheet ── */}
      <AnimatePresence>
        {dialogOpen && (
          <>
            <motion.div
              key="exp-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setDialogOpen(false)}
            />
            <motion.div
              key="exp-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-base font-bold">
                  {editing && expenses.find(e => e.id === editing.id) ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {editing && (
                <div className="px-5 pb-8 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                    <input
                      type="text"
                      value={editing.title}
                      onChange={e => setEditing({ ...editing, title: e.target.value })}
                      placeholder="Dinner at local restaurant"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Amount + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount</Label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={editing.amount || ''}
                        onChange={e => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                      <input
                        type="date"
                        value={editing.date}
                        onChange={e => setEditing({ ...editing, date: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  {/* Currency — tap chips */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Currency</Label>
                    <div className="flex flex-wrap gap-2">
                      {['PHP', 'HKD', 'MOP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditing({ ...editing, currency: c })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            editing.currency === c
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-muted border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category — tap chips */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setEditing({ ...editing, category: k as Expense['category'] })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                            editing.category === k
                              ? 'text-white border-transparent shadow-sm'
                              : 'bg-muted border-border text-muted-foreground hover:border-primary/40'
                          }`}
                          style={editing.category === k ? { backgroundColor: v.color, borderColor: v.color } : {}}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                    <textarea
                      value={editing.notes}
                      onChange={e => setEditing({ ...editing, notes: e.target.value })}
                      placeholder="Optional notes..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>

                  <button
                    onClick={save}
                    className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm active:scale-[0.98] transition-transform"
                  >
                    Save Expense
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Receipt lightbox — tap thumbnail on an expense row to open. */}
      {receiptView && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setReceiptView(null)}
          className="fixed inset-0 z-[1950] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-label="Receipt"
        >
          <img src={receiptView} alt="Receipt" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </motion.div>
      )}
    </div>
  )
}
