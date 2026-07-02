import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Plus, Edit2, Trash2, Clock, MapPin } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { Bus as BusType } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatTime } from '@/utils/dateUtils'

const OPERATORS = [
  'Victory Liner', 'Partas', 'Genesis', 'Ceres Bus', 'Dimple Star',
  'Rural Transit', 'Bachelor Express', 'Super Five', 'Philtranco',
  'Florida Bus', 'Isarog Line', 'Raymond Transport', 'Jam Liner', 'Other',
]
const BUS_TYPES = ['Ordinary', 'Aircon', 'Deluxe', 'Executive', 'Sleeper', 'Van (For Hire)', 'Coaster', 'UV Express']

const defaultBus = (): BusType => ({
  id: crypto.randomUUID(),
  operator: '',
  busType: '',
  from: '',
  fromTerminal: '',
  to: '',
  toTerminal: '',
  departureDate: '',
  departureTime: '',
  arrivalDate: '',
  arrivalTime: '',
  seatNumber: '',
  bookingReference: '',
  status: 'upcoming',
  notes: '',
})

const statusColors: Record<BusType['status'], string> = {
  upcoming: 'info',
  boarding: 'warning',
  'in-transit': 'secondary',
  arrived: 'success',
}

export default function Buses() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BusType | null>(null)

  const openAdd = () => { setEditing(defaultBus()); setDialogOpen(true) }
  const openEdit = (b: BusType) => { setEditing({ ...b }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.buses.find(b => b.id === editing.id)
      return {
        ...prev,
        buses: exists
          ? prev.buses.map(b => b.id === editing.id ? editing : b)
          : [...prev.buses, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, buses: prev.buses.filter(b => b.id !== id) }))
  }

  const set = (k: keyof BusType, v: string) => setEditing(e => e ? { ...e, [k]: v } : e)

  return (
    <div>
      <PageHeader
        title="Bus / Van"
        subtitle={`${trip.buses.length} leg${trip.buses.length !== 1 ? 's' : ''}`}
        icon={Bus}
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {trip.buses.length === 0 ? (
          <EmptyState
            icon={Bus}
            title="No bus or van legs added"
            description="Add your bus, van, or coaster trip details for land travel between destinations."
            actionLabel="Add Bus / Van"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {trip.buses.map((bus, i) => (
              <motion.div
                key={bus.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-base">{bus.operator || 'Bus'}</span>
                          <Badge variant={statusColors[bus.status] as 'info' | 'warning' | 'secondary' | 'success'}>
                            {bus.status}
                          </Badge>
                        </div>
                        {bus.busType && (
                          <p className="text-xs text-muted-foreground">🚌 {bus.busType}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(bus)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(bus.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold leading-tight">{bus.from || '—'}</p>
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatTime(bus.departureTime)}</p>
                        {bus.fromTerminal && <p className="text-[10px] text-muted-foreground">{bus.fromTerminal}</p>}
                      </div>
                      <div className="flex flex-col items-center gap-1 mx-3">
                        <div className="flex items-center w-16">
                          <div className="h-[2px] flex-1 bg-border" />
                          <div className="mx-1 p-1 rounded-full bg-amber-500/10">
                            <Bus className="h-3 w-3 text-amber-600" />
                          </div>
                          <div className="h-[2px] flex-1 bg-border" />
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold leading-tight">{bus.to || '—'}</p>
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatTime(bus.arrivalTime)}</p>
                        {bus.toTerminal && <p className="text-[10px] text-muted-foreground">{bus.toTerminal}</p>}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2">
                      {bus.departureDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{formatDate(bus.departureDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      {bus.bookingReference && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">Ref:</span>
                          <span className="font-mono font-bold text-primary">{bus.bookingReference}</span>
                        </div>
                      )}
                      {bus.seatNumber && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>Seat {bus.seatNumber}</span>
                        </div>
                      )}
                    </div>

                    {bus.notes && (
                      <p className="mt-2 pt-2 border-t text-xs text-muted-foreground">{bus.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && trip.buses.find(b => b.id === editing.id) ? 'Edit Bus / Van' : 'Add Bus / Van'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operator</Label>
                  <Input
                    list="bus-operators"
                    value={editing.operator}
                    onChange={e => set('operator', e.target.value)}
                    placeholder="Victory Liner"
                  />
                  <datalist id="bus-operators">
                    {OPERATORS.map(o => <option key={o} value={o} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bus Type</Label>
                  <Select value={editing.busType} onValueChange={v => set('busType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {BUS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">From (City)</Label>
                  <Input value={editing.from} onChange={e => set('from', e.target.value)} placeholder="Manila" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Terminal</Label>
                  <Input value={editing.fromTerminal} onChange={e => set('fromTerminal', e.target.value)} placeholder="Cubao Terminal" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">To (City)</Label>
                  <Input value={editing.to} onChange={e => set('to', e.target.value)} placeholder="Baguio" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Terminal</Label>
                  <Input value={editing.toTerminal} onChange={e => set('toTerminal', e.target.value)} placeholder="Slaughterhouse" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Date</Label>
                  <Input type="date" value={editing.departureDate} onChange={e => set('departureDate', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Time</Label>
                  <Input type="time" value={editing.departureTime} onChange={e => set('departureTime', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Date</Label>
                  <Input type="date" value={editing.arrivalDate} onChange={e => set('arrivalDate', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Time</Label>
                  <Input type="time" value={editing.arrivalTime} onChange={e => set('arrivalTime', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Seat No.</Label>
                  <Input value={editing.seatNumber} onChange={e => set('seatNumber', e.target.value)} placeholder="12A" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                  <Select value={editing.status} onValueChange={(v: BusType['status']) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="boarding">Boarding</SelectItem>
                      <SelectItem value="in-transit">In Transit</SelectItem>
                      <SelectItem value="arrived">Arrived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Booking Ref / Ticket No.</Label>
                <Input value={editing.bookingReference} onChange={e => set('bookingReference', e.target.value.toUpperCase())} placeholder="Optional" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Input value={editing.notes} onChange={e => set('notes', e.target.value)} placeholder="Board 30 min early, bring exact fare, etc." />
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
