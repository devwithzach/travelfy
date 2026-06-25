export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', options || { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatShortDate(dateStr: string): string {
  return formatDate(dateStr, { month: 'short', day: 'numeric' })
}

export function formatDayDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(dateStr: string, months = 6): boolean {
  if (!dateStr) return false
  const target = new Date(dateStr + 'T00:00:00')
  const threshold = new Date()
  threshold.setMonth(threshold.getMonth() + months)
  return target <= threshold
}

export function isExpired(dateStr: string): boolean {
  if (!dateStr) return false
  const target = new Date(dateStr + 'T00:00:00')
  return target < new Date()
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function getTripProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime()
  const end = new Date(endDate + 'T00:00:00').getTime()
  const now = Date.now()
  if (now < start) return 0
  if (now > end) return 100
  return Math.round(((now - start) / (end - start)) * 100)
}

export function getTripStatus(startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const now = new Date()
  if (now < start) return 'upcoming'
  if (now > end) return 'completed'
  return 'active'
}
