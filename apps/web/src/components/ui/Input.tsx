import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="tp-field">
      {label && <label htmlFor={inputId} className="tp-label">{label}</label>}
      <input
        id={inputId}
        className={`tp-input ${error ? 'tp-input--error' : ''}`}
        {...rest}
      />
      {error && <span className="tp-field-error" role="alert">{error}</span>}
    </div>
  )
}
