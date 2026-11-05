import { DELIVERY_MODE_LABELS, type DeliveryMode } from '../../services/orders.service'

export interface CheckoutOptions {
  deliveryMode: DeliveryMode
  deliveryAddress: string
  notes: string
}

/** Limites de specs/schemas/cart.schema.json */
const ADDRESS_MAX_LENGTH = 500
const NOTES_MAX_LENGTH = 1000
const DELIVERY_MODES: readonly DeliveryMode[] = ['pickup', 'delivery']

interface Props {
  /** Rend les identifiants uniques quand plusieurs groupes sont affichés. */
  idPrefix: string
  options: CheckoutOptions
  onChange: (patch: Partial<CheckoutOptions>) => void
}

export function DeliveryOptionsFields({ idPrefix, options, onChange }: Props) {
  const addressId = `${idPrefix}-adresse`
  const notesId = `${idPrefix}-note`

  return (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <fieldset className="tp-field" style={{ border: 'none' }}>
        <legend className="tp-label" style={{ marginBottom: 'var(--space-2)' }}>Mode de réception</legend>
        <div className="tp-choices">
          {DELIVERY_MODES.map((mode) => (
            <label key={mode} className="tp-choice">
              <input
                type="radio"
                name={`${idPrefix}-mode`}
                value={mode}
                checked={options.deliveryMode === mode}
                onChange={() => onChange({ deliveryMode: mode })}
              />
              <span>{mode === 'pickup' ? '🏡' : '🚚'} {DELIVERY_MODE_LABELS[mode]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {options.deliveryMode === 'delivery' && (
        <div className="tp-field">
          <label className="tp-label" htmlFor={addressId}>Adresse de livraison *</label>
          <textarea
            id={addressId}
            className="tp-input"
            required
            rows={2}
            maxLength={ADDRESS_MAX_LENGTH}
            autoComplete="street-address"
            value={options.deliveryAddress}
            onChange={(e) => onChange({ deliveryAddress: e.target.value })}
          />
        </div>
      )}

      <div className="tp-field">
        <label className="tp-label" htmlFor={notesId}>Note pour le producteur (facultatif)</label>
        <textarea
          id={notesId}
          className="tp-input"
          rows={2}
          maxLength={NOTES_MAX_LENGTH}
          aria-describedby={`${notesId}-aide`}
          value={options.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
        <span id={`${notesId}-aide`} className="tp-hint">Créneau de retrait souhaité, précisions… ({NOTES_MAX_LENGTH} caractères max.)</span>
      </div>
    </div>
  )
}
