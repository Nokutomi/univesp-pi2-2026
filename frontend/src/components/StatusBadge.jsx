// O status nunca é indicado só pela cor: sempre ícone + texto.
const STATUS = {
  ok: { icon: '✓', text: 'Dentro do limite' },
  atencao: { icon: '⚠', text: 'Atenção' },
  estourado: { icon: '✕', text: 'Limite estourado' },
}

export default function StatusBadge({ status }) {
  const s = STATUS[status]
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true">{s.icon}</span> {s.text}
    </span>
  )
}
