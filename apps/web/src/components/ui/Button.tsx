import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const styles: Record<Variant, string> = {
  primary:   'background:var(--color-primary);color:#fff;border:none',
  secondary: 'background:var(--color-secondary);color:#fff;border:none',
  outline:   'background:transparent;color:var(--color-primary);border:2px solid var(--color-primary)',
  ghost:     'background:transparent;color:var(--color-dark);border:1px solid var(--color-border)',
  danger:    'background:var(--color-danger);color:#fff;border:none',
}

const sizes: Record<Size, string> = {
  sm: 'padding:0.375rem 0.75rem;font-size:0.8125rem',
  md: 'padding:0.625rem 1.25rem;font-size:0.9375rem',
  lg: 'padding:0.75rem 1.75rem;font-size:1rem',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const baseStyle = `
    display:inline-flex;align-items:center;gap:0.5rem;
    font-family:var(--font-body);font-weight:600;
    border-radius:var(--radius-md);cursor:pointer;
    transition:opacity var(--transition),transform var(--transition);
    ${styles[variant]};${sizes[size]};
    ${disabled || loading ? 'opacity:0.6;cursor:not-allowed' : ''}
  `
  return (
    <button
      style={{ ...(style as object) }}
      css-hack={baseStyle}
      disabled={disabled || loading}
      {...rest}
      className={`tp-btn tp-btn--${variant} tp-btn--${size} ${rest.className ?? ''}`}
    >
      {loading && <span style={{ marginRight: 4 }}>⏳</span>}
      {children}
    </button>
  )
}
