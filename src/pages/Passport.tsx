import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Edit2, Check, AlertTriangle, Shield, Plus, Trash2 } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { VisaInfo } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { isExpiringSoon, isExpired, formatDate } from '@/utils/dateUtils'

const defaultVisa = (): VisaInfo => ({
  id: crypto.randomUUID(),
  country: '',
  visaType: '',
  visaNumber: '',
  issueDate: '',
  expiryDate: '',
  status: 'valid',
  notes: '',
})

export default function Passport() {
  const { trip, updateTrip } = useTrip()
  const [editingPassport, setEditingPassport] = useState(false)
  const [passportBuffer, setPassportBuffer] = useState(trip.passport)
  const [visaDialogOpen, setVisaDialogOpen] = useState(false)
  const [editingVisa, setEditingVisa] = useState<VisaInfo | null>(null)

  const { passport, visas } = trip

  const passportExpiring = passport.expiryDate && isExpiringSoon(passport.expiryDate)
  const passportExpired = passport.expiryDate && isExpired(passport.expiryDate)

  const savePassport = () => {
    updateTrip(prev => ({ ...prev, passport: passportBuffer }))
    setEditingPassport(false)
  }

  const openAddVisa = () => { setEditingVisa(defaultVisa()); setVisaDialogOpen(true) }
  const openEditVisa = (v: VisaInfo) => { setEditingVisa({ ...v }); setVisaDialogOpen(true) }

  const saveVisa = () => {
    if (!editingVisa) return
    updateTrip(prev => {
      const exists = prev.visas.find(v => v.id === editingVisa.id)
      return {
        ...prev,
        visas: exists
          ? prev.visas.map(v => v.id === editingVisa.id ? editingVisa : v)
          : [...prev.visas, editingVisa],
      }
    })
    setVisaDialogOpen(false)
  }

  const removeVisa = (id: string) => {
    updateTrip(prev => ({ ...prev, visas: prev.visas.filter(v => v.id !== id) }))
  }

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Passport & Visa"
        subtitle="Travel documents"
        icon={Globe}
        iconColor="text-indigo-600"
        action={
          <Button size="icon-sm" onClick={openAddVisa} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* Warnings */}
        {passportExpired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Passport Expired!</AlertTitle>
            <AlertDescription>Your passport expired on {formatDate(passport.expiryDate)}. Renew immediately.</AlertDescription>
          </Alert>
        )}
        {passportExpiring && !passportExpired && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Passport Expiring Soon</AlertTitle>
            <AlertDescription>Your passport expires on {formatDate(passport.expiryDate)}. Many countries require 6 months validity.</AlertDescription>
          </Alert>
        )}

        {/* Passport Card */}
        <Card className="overflow-hidden">
          <div className="gradient-hero p-4 text-white relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest">Passport</p>
                <p className="text-xl font-bold mt-0.5">{passport.nationality || 'Philippines'}</p>
              </div>
              <Globe className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-2xl font-bold mt-3 tracking-widest font-mono">
              {passport.passportNumber || '·· ·······'}
            </p>
            <p className="text-white/70 text-sm mt-1">{passport.fullName || 'Traveler Name'}</p>
          </div>

          <CardContent className="p-4">
            {editingPassport ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
                    <Input value={passportBuffer.fullName} onChange={e => setPassportBuffer({ ...passportBuffer, fullName: e.target.value })} placeholder="DELA CRUZ JUAN" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Passport No.</Label>
                    <Input value={passportBuffer.passportNumber} onChange={e => setPassportBuffer({ ...passportBuffer, passportNumber: e.target.value.toUpperCase() })} placeholder="P1234567A" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nationality</Label>
                    <Input value={passportBuffer.nationality} onChange={e => setPassportBuffer({ ...passportBuffer, nationality: e.target.value })} placeholder="Filipino" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</Label>
                    <Input type="date" value={passportBuffer.dateOfBirth} onChange={e => setPassportBuffer({ ...passportBuffer, dateOfBirth: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Issue Date</Label>
                    <Input type="date" value={passportBuffer.issueDate} onChange={e => setPassportBuffer({ ...passportBuffer, issueDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</Label>
                    <Input type="date" value={passportBuffer.expiryDate} onChange={e => setPassportBuffer({ ...passportBuffer, expiryDate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Issuing Country</Label>
                  <Input value={passportBuffer.issuingCountry} onChange={e => setPassportBuffer({ ...passportBuffer, issuingCountry: e.target.value })} placeholder="Philippines" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditingPassport(false); setPassportBuffer(passport) }}>Cancel</Button>
                  <Button className="flex-1" onClick={savePassport}><Check className="h-4 w-4 mr-1" /> Save</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-0 mb-4">
                  <InfoRow label="Full Name" value={passport.fullName} />
                  <InfoRow label="Passport No." value={passport.passportNumber} />
                  <InfoRow label="Nationality" value={passport.nationality} />
                  <InfoRow label="Date of Birth" value={passport.dateOfBirth ? formatDate(passport.dateOfBirth) : ''} />
                  <InfoRow label="Issue Date" value={passport.issueDate ? formatDate(passport.issueDate) : ''} />
                  <InfoRow label="Expiry Date" value={passport.expiryDate ? formatDate(passport.expiryDate) : ''} />
                  <InfoRow label="Issuing Country" value={passport.issuingCountry} />
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setPassportBuffer(passport); setEditingPassport(true) }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Passport
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Visas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Visas</h2>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openAddVisa}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Visa
            </Button>
          </div>

          <div className="space-y-2">
            {visas.map(visa => {
              const expired = visa.expiryDate && isExpired(visa.expiryDate)
              const expiring = visa.expiryDate && isExpiringSoon(visa.expiryDate, 1)
              return (
                <motion.div key={visa.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-amber-500" />
                            <p className="font-semibold text-sm">{visa.country}</p>
                            <Badge variant={expired ? 'destructive' : visa.status === 'valid' ? 'success' : 'warning'}>
                              {expired ? 'Expired' : visa.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{visa.visaType}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => openEditVisa(visa)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => removeVisa(visa.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {visa.visaNumber && <p className="text-xs text-muted-foreground">No: {visa.visaNumber}</p>}
                      {visa.expiryDate && (
                        <p className={`text-xs mt-1 ${expired ? 'text-destructive font-semibold' : expiring ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          Expires: {formatDate(visa.expiryDate)}
                        </p>
                      )}
                      {visa.notes && <p className="text-xs text-muted-foreground mt-1.5">{visa.notes}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
            {visas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No visas added</p>
            )}
          </div>
        </div>
      </div>

      {/* Visa Dialog */}
      <Dialog open={visaDialogOpen} onOpenChange={setVisaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVisa && trip.visas.find(v => v.id === editingVisa.id) ? 'Edit Visa' : 'Add Visa'}</DialogTitle>
          </DialogHeader>
          {editingVisa && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Country</Label>
                  <Input value={editingVisa.country} onChange={e => setEditingVisa({ ...editingVisa, country: e.target.value })} placeholder="Hong Kong" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Visa Type</Label>
                  <Input value={editingVisa.visaType} onChange={e => setEditingVisa({ ...editingVisa, visaType: e.target.value })} placeholder="Tourist Visa" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Visa Number</Label>
                <Input value={editingVisa.visaNumber} onChange={e => setEditingVisa({ ...editingVisa, visaNumber: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Issue Date</Label>
                  <Input type="date" value={editingVisa.issueDate} onChange={e => setEditingVisa({ ...editingVisa, issueDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</Label>
                  <Input type="date" value={editingVisa.expiryDate} onChange={e => setEditingVisa({ ...editingVisa, expiryDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                <Select value={editingVisa.status} onValueChange={(v: VisaInfo['status']) => setEditingVisa({ ...editingVisa, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Textarea value={editingVisa.notes} onChange={e => setEditingVisa({ ...editingVisa, notes: e.target.value })} placeholder="Notes..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVisaDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveVisa}>Save Visa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
