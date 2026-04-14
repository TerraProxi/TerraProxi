type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const colors: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#DCFCE7', text: '#15803D' },
  warning: { bg: '#FEF3C7', text: '#B45309' },
  danger:  { bg: '#FEE2E2', text: '#B91C1C' },
  info:    { bg: '#DBEAFE', text: '#1D4ED8' },
  neutral: { bg: '#F3F4F6', text: '#374151' },
}

const ORDER_STATUS_VARIANT: Record<string, Variant> = {
  PENDING:   'warning',
  PAID:      'info',
  PREPARING: 'info',
  READY:     'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING:   'En attente',
  PAID:      'Payée',
  PREPARING: 'En préparation',
  READY:     'Prête',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

interface BadgeProps {
  label?: string
  orderStatus?: string
  variant?: Variant
}

export function Badge({ label, orderStatus, variant = 'neutral' }: BadgeProps) {
  const v = orderStatus ? ORDER_STATUS_VARIANT[orderStatus] ?? 'neutral' : variant
  const text = orderStatus ? ORDER_STATUS_LABEL[orderStatus] ?? orderStatus : label
  const { bg, text: color } = colors[v]

  return (
    <span
      style={{
        background: bg,
        color,
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
