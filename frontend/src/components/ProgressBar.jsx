/** Barra de progresso acessível. `tone` define a cor (ok | atencao | estourado | meta). */
export default function ProgressBar({ value, label, tone = 'meta' }) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div
      className={`progress progress-${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div className="progress-fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}
