import { monthLong, shiftMonth } from '../format.js'

export default function MonthPicker({ value, onChange }) {
  return (
    <div className="month-picker" role="group" aria-label="Selecionar mês">
      <button type="button" className="btn btn-ghost" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Mês anterior">
        ‹
      </button>
      <span className="month-name" aria-live="polite">
        {monthLong(value)}
      </span>
      <button type="button" className="btn btn-ghost" onClick={() => onChange(shiftMonth(value, 1))} aria-label="Próximo mês">
        ›
      </button>
    </div>
  )
}
