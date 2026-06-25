import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'

interface FormFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
  required?: boolean
}

export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className,
  required,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
