import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Edit2, Trash2, MapPin, Phone, Globe, Calendar, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTrip } from '@/contexts/TripContext'
import type { Hotel } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/utils/dateUtils'

const defaultHotel = (): Hotel => ({
  id: crypto.randomUUID(),
  name: '',
  address: '',
  phone: '',
  website: '',
  checkIn: '',
  checkOut: '',
  roomType: '',
  bookingReference: '',
  nights: 1,
  mapsUrl: '',
  notes: '',
})

export default function Hotels() {
  const { trip, updateTrip } = useTrip()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Hotel | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const openAdd = () => { setEditing(defaultHotel()); setDialogOpen(true) }
  const openEdit = (h: Hotel) => { setEditing({ ...h }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.hotels.find(h => h.id === editing.id)
      return {
        ...prev,
        hotels: exists
          ? prev.hotels.map(h => h.id === editing.id ? editing : h)
          : [...prev.hotels, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, hotels: prev.hotels.filter(h => h.id !== id) }))
  }

  const copyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <PageHeader
        title="Hotels"
        subtitle={`${trip.hotels.length} accommodation${trip.hotels.length !== 1 ? 's' : ''}`}
        icon={Building2}
        iconColor="text-violet-600"
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {trip.hotels.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No hotels added"
            description="Add your hotel details to keep track of accommodations."
            actionLabel="Add Hotel"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {trip.hotels.map((hotel, i) => (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-600" />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-base">{hotel.name}</h3>
                        {hotel.roomType && (
                          <p className="text-xs text-muted-foreground mt-0.5">{hotel.roomType}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(hotel)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(hotel.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Check-in / out */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Check-in</span>
                        </div>
                        <p className="font-semibold text-sm">{hotel.checkIn ? formatDate(hotel.checkIn, { month: 'short', day: 'numeric' }) : '—'}</p>
                        <p className="text-xs text-muted-foreground">3:00 PM</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Check-out</span>
                        </div>
                        <p className="font-semibold text-sm">{hotel.checkOut ? formatDate(hotel.checkOut, { month: 'short', day: 'numeric' }) : '—'}</p>
                        <p className="text-xs text-muted-foreground">11:00 AM</p>
                      </div>
                    </div>

                    {hotel.nights > 0 && (
                      <div className="text-center text-xs text-muted-foreground mb-3">
                        {hotel.nights} night{hotel.nights !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Address */}
                    {hotel.address && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="flex-1">{hotel.address}</span>
                      </div>
                    )}

                    {hotel.bookingReference && (
                      <div className="text-xs mb-2">
                        <span className="text-muted-foreground">Booking Ref: </span>
                        <span className="font-mono font-bold text-primary">{hotel.bookingReference}</span>
                      </div>
                    )}

                    {hotel.notes && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-300 mb-3">
                        {hotel.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => navigate('/map', { state: { hotelId: hotel.id } })}
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        Explore Map
                      </Button>
                      {hotel.address && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => copyAddress(hotel.address, hotel.id)}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {copied === hotel.id ? 'Copied!' : 'Copy Addr'}
                        </Button>
                      )}
                      {hotel.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open(`tel:${hotel.phone}`, '_self')}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {hotel.website && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open(hotel.website, '_blank')}
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && trip.hotels.find(h => h.id === editing.id) ? 'Edit Hotel' : 'Add Hotel'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Hotel Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Dorsett Kwun Tong" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Address</Label>
                <Input value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} placeholder="9 Chong Yip St, Kwun Tong..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</Label>
                  <Input type="date" value={editing.checkIn} onChange={e => setEditing({ ...editing, checkIn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</Label>
                  <Input type="date" value={editing.checkOut} onChange={e => setEditing({ ...editing, checkOut: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Room Type</Label>
                  <Input value={editing.roomType} onChange={e => setEditing({ ...editing, roomType: e.target.value })} placeholder="Standard Room" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nights</Label>
                  <Input type="number" value={editing.nights} onChange={e => setEditing({ ...editing, nights: parseInt(e.target.value) || 1 })} min={1} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Booking Reference</Label>
                <Input value={editing.bookingReference} onChange={e => setEditing({ ...editing, bookingReference: e.target.value })} placeholder="ABC123" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                <Input type="tel" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="+852 1234 5678" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Website</Label>
                <Input type="url" value={editing.website} onChange={e => setEditing({ ...editing, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Address / Map Reference (optional)</Label>
                <Input type="text" value={editing.mapsUrl} onChange={e => setEditing({ ...editing, mapsUrl: e.target.value })} placeholder="Full address or landmark" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Additional info..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Hotel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
