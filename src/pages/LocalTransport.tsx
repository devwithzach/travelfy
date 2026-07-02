import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bike, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { LocalTransport } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/utils/cn'

const TYPE_CONFIG: Record<LocalTransport['type'], { label: string; emoji: string; color: string }> = {
  grab:          { label: 'Grab',         emoji: '🚗', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  tricycle:      { label: 'Tricycle',     emoji: '🛺', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  jeepney:       { label: 'Jeepney',      emoji: '🚌', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  'habal-habal': { label: 'Habal-habal',  emoji: '🏍️', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  'uv-express':  { label: 'UV Express',   emoji: '🚐', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  pedicab:       { label: 'Pedicab',      emoji: '🚲', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  taxi:          { label: 'Taxi',         emoji: '🚕', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  fx:            { label: 'FX / FMC',     emoji: '🚙', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  other:         { label: 'Other',        emoji: '🛞', color: 'bg-muted text-muted-foreground' },
}

const PH_TIPS = [
  { type: 'jeepney',       tip: 'Flag one down along the route. Fare from ₱13 (min). Pass your fare to the driver through other passengers.' },
  { type: 'tricycle',      tip: 'Good for short local trips. Negotiate fare before boarding — usually ₱10–50 within barangay.' },
  { type: 'habal-habal',   tip: 'Motorcycle taxi for remote areas. No fixed routes. Negotiate price; wear the helmet they offer.' },
  { type: 'grab',          tip: 'Most reliable in cities. Book via Grab app. GrabCar, GrabBike, GrabFood all available.' },
  { type: 'uv-express',    tip: 'UV Express / E-jeepney for longer routes. Fixed fare, faster than jeepney. Look for terminal.' },
  { type: 'fx',            tip: 'FX (Tamaraw FX) for provincial routes. Cheaper than bus for medium distances.' },
]

const defaultTransport = (): LocalTransport => ({
  id: crypto.randomUUID(),
  type: 'grab',
  from: '',
  to: '',
  fare: 0,
  currency: 'PHP',
  notes: '',
  date: '',
})

export default function LocalTransportPage() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LocalTransport | null>(null)
  const [tipsOpen, setTipsOpen] = useState(false)

  const openAdd = () => { setEditing(defaultTransport()); setDialogOpen(true) }
  const openEdit = (t: LocalTransport) => { setEditing({ ...t }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.localTransports.find(t => t.id === editing.id)
      return {
        ...prev,
        localTransports: exists
          ? prev.localTransports.map(t => t.id === editing.id ? editing : t)
          : [editing, ...prev.localTransports],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, localTransports: prev.localTransports.filter(t => t.id !== id) }))
  }

  const set = (k: keyof LocalTransport, v: string | number) =>
    setEditing(e => e ? { ...e, [k]: v } : e)

  return (
    <div>
      <PageHeader
        title="Local Transport"
        subtitle={`${trip.localTransports.length} log${trip.localTransports.length !== 1 ? 's' : ''}`}
        icon={Bike}
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {/* PH Tips accordion */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setTipsOpen(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🇵🇭</span>
              <span className="text-sm font-semibold">PH Transport Quick Tips</span>
            </div>
            {tipsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {tipsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border px-4 pb-4 space-y-3 pt-3">
                  {PH_TIPS.map(({ type, tip }) => {
                    const cfg = TYPE_CONFIG[type as LocalTransport['type']]
                    return (
                      <div key={type} className="flex gap-3">
                        <span className="text-lg leading-none mt-0.5">{cfg.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-foreground mb-0.5">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Logs */}
        {trip.localTransports.length === 0 ? (
          <EmptyState
            icon={Bike}
            title="No transport logs yet"
            description="Log your jeepney, tricycle, Grab, and habal-habal rides to track fares and routes."
            actionLabel="Log a Ride"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {trip.localTransports.map((t, i) => {
              const cfg = TYPE_CONFIG[t.type]
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Emoji badge */}
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', cfg.color)}>
                            {cfg.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <Badge className={cn('text-[10px] px-2 py-0 border-0', cfg.color)}>
                                {cfg.label}
                              </Badge>
                              {t.date && (
                                <span className="text-[10px] text-muted-foreground">{t.date}</span>
                              )}
                            </div>
                            {(t.from || t.to) && (
                              <p className="text-sm font-semibold leading-tight">
                                {t.from || '—'} → {t.to || '—'}
                              </p>
                            )}
                            {t.fare > 0 && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 tabular-nums">
                                {t.currency} {t.fare.toLocaleString()}
                              </p>
                            )}
                            {t.notes && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => remove(t.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing && trip.localTransports.find(t => t.id === editing.id) ? 'Edit Ride' : 'Log a Ride'}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              {/* Transport type — visual grid */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [LocalTransport['type'], typeof TYPE_CONFIG[LocalTransport['type']]][]).map(([k, cfg]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => set('type', k)}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-all active:scale-95',
                        editing.type === k
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      <span className="text-xl">{cfg.emoji}</span>
                      <span className="leading-tight text-center">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">From</Label>
                  <Input value={editing.from} onChange={e => set('from', e.target.value)} placeholder="SM Mall" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">To</Label>
                  <Input value={editing.to} onChange={e => set('to', e.target.value)} placeholder="Poblacion" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Fare</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.fare || ''}
                    onChange={e => set('fare', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Currency</Label>
                  <Select value={editing.currency} onValueChange={v => set('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHP">PHP ₱</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                <Input type="date" value={editing.date} onChange={e => set('date', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Input value={editing.notes} onChange={e => set('notes', e.target.value)} placeholder="Fixed rate, no meter, crowded, etc." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
