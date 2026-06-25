import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { ChecklistItem } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/utils/cn'

const categoryConfig = {
  documents: { label: 'Documents', color: 'bg-blue-500' },
  essentials: { label: 'Essentials', color: 'bg-amber-500' },
  electronics: { label: 'Electronics', color: 'bg-violet-500' },
  health: { label: 'Health', color: 'bg-rose-500' },
  clothing: { label: 'Clothing', color: 'bg-emerald-500' },
  custom: { label: 'Custom', color: 'bg-gray-500' },
}

export default function Checklist() {
  const { trip, updateTrip } = useTrip()
  const [newLabel, setNewLabel] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const { checklist } = trip
  const checked = checklist.filter(c => c.checked).length
  const progress = checklist.length > 0 ? (checked / checklist.length) * 100 : 0

  const toggle = (id: string) => {
    updateTrip(prev => ({
      ...prev,
      checklist: prev.checklist.map(c => c.id === id ? { ...c, checked: !c.checked } : c),
    }))
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, checklist: prev.checklist.filter(c => c.id !== id) }))
  }

  const addItem = () => {
    if (!newLabel.trim()) return
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      checked: false,
      category: 'custom',
    }
    updateTrip(prev => ({ ...prev, checklist: [...prev.checklist, item] }))
    setNewLabel('')
  }

  const uncheckAll = () => {
    updateTrip(prev => ({ ...prev, checklist: prev.checklist.map(c => ({ ...c, checked: false })) }))
  }

  const grouped = Object.keys(categoryConfig).reduce((acc, cat) => {
    const items = checklist.filter(c => c.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  const filteredGroups: Record<string, ChecklistItem[]> = filter === 'all' ? grouped
    : filter === 'unchecked' ? Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.filter(c => !c.checked)]).filter(([, v]) => (v as ChecklistItem[]).length > 0))
    : filter === 'checked' ? Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.filter(c => c.checked)]).filter(([, v]) => (v as ChecklistItem[]).length > 0))
    : {}

  return (
    <div>
      <PageHeader
        title="Packing List"
        subtitle={`${checked}/${checklist.length} packed`}
        icon={ListChecks}
        iconColor="text-amber-600"
        action={
          checked > 0 ? (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={uncheckAll}>
              Reset
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 space-y-4">
        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Packing Progress</span>
              <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {checked === checklist.length && checklist.length > 0
                ? '🎉 All packed! Ready to go!'
                : `${checklist.length - checked} item${checklist.length - checked !== 1 ? 's' : ''} left to pack`}
            </p>
          </CardContent>
        </Card>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'unchecked', 'checked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-1.5 rounded-xl text-xs font-medium transition-all',
                filter === f ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Add custom item..."
            onKeyDown={e => e.key === 'Enter' && addItem()}
            className="flex-1"
          />
          <Button onClick={addItem} size="icon" disabled={!newLabel.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Groups */}
        <AnimatePresence>
          {Object.entries(filteredGroups).map(([category, items]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('w-2 h-2 rounded-full', categoryConfig[category as keyof typeof categoryConfig]?.color)} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {categoryConfig[category as keyof typeof categoryConfig]?.label || category}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {items.filter(c => c.checked).length}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {items.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex items-center gap-3"
                        >
                          <button
                            onClick={() => toggle(item.id)}
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                              item.checked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-border hover:border-primary'
                            )}
                          >
                            {item.checked && (
                              <motion.svg
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </motion.svg>
                            )}
                          </button>
                          <span className={cn(
                            'flex-1 text-sm transition-all',
                            item.checked ? 'line-through text-muted-foreground' : ''
                          )}>
                            {item.label}
                          </span>
                          <button
                            onClick={() => remove(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all text-muted-foreground hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
