import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Plus, Trash2, Edit2, Phone, Copy, Building, Shield, Hospital, User } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { EmergencyContact } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/cn'

const typeConfig = {
  embassy: { label: 'Embassy', icon: Building, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  police: { label: 'Police', icon: Shield, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
  hospital: { label: 'Hospital', icon: Hospital, color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
  personal: { label: 'Personal', icon: User, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  tour_guide: { label: 'Tour Guide', icon: User, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
}

const defaultContact = (): EmergencyContact => ({
  id: crypto.randomUUID(),
  name: '',
  role: '',
  phone: '',
  type: 'personal',
  country: '',
  address: '',
  notes: '',
})

export default function Emergency() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmergencyContact | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const openAdd = () => { setEditing(defaultContact()); setDialogOpen(true) }
  const openEdit = (c: EmergencyContact) => { setEditing({ ...c }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.emergencyContacts.find(c => c.id === editing.id)
      return {
        ...prev,
        emergencyContacts: exists
          ? prev.emergencyContacts.map(c => c.id === editing.id ? editing : c)
          : [...prev.emergencyContacts, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, emergencyContacts: prev.emergencyContacts.filter(c => c.id !== id) }))
  }

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const grouped = Object.keys(typeConfig).reduce((acc, type) => {
    const contacts = trip.emergencyContacts.filter(c => c.type === type)
    if (contacts.length > 0) acc[type] = contacts
    return acc
  }, {} as Record<string, EmergencyContact[]>)

  return (
    <div>
      <PageHeader
        title="Emergency"
        subtitle="Important contacts"
        icon={AlertCircle}
        iconColor="text-red-600"
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      {/* Emergency tip */}
      <div className="px-4 mb-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium">
            🚨 In any emergency: Call local police (999 HK/Macau) or your nearest embassy.
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {trip.emergencyContacts.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No emergency contacts"
            description="Add important contacts like embassy, police, hospital, and personal contacts."
            actionLabel="Add Contact"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {Object.entries(grouped).map(([type, contacts]) => {
              const cfg = typeConfig[type as keyof typeof typeConfig]
              const Icon = cfg.icon
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('p-1.5 rounded-lg', cfg.color.split(' ').slice(1).join(' '))}>
                      <Icon className={cn('h-3.5 w-3.5', cfg.color.split(' ')[0])} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cfg.label}</span>
                  </div>
                  <div className="space-y-2">
                    {contacts.map(contact => (
                      <Card key={contact.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{contact.name}</p>
                              <p className="text-xs text-muted-foreground">{contact.role}</p>
                              {contact.country && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">{contact.country}</Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => openEdit(contact)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => remove(contact.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {contact.address && (
                            <p className="text-xs text-muted-foreground mb-2">📍 {contact.address}</p>
                          )}
                          {contact.notes && (
                            <p className="text-xs text-muted-foreground mb-2">{contact.notes}</p>
                          )}

                          <div className="flex gap-2">
                            <Button
                              className="flex-1 h-9 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                              onClick={() => window.open(`tel:${contact.phone}`, '_self')}
                            >
                              <Phone className="h-3.5 w-3.5 mr-1.5" />
                              {contact.phone}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => copyPhone(contact.phone, contact.id)}
                            >
                              <Copy className={cn('h-3.5 w-3.5', copied === contact.id ? 'text-emerald-500' : '')} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && trip.emergencyContacts.find(c => c.id === editing.id) ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
                <Select value={editing.type} onValueChange={(v: EmergencyContact['type']) => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Philippine Embassy" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role / Department</Label>
                <Input value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} placeholder="Consular Section" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                  <Input type="tel" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="+852 1234 5678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Country</Label>
                  <Input value={editing.country || ''} onChange={e => setEditing({ ...editing, country: e.target.value })} placeholder="Hong Kong" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Address</Label>
                <Input value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} placeholder="Full address..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Office hours, notes..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
