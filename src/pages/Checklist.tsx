import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListChecks, Plus, Trash2, Sparkles, X, Check } from 'lucide-react'
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

type Category = ChecklistItem['category']

interface PresetItem { label: string; category: Category }
interface Preset { id: string; name: string; emoji: string; color: string; items: PresetItem[] }

const PRESETS: Preset[] = [
  {
    id: 'beach',
    name: 'Beach / Resort',
    emoji: '🏖️',
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
    items: [
      { label: 'Passport / ID', category: 'documents' },
      { label: 'Booking confirmation', category: 'documents' },
      { label: 'Travel insurance card', category: 'documents' },
      { label: 'Sunscreen SPF50+', category: 'essentials' },
      { label: 'After-sun lotion', category: 'essentials' },
      { label: 'Insect repellent', category: 'essentials' },
      { label: 'Beach towel', category: 'essentials' },
      { label: 'Sunglasses', category: 'essentials' },
      { label: 'Hat / cap', category: 'essentials' },
      { label: 'Water bottle', category: 'essentials' },
      { label: 'Waterproof bag / dry bag', category: 'essentials' },
      { label: 'Cash (PHP)', category: 'essentials' },
      { label: 'Swimwear (2 sets)', category: 'clothing' },
      { label: 'Rashguard', category: 'clothing' },
      { label: 'Cover-up / sarong', category: 'clothing' },
      { label: 'Flip-flops', category: 'clothing' },
      { label: 'Light clothes', category: 'clothing' },
      { label: 'Motion sickness meds', category: 'health' },
      { label: 'Antihistamine', category: 'health' },
      { label: 'Antidiarrheal', category: 'health' },
      { label: 'Band-aids / first aid', category: 'health' },
      { label: 'Power bank', category: 'electronics' },
      { label: 'Waterproof phone case', category: 'electronics' },
      { label: 'Camera / GoPro', category: 'electronics' },
    ],
  },
  {
    id: 'mountain',
    name: 'Mountain / Hiking',
    emoji: '🏔️',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    items: [
      { label: 'Valid ID', category: 'documents' },
      { label: 'Trail permit / registration', category: 'documents' },
      { label: 'Emergency contact card', category: 'documents' },
      { label: 'Daypack / backpack', category: 'essentials' },
      { label: 'Water bottle (2L min)', category: 'essentials' },
      { label: 'Trail snacks / energy bars', category: 'essentials' },
      { label: 'Headlamp + spare batteries', category: 'essentials' },
      { label: 'Rain poncho', category: 'essentials' },
      { label: 'Trekking poles', category: 'essentials' },
      { label: 'Lighter / matches', category: 'essentials' },
      { label: 'Offline trail map downloaded', category: 'essentials' },
      { label: 'Moisture-wicking shirt', category: 'clothing' },
      { label: 'Hiking pants / shorts', category: 'clothing' },
      { label: 'Rain jacket', category: 'clothing' },
      { label: 'Thermal / fleece layer', category: 'clothing' },
      { label: 'Hiking boots (broken in)', category: 'clothing' },
      { label: 'Extra socks (wool)', category: 'clothing' },
      { label: 'Blister kit', category: 'health' },
      { label: 'Pain reliever / ibuprofen', category: 'health' },
      { label: 'Insect repellent', category: 'health' },
      { label: 'Sunscreen', category: 'health' },
      { label: 'Rehydration salts / ORS', category: 'health' },
      { label: 'Power bank (fully charged)', category: 'electronics' },
      { label: 'Phone + charger', category: 'electronics' },
    ],
  },
  {
    id: 'city',
    name: 'City Trip',
    emoji: '🏙️',
    color: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
    items: [
      { label: 'Passport / ID', category: 'documents' },
      { label: 'Hotel booking printout', category: 'documents' },
      { label: 'Transport tickets / e-tickets', category: 'documents' },
      { label: 'Travel insurance', category: 'documents' },
      { label: 'Daypack / shoulder bag', category: 'essentials' },
      { label: 'Compact umbrella', category: 'essentials' },
      { label: 'Water bottle', category: 'essentials' },
      { label: 'Cash + debit/credit card', category: 'essentials' },
      { label: 'Comfortable walking shoes', category: 'clothing' },
      { label: 'Light layers / jacket', category: 'clothing' },
      { label: '1 smart/dressy outfit', category: 'clothing' },
      { label: 'Pain reliever', category: 'health' },
      { label: 'Blister prevention tape', category: 'health' },
      { label: 'Hand sanitizer', category: 'health' },
      { label: 'Power bank', category: 'electronics' },
      { label: 'Universal travel adapter', category: 'electronics' },
      { label: 'Phone + charger', category: 'electronics' },
      { label: 'Earphones', category: 'electronics' },
    ],
  },
  {
    id: 'island-hop',
    name: 'Island-Hop PH',
    emoji: '🏝️',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    items: [
      { label: 'Valid ID / Passport', category: 'documents' },
      { label: 'Boat tickets (printed)', category: 'documents' },
      { label: 'Hotel vouchers', category: 'documents' },
      { label: 'Dry bag (all documents inside)', category: 'essentials' },
      { label: 'Sunscreen SPF50+ (reef-safe)', category: 'essentials' },
      { label: 'Insect repellent', category: 'essentials' },
      { label: 'Cash (enough — no ATMs on islands!)', category: 'essentials' },
      { label: 'Snorkeling gear', category: 'essentials' },
      { label: 'Water shoes', category: 'essentials' },
      { label: 'Sea-sickness / motion meds', category: 'essentials' },
      { label: 'Swimwear (3+ sets)', category: 'clothing' },
      { label: 'Rashguard (sun protection)', category: 'clothing' },
      { label: 'Quick-dry towel', category: 'clothing' },
      { label: 'Light clothes', category: 'clothing' },
      { label: 'Flip-flops', category: 'clothing' },
      { label: 'Antidiarrheal', category: 'health' },
      { label: 'Antihistamine', category: 'health' },
      { label: 'Rehydration salts / ORS', category: 'health' },
      { label: 'Band-aids / antiseptic', category: 'health' },
      { label: 'Waterproof phone case', category: 'electronics' },
      { label: 'Power bank (fully charged)', category: 'electronics' },
      { label: 'Underwater camera / GoPro', category: 'electronics' },
    ],
  },
  {
    id: 'backpacking',
    name: 'Budget Backpacking',
    emoji: '🎒',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    items: [
      { label: 'Passport', category: 'documents' },
      { label: 'ID photocopies (separate bag)', category: 'documents' },
      { label: 'Travel insurance policy', category: 'documents' },
      { label: 'Emergency contacts printout', category: 'documents' },
      { label: 'Backpack (40–60L)', category: 'essentials' },
      { label: 'Padlock for locker', category: 'essentials' },
      { label: 'Travel pillow', category: 'essentials' },
      { label: 'Earplugs', category: 'essentials' },
      { label: 'Eye mask', category: 'essentials' },
      { label: 'Reusable shopping bag', category: 'essentials' },
      { label: 'Cash split across pockets', category: 'essentials' },
      { label: '3–4 T-shirts', category: 'clothing' },
      { label: '2 bottoms (pants/shorts)', category: 'clothing' },
      { label: '1 warm layer / hoodie', category: 'clothing' },
      { label: 'Packable rain jacket', category: 'clothing' },
      { label: '3 underwear', category: 'clothing' },
      { label: '3 pairs socks', category: 'clothing' },
      { label: 'Flip-flops + sneakers', category: 'clothing' },
      { label: 'First aid kit', category: 'health' },
      { label: 'Probiotics', category: 'health' },
      { label: 'Rehydration salts / ORS', category: 'health' },
      { label: 'Antidiarrheal', category: 'health' },
      { label: 'Pain reliever', category: 'health' },
      { label: 'Universal adapter', category: 'electronics' },
      { label: 'Power bank', category: 'electronics' },
      { label: 'Phone + charger', category: 'electronics' },
    ],
  },
]

