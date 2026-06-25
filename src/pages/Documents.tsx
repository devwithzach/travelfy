import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Trash2, Eye, Download } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { Document } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

const docTypeConfig = {
  passport: { label: 'Passport', color: 'bg-blue-500' },
  boarding_pass: { label: 'Boarding Pass', color: 'bg-violet-500' },
  visa: { label: 'Visa', color: 'bg-amber-500' },
  hotel_voucher: { label: 'Hotel Voucher', color: 'bg-emerald-500' },
  insurance: { label: 'Insurance', color: 'bg-rose-500' },
  other: { label: 'Other', color: 'bg-gray-500' },
}

export default function Documents() {
  const { trip, updateTrip } = useTrip()
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [uploadType, setUploadType] = useState<Document['type']>('other')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      const doc: Document = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: uploadType,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        dataUrl: ev.target?.result as string,
      }
      updateTrip(prev => ({ ...prev, documents: [...prev.documents, doc] }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }))
    if (previewDoc?.id === id) setPreviewDoc(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${trip.documents.length} file${trip.documents.length !== 1 ? 's' : ''}`}
        icon={FileText}
        iconColor="text-cyan-600"
      />

      <div className="px-4 space-y-4">
        {/* Upload */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Upload Document</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={uploadType} onValueChange={(v: Document['type']) => setUploadType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(docTypeConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => fileRef.current?.click()}>
                <Plus className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleUpload} />
            <p className="text-xs text-muted-foreground mt-2">Supports images and PDF files</p>
          </CardContent>
        </Card>

        {/* Quick upload buttons */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(docTypeConfig).slice(0, 6).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => { setUploadType(type as Document['type']); fileRef.current?.click() }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border bg-card hover:shadow-md transition-all active:scale-[0.96]"
            >
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold', cfg.color)}>
                {cfg.label.slice(0, 2)}
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Document List */}
        {trip.documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents uploaded"
            description="Upload your passport, boarding pass, visa, hotel voucher, and other travel documents."
          />
        ) : (
          <AnimatePresence>
            {trip.documents.map((doc, i) => {
              const cfg = docTypeConfig[doc.type]
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {doc.dataUrl && doc.fileType.startsWith('image/') ? (
                          <img
                            src={doc.dataUrl}
                            alt={doc.name}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0', cfg.color)}>
                            {doc.fileName.split('.').pop()?.toUpperCase() || 'FILE'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cfg.label}</Badge>
                            <span className="text-xs text-muted-foreground">{formatSize(doc.fileSize)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(doc.uploadedAt, { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="icon-sm" className="h-8 w-8" onClick={() => setPreviewDoc(doc)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {doc.dataUrl && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="h-8 w-8"
                              onClick={() => {
                                const a = document.createElement('a')
                                a.href = doc.dataUrl!
                                a.download = doc.fileName
                                a.click()
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => remove(doc.id)}>
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

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={open => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          {previewDoc?.dataUrl && (
            previewDoc.fileType.startsWith('image/') ? (
              <img src={previewDoc.dataUrl} alt={previewDoc.name} className="w-full rounded-xl object-contain max-h-[70vh]" />
            ) : previewDoc.fileType === 'application/pdf' ? (
              <iframe src={previewDoc.dataUrl} className="w-full h-[70vh] rounded-xl border" title={previewDoc.name} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Preview not available for this file type</p>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
