import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money, monthShort } from '../format.js'

// Paleta categórica validada (daltonismo/contraste); cores de texto nunca usam a cor da série.
const SERIES = { receitas: '#2a78d6', despesas: '#eb6834' }
const AXIS = { stroke: '#c3c2b7', tick: { fill: '#52514e', fontSize: 12 } }
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label !== undefined && <strong>{labelFormatter ? labelFormatter(label) : label}</strong>}
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span className="swatch" style={{ background: p.payload.color || p.color }} aria-hidden="true" />
          <span>{p.name}</span>
          <span className="num">{money(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/** Barras horizontais: despesas do mês por categoria (ordenadas da maior para a menor). */
export function ExpensesByCategoryChart({ data }) {
  if (!data.length) return <p className="muted">Nenhuma despesa registrada neste mês.</p>
  const height = data.length * 40 + 20
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 96, bottom: 0, left: 8 }} barCategoryGap={8}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="category" width={130} axisLine={false} tickLine={false} tick={AXIS.tick} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.05)' }} />
        <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.category} fill={d.color} />
          ))}
          <LabelList dataKey="total" position="right" formatter={money} fill="#0b0b0b" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Barras agrupadas: receitas x despesas dos últimos meses. */
export function MonthlyEvolutionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#e1e0d9" />
        <XAxis dataKey="month" tickFormatter={monthShort} stroke={AXIS.stroke} tick={AXIS.tick} tickLine={false} />
        <YAxis tickFormatter={(v) => compact.format(v)} axisLine={false} tickLine={false} tick={AXIS.tick} width={44} />
        <Tooltip content={<ChartTooltip labelFormatter={monthShort} />} cursor={{ fill: 'rgba(11,11,11,0.05)' }} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: '#52514e' }}>{v}</span>} />
        <Bar dataKey="receitas" name="Receitas" fill={SERIES.receitas} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        <Bar dataKey="despesas" name="Despesas" fill={SERIES.despesas} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
