import { ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, RotateCcw, type LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  left: ArrowLeft,
  right: ArrowRight,
  'slight left': ArrowUpLeft,
  'slight right': ArrowUpRight,
  straight: ArrowUp,
  uturn: RotateCcw,
}

export default function TurnArrow({ modifier }: { modifier: string }) {
  const Icon = iconMap[modifier] || ArrowUp
  return <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
}