export default function Checklist() {
  const { trip, updateTrip } = useTrip()
  const [newLabel, setNewLabel] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [presetOpen, setPresetOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)

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

  const loadPreset = (preset: Preset) => {
    const existing = new Set(trip.checklist.map(c => c.label.toLowerCase()))
    const newItems: ChecklistItem[] = preset.items
      .filter(item => !existing.has(item.label.toLowerCase()))
      .map(item => ({ id: crypto.randomUUID(), label: item.label, checked: false, category: item.category }))
    if (newItems.length > 0) {
      updateTrip(prev => ({ ...prev, checklist: [...prev.checklist, ...newItems] }))
    }
    setSelectedPreset(null)
    setPresetOpen(false)
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

        {/* Smart Presets */}
        <button
          onClick={() => setPresetOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-amber-400/50 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-sm font-semibold hover:bg-amber-500/10 active:scale-[0.98] transition-all"
        >
          <Sparkles className="h-4 w-4" />
          Load Smart Packing Preset
        </button>

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

      {/* Preset picker sheet */}
      <AnimatePresence>
        {presetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setPresetOpen(false); setSelectedPreset(null) }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-base font-bold">
                  {selectedPreset ? selectedPreset.name : 'Smart Packing Presets'}
                </h2>
                <button
                  onClick={() => selectedPreset ? setSelectedPreset(null) : setPresetOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!selectedPreset ? (
                /* Preset grid */
                <div className="px-5 pb-8 grid grid-cols-1 gap-3">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className={cn('flex items-center gap-4 p-4 rounded-2xl border text-left active:scale-[0.98] transition-all', preset.color)}
                    >
                      <span className="text-3xl">{preset.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{preset.name}</p>
                        <p className="text-xs opacity-70 mt-0.5">{preset.items.length} items across {[...new Set(preset.items.map(i => i.category))].length} categories</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* Preset preview */
                <div className="px-5 pb-8">
                  {/* Count existing vs new */}
                  {(() => {
                    const existing = new Set(trip.checklist.map(c => c.label.toLowerCase()))
                    const newCount = selectedPreset.items.filter(i => !existing.has(i.label.toLowerCase())).length
                    const skipCount = selectedPreset.items.length - newCount
                    return (
                      <div className="flex gap-2 mb-4">
                        <div className="flex-1 bg-emerald-500/10 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-emerald-600">{newCount}</p>
                          <p className="text-xs text-muted-foreground">new items</p>
                        </div>
                        {skipCount > 0 && (
                          <div className="flex-1 bg-muted rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-muted-foreground">{skipCount}</p>
                            <p className="text-xs text-muted-foreground">already in list</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Items preview grouped by category */}
                  {Object.keys(categoryConfig).map(cat => {
                    const catItems = selectedPreset.items.filter(i => i.category === cat)
                    if (catItems.length === 0) return null
                    const existing = new Set(trip.checklist.map(c => c.label.toLowerCase()))
                    return (
                      <div key={cat} className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={cn('w-2 h-2 rounded-full', categoryConfig[cat as keyof typeof categoryConfig].color)} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {categoryConfig[cat as keyof typeof categoryConfig].label}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {catItems.map(item => {
                            const isExisting = existing.has(item.label.toLowerCase())
                            return (
                              <div key={item.label} className={cn('flex items-center gap-2 text-xs py-1', isExisting && 'opacity-40')}>
                                {isExisting
                                  ? <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                                  : <div className="w-3 h-3 rounded-full border border-border shrink-0" />
                                }
                                <span className={isExisting ? 'line-through' : ''}>{item.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={() => loadPreset(selectedPreset)}
                    className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm mt-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Add {selectedPreset.items.filter(i => !new Set(trip.checklist.map(c => c.label.toLowerCase())).has(i.label.toLowerCase())).length} Items to List
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
