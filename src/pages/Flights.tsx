import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Plus, Edit2, Trash2, ArrowRight, Clock, MapPin } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { Flight } from '@/types'
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
import { deriveFlightStatus } from '@/utils/flight'

const defaultFlight = (): Flight => ({
  id: crypto.randomUUID(),
  flightNumber: '',
  airline: '',
  from: '',
  fromCode: '',
  fromAirport: '',
  fromTerminal: '',
  to: '',
  toCode: '',
  toAirport: '',
  toTerminal: '',
  departureDate: '',
  departureTime: '',
  arrivalDate: '',
  arrivalTime: '',
  arrivalDateOffset: '',
  seat: '',
  bookingReference: '',
  gate: '',
  status: 'upcoming',
})

export default function Flights() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Flight | null>(null)

  const openAdd = () => { setEditing(defaultFlight()); setDialogOpen(true) }
  const openEdit = (f: Flight) => { setEditing({ ...f }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.flights.find(f => f.id === editing.id)
      return {
        ...prev,
        flights: exists
          ? prev.flights.map(f => f.id === editing.id ? editing : f)
          : [...prev.flights, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, flights: prev.flights.filter(f => f.id !== id) }))
  }

  const statusColors: Record<Flight['status'], string> = {
    upcoming: 'info',
    boarding: 'warning',
    departed: 'secondary',
    arrived: 'success',
  }

  return (
    <div>
      <PageHeader
        title="Flights"
        subtitle={`${trip.flights.length} flight${trip.flights.length !== 1 ? 's' : ''}`}
        icon={Plane}
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {trip.flights.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No flights added"
            description="Add your flight details to keep track of your journey."
            actionLabel="Add Flight"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {trip.flights.map((flight, i) => (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <div className="gradient-brand h-1.5" />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-lg">{flight.flightNumber}</span>
                          {(() => {
                            const live = deriveFlightStatus(flight)
                            return (
                              <Badge variant={statusColors[live] as 'info' | 'warning' | 'secondary' | 'success'}>
                                {live}
                              </Badge>
                            )
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground">{flight.airline}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(flight)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(flight.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{flight.fromCode}</p>
                        <p className="text-sm font-semibold text-primary">{formatTime(flight.departureTime)}</p>
                        <p className="text-xs text-muted-foreground">{flight.from}</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1 mx-2">
                        <div className="flex items-center w-full">
                          <div className="h-[2px] flex-1 bg-border" />
                          <div className="mx-1 p-1 rounded-full bg-primary/10">
                            <Plane className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="h-[2px] flex-1 bg-border" />
                        </div>
                        <p className="text-xs text-muted-foreground">{flight.from} → {flight.to}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold">{flight.toCode}</p>
                        <p className="text-sm font-semibold text-primary">
                          {formatTime(flight.arrivalTime)}
                          {flight.arrivalDateOffset && (
                            <span className="text-xs text-amber-500 ml-0.5">{flight.arrivalDateOffset}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{flight.to}</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(flight.departureDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {flight.bookingReference && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">Ref:</span>
                          <span className="font-mono font-bold text-primary">{flight.bookingReference}</span>
                        </div>
                      )}
                      {flight.fromTerminal && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>Dep: {flight.fromTerminal}</span>
                        </div>
                      )}
                      {flight.toTerminal && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                          <span>Arr: {flight.toTerminal}</span>
                        </div>
                      )}
                      {flight.seat && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Seat: </span>
                          <span className="font-semibold">{flight.seat}</span>
                        </div>
                      )}
                      {flight.gate && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Gate: </span>
                          <span className="font-semibold">{flight.gate}</span>
                        </div>
                      )}
                    </div>

                    {flight.fromAirport && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        <p>✈ {flight.fromAirport}{flight.fromTerminal ? `, ${flight.fromTerminal}` : ''}</p>
                        {flight.toAirport && <p>🛬 {flight.toAirport}{flight.toTerminal ? `, ${flight.toTerminal}` : ''}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && trip.flights.find(f => f.id === editing.id) ? 'Edit Flight' : 'Add Flight'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Flight No.</Label>
                  <Input value={editing.flightNumber} onChange={e => setEditing({ ...editing, flightNumber: e.target.value })} placeholder="5J110" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Airline</Label>
                  <Input value={editing.airline} onChange={e => setEditing({ ...editing, airline: e.target.value })} placeholder="Cebu Pacific" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">From City</Label>
                  <Input value={editing.from} onChange={e => setEditing({ ...editing, from: e.target.value })} placeholder="Manila" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">From Code</Label>
                  <Input value={editing.fromCode} onChange={e => setEditing({ ...editing, fromCode: e.target.value.toUpperCase() })} placeholder="MNL" maxLength={3} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Airport</Label>
                <Input value={editing.fromAirport} onChange={e => setEditing({ ...editing, fromAirport: e.target.value })} placeholder="Ninoy Aquino International Airport" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Terminal</Label>
                <Input value={editing.fromTerminal} onChange={e => setEditing({ ...editing, fromTerminal: e.target.value })} placeholder="Terminal 3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">To City</Label>
                  <Input value={editing.to} onChange={e => setEditing({ ...editing, to: e.target.value })} placeholder="Hong Kong" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">To Code</Label>
                  <Input value={editing.toCode} onChange={e => setEditing({ ...editing, toCode: e.target.value.toUpperCase() })} placeholder="HKG" maxLength={3} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Airport</Label>
                <Input value={editing.toAirport} onChange={e => setEditing({ ...editing, toAirport: e.target.value })} placeholder="Hong Kong International Airport" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Terminal</Label>
                <Input value={editing.toTerminal} onChange={e => setEditing({ ...editing, toTerminal: e.target.value })} placeholder="Terminal 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Date</Label>
                  <Input type="date" value={editing.departureDate} onChange={e => setEditing({ ...editing, departureDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Departure Time</Label>
                  <Input type="time" value={editing.departureTime} onChange={e => setEditing({ ...editing, departureTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Date</Label>
                  <Input type="date" value={editing.arrivalDate} onChange={e => setEditing({ ...editing, arrivalDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Time</Label>
                  <Input type="time" value={editing.arrivalTime} onChange={e => setEditing({ ...editing, arrivalTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Seat</Label>
                  <Input value={editing.seat} onChange={e => setEditing({ ...editing, seat: e.target.value })} placeholder="12A" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gate</Label>
                  <Input value={editing.gate} onChange={e => setEditing({ ...editing, gate: e.target.value })} placeholder="B22" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Booking Ref</Label>
                  <Input value={editing.bookingReference} onChange={e => setEditing({ ...editing, bookingReference: e.target.value.toUpperCase() })} placeholder="MDKEFL" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                  <Select value={editing.status} onValueChange={(v: Flight['status']) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="boarding">Boarding</SelectItem>
                      <SelectItem value="departed">Departed</SelectItem>
                      <SelectItem value="arrived">Arrived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Arrival Date Offset (e.g. +1)</Label>
                <Input value={editing.arrivalDateOffset || ''} onChange={e => setEditing({ ...editing, arrivalDateOffset: e.target.value })} placeholder="+1 (optional)" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Flight</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
