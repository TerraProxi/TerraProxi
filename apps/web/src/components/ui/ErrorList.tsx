/** Plusieurs erreurs annoncées d'un bloc (role="alert"). */
export function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="tp-alert tp-alert--error" role="alert">
      <ul style={{ paddingLeft: 'var(--space-4)' }}>
        {errors.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </div>
  )
}
