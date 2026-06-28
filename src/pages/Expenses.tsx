import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, Trash2, Edit2, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useTrip } from '@/contexts/TripContext'
import type { Expense } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/utils/dateUtils'
import { sumExpenses, convert } from '@/utils/currency'

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

  const { expenses, settings, currencyRates } = trip
  const totalBudget = settings.totalBudget
  const homeCurrency = settings.homeCurrency

  const { total: totalSpent, unconvertedCount } = sumExpenses(currencyRates, expenses, homeCurrency)
  const budgetUsed = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

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
        {/* Budget Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
                <p className="text-3xl font-bold">{homeCurrency} {totalSpent.toLocaleString()}</p>
              </div>
              {totalBudget > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-lg font-semibold">{homeCurrency} {totalBudget.toLocaleString()}</p>
                </div>
              )}
            </div>
            {totalBudget > 0 && (
              <>
                <Progress
                  value={budgetUsed}
                  className={`h-3 ${budgetUsed > 90 ? '[&>div]:bg-rose-500' : budgetUsed > 70 ? '[&>div]:bg-amber-500' : ''}`}
                />
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>{Math.round(budgetUsed)}% used</span>
                  <span>{homeCurrency} {(totalBudget - totalSpent).toLocaleString()} remaining</span>
                </div>
              </>
            )}
            {unconvertedCount > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {unconvertedCount} expense{unconvertedCount === 1 ? '' : 's'} excluded — no exchange rate set. Add rates in the Currency tab.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="list">
          <TabsList className="w-full">
            <TabsTrigger value="list" className="flex-1">Transactions</TabsTrigger>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && expenses.find(e => e.id === editing.id) ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Dinner at local restaurant" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount</Label>
                  <Input type="number" value={editing.amount || ''} onChange={e => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Currency</Label>
                  <Select value={editing.currency} onValueChange={v => setEditing({ ...editing, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['PHP', 'HKD', 'MOP', 'USD', 'EUR'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                  <Select value={editing.category} onValueChange={(v: Expense['category']) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                  <Input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
