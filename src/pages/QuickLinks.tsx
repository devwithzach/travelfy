import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2, Plus, Trash2, Edit2, ExternalLink,
  Plane, Building, MapPin, FileText, Shield, Bus, Star
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { QuickLink } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const iconMap: Record<string, React.ElementType> = {
  plane: Plane,
  building: Building,
  'map-pin': MapPin,
  'file-text': FileText,
  shield: Shield,
  bus: Bus,
  star: Star,
  link: Link2,
}

const categoryConfig = {
  airline: { label: 'Airline', color: 'bg-blue-500' },
  hotel: { label: 'Hotel', color: 'bg-violet-500' },
  maps: { label: 'Maps', color: 'bg-emerald-500' },
  immigration: { label: 'Immigration', color: 'bg-amber-500' },
  insurance: { label: 'Insurance', color: 'bg-cyan-500' },
  transport: { label: 'Transport', color: 'bg-indigo-500' },
  other: { label: 'Other', color: 'bg-gray-500' },
}

const defaultLink = (): QuickLink => ({
  id: crypto.randomUUID(),
  title: '',
  url: '',
  icon: 'link',
  category: 'other',
})

export default function QuickLinks() {
  const { trip, updateTrip } = useTrip()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<QuickLink | null>(null)

  const openAdd = () => { setEditing(defaultLink()); setDialogOpen(true) }
  const openEdit = (l: QuickLink) => { setEditing({ ...l }); setDialogOpen(true) }

  const save = () => {
    if (!editing) return
    updateTrip(prev => {
      const exists = prev.quickLinks.find(l => l.id === editing.id)
      return {
        ...prev,
        quickLinks: exists
          ? prev.quickLinks.map(l => l.id === editing.id ? editing : l)
          : [...prev.quickLinks, editing],
      }
    })
    setDialogOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, quickLinks: prev.quickLinks.filter(l => l.id !== id) }))
  }

  const grouped = Object.keys(categoryConfig).reduce((acc, cat) => {
    const links = trip.quickLinks.filter(l => l.category === cat)
    if (links.length > 0) acc[cat] = links
    return acc
  }, {} as Record<string, QuickLink[]>)

  return (
    <div>
      <PageHeader
        title="Quick Links"
        subtitle={`${trip.quickLinks.length} link${trip.quickLinks.length !== 1 ? 's' : ''}`}
        icon={Link2}
        iconColor="text-cyan-600"
        action={
          <Button size="icon-sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {trip.quickLinks.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No links saved"
            description="Save useful links like airline websites, hotel booking, maps, and more."
            actionLabel="Add Link"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence>
            {Object.entries(grouped).map(([category, links]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${categoryConfig[category as keyof typeof categoryConfig].color}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {categoryConfig[category as keyof typeof categoryConfig].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {links.map((link, i) => {
                    const IconComp = iconMap[link.icon] || Link2
                    const cfg = categoryConfig[link.category]
                    return (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="group hover:shadow-md transition-all active:scale-[0.97] cursor-pointer overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className={`p-2 rounded-xl ${cfg.color} text-white`}>
                                <IconComp className="h-4 w-4" />
                              </div>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => openEdit(link)}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => remove(link.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="font-semibold text-sm leading-tight mb-1 line-clamp-1">{link.title}</p>
                            <button
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={() => window.open(link.url, '_blank')}
                            >
                              Open link
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && trip.quickLinks.find(l => l.id === editing.id) ? 'Edit Link' : 'Add Link'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Cebu Pacific" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">URL</Label>
                <Input type="url" value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                  <Select value={editing.category} onValueChange={(v: QuickLink['category']) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Icon</Label>
                  <Select value={editing.icon} onValueChange={v => setEditing({ ...editing, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(iconMap).map(k => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
