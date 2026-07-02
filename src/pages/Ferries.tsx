import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Anchor, Plus, Edit2, Trash2, Clock, MapPin } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { Ferry } from '@/types'
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

const OPERATORS = ['2GO Travel', 'OceanJet', 'FastCat', 'Montenegro Lines', 'Archipelago Philippine Ferries', 'Super Shuttle Ferry', 'Lite Shipping', 'Other']
const ACCOMMODATIONS = ['Economy', 'Tourist', 'Cabin (4-bed)', 'Cabin (2-bed)', 'Suite', 'First Class', 'Aircon Seat']

const defaultFerry = (): Ferry => ({
  id: crypto.randomUUID(),
  operator: '',
  vesselName: '',
  from: '',
  fromTerminal: '',
  to: '',
  toTerminal: '',
  departureDate: '',
  departureTime: '',
  arrivalDate: '',
  arrivalTime: '',
  accommodation: '',
  bookingReference: '',
  ticketNumber: '',
  status: 'upcoming',
  notes: '',
})

const statusColors: Record<Ferry['status'], string> = {
  upcoming: 'info',
  boarding: 'warning',
  'in-transit': 'secondary',
  arrived: 'success',
}

export default function Ferries() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Ferry | null>(null)

  const openAdd = () => { setEditing(defaultFerry()); setDialogOpen(true) }
  const openEdit = (f: Ferry) => { setEditing({ ...f }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.ferries.find(f => f.id === editing.id)
      return {
        ...prev,
        ferries: exists
          ? prev.ferries.map(f => f.id === editing.id ? editing : f)
          : [...prev.ferries, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, ferries: prev.ferries.filter(f => f.id !== id) }))
  }

  const set = (k: keyof Ferry, v: string) => setEditing(e => e ? { ...e, [k]: v } : e)

  return (
    <div>
      <PageHeader
        title="Ferries"
        subtitle={`${trip.ferries.length} ferry leg${trip.ferries.length !== 1 ? 's' : ''}`}
        icon={Anchor}
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {trip.ferries.length === 0 ? (
          <EmptyState
            icon={Anchor}
            title="No ferry legs added"
            description="Add your ferry or boat trip details to keep track of inter-island travel."
            actionLabel="Add Ferry"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {trip.ferries.map((ferry, i) => (
              <motion.div
                key={ferry.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-base">{ferry.operator || 'Ferry'}</span>
                          <Badge variant={statusColors[ferry.status] as 'info' | 'warning' | 'secondary' | 'success'}>
                            {ferry.status}
                          </Badge>
                        </div>
                        {ferry.vesselName && (
                          <p className="text-xs text-muted-foreground">⛴ {ferry.vesselName}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ferry)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(ferry.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold leading-tight">{ferry.from || '—'}</p>
                        <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{formatTime(ferry.departureTime)}</p>
                        {ferry.fromTerminal && <p className="text-[10px] text-muted-foreground">{ferry.fromTerminal}</p>}
                      </div>
                      <div className="flex flex-col items-center gap-1 mx-3">
                        <div className="flex items-center w-16">
                          <div className="h-[2px] flex-1 bg-border" />
                          <div className="mx-1 p-1 rounded-full bg-cyan-500/10">
                            <Anchor className="h-3 w-3 text-cyan-600" />
                          </div>
                          <div className="h-[2px] flex-1 bg-border" />
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold leading-tight">{ferry.to || '—'}</p>
                        <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{formatTime(ferry.arrivalTime)}</p>
                        {ferry.toTerminal && <p className="text-[10px] text-muted-foreground">{ferry.toTerminal}</p>}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2">
                      {ferry.departureDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{formatDate(ferry.departureDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      {ferry.bookingReference && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">Ref:</span>
                          <span className="font-mono font-bold text-primary">{ferry.bookingReference}</span>
                        </div>
                      )}
                      {ferry.accommodation && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{ferry.accommodation}</span>
                        </div>
                      )}
                      {ferry.ticketNumber && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Ticket: </span>
                          <span className="font-mono font-semibold">{ferry.ticketNumber}</span>
                        </div>
                      )}
                    </div>

                    {ferry.notes && (
                      <p className="mt-2 pt-2 border-t text-xs text-muted-foreground">{ferry.notes}</p>
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
            <DialogTitle>{editing && trip.ferries.find(f => f.id === editing.id) ? 'Edit Ferry' : 'Add Ferry'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operator</Label>
                  <Input
                    list="ferry-operators"
                    value={editing.operator}
                    onChange={e => set('operator', e.target.value)}
                    placeholder="2GO Travel"
                  />
                  <datalist id="ferry-operators">
                    {OPERATORS.map(o => <option key={o} value={o} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Vessel Name</Label>
                  <Input value={editing.vesselName} onChange={e => set('vesselName', e.target.value)} placeholder="MV Saint Louisa" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">From (Port/City)</Label>
                  <Input value={editing.from} onChange={e => set('from', e.target.value)} placeholder="Manila" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Terminal</Label>
                  <Input value={editing.fromTerminal} onChange={e => set('fromTerminal', e.target.value)} placeholder="Pier 4, North Harbor" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">To (Port/City)</Label>
                  <Input value={editing.to} onChange={e => set('to', e.target.value)} placeholder="Cebu City" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Terminal</Label>
                  <Input value={editing.toTerminal} onChange={e => set('toTerminal', e.target.value)} placeholder="Pier 1" />
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
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Accommodation</Label>
                  <Select value={editing.accommodation} onValueChange={v => set('accommodation', v)}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {ACCOMMODATIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                  <Select value={editing.status} onValueChange={(v: Ferry['status']) => setEditing({ ...editing, status: v })}>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Booking Ref</Label>
                  <Input value={editing.bookingReference} onChange={e => set('bookingReference', e.target.value.toUpperCase())} placeholder="2GO-XXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ticket No.</Label>
                  <Input value={editing.ticketNumber} onChange={e => set('ticketNumber', e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Input value={editing.notes} onChange={e => set('notes', e.target.value)} placeholder="Check-in 2 hours before departure, etc." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Ferry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
