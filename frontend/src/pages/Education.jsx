import { useRef, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { ErrorMessage, Loading } from '../components/Feedback.jsx'
import { useApi } from '../useApi.js'

const TABS = [
  { id: 'conteudos', label: 'Conteúdos' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'desafios', label: 'Desafios' },
]

function Contents() {
  const { data, error, loading } = useApi('/contents')
  const [openId, setOpenId] = useState(null)
  if (loading && !data) return <Loading />
  return (
    <>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="content-grid">
        {data?.map((c) => {
          const open = openId === c.id
          return (
            <article key={c.id} className={`card content-card ${open ? 'open' : ''}`} aria-labelledby={`content-${c.id}`}>
              <span className="topic">{c.topic}</span>
              <h3 id={`content-${c.id}`}>{c.title}</h3>
              <p className="muted">{c.summary}</p>
              {open && (
                <div className="content-body" id={`body-${c.id}`}>
                  {c.body.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              <div className="content-foot">
                <span className="muted">{c.reading_minutes} min de leitura</span>
                <button
                  type="button"
                  className="btn btn-link"
                  aria-expanded={open}
                  aria-controls={`body-${c.id}`}
                  onClick={() => setOpenId(open ? null : c.id)}
                >
                  {open ? 'Fechar' : 'Ler conteúdo'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

function Quiz() {
  const { refreshUser } = useAuth()
  const { data, error, loading } = useApi('/quiz')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)

  if (loading && !data) return <Loading />
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!data?.length) return <p className="muted">Nenhuma pergunta cadastrada.</p>

  const finished = index >= data.length
  if (finished) {
    return (
      <section className="card quiz-card" aria-live="polite">
        <h2>Quiz concluído! <span aria-hidden="true">🎉</span></h2>
        <p>
          Você acertou <strong>{score}</strong> de <strong>{data.length}</strong> perguntas.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setIndex(0)
            setScore(0)
            setSelected(null)
            setResult(null)
          }}
        >
          Refazer quiz
        </button>
      </section>
    )
  }

  const q = data[index]

  async function answer(e) {
    e.preventDefault()
    const res = await api.post('/quiz/answer', { question_id: q.id, selected_index: selected })
    setResult(res)
    if (res.correct) {
      setScore((s) => s + 1)
      refreshUser()
    }
  }

  function next() {
    setIndex(index + 1)
    setSelected(null)
    setResult(null)
  }

  return (
    <section className="card quiz-card" aria-labelledby="quiz-q">
      <p className="muted">
        Pergunta {index + 1} de {data.length} · Cada acerto vale 10 pontos
      </p>
      <form onSubmit={answer}>
        <fieldset disabled={Boolean(result)}>
          <legend id="quiz-q">
            <h2>{q.question}</h2>
          </legend>
          <div className="quiz-options">
            {q.options.map((opt, i) => {
              let state = ''
              if (result) {
                if (i === result.correct_index) state = 'correct'
                else if (i === selected) state = 'wrong'
              }
              return (
                <label key={i} className={`quiz-option ${state} ${selected === i ? 'selected' : ''}`}>
                  <input type="radio" name="option" checked={selected === i} onChange={() => setSelected(i)} />
                  <span>{opt}</span>
                  {state === 'correct' && <span className="sr-only"> (resposta correta)</span>}
                </label>
              )
            })}
          </div>
        </fieldset>
        {!result && (
          <button type="submit" className="btn btn-primary" disabled={selected === null}>
            Responder
          </button>
        )}
      </form>
      {result && (
        <div className={`quiz-feedback ${result.correct ? 'ok' : 'bad'}`} role="status">
          <p>
            <strong>
              <span aria-hidden="true">{result.correct ? '✓ ' : '✕ '}</span>
              {result.correct ? 'Resposta correta! +10 pontos' : 'Resposta incorreta.'}
            </strong>
          </p>
          <p>{result.explanation}</p>
          <button type="button" className="btn btn-primary" onClick={next} autoFocus>
            {index + 1 < data.length ? 'Próxima pergunta' : 'Ver resultado'}
          </button>
        </div>
      )}
    </section>
  )
}

const CHALLENGE_STATUS = {
  disponivel: { icon: '○', text: 'Disponível' },
  em_andamento: { icon: '◐', text: 'Em andamento' },
  concluido: { icon: '✓', text: 'Concluído' },
}

function Challenges() {
  const { refreshUser } = useAuth()
  const { data, setData, error, loading } = useApi('/challenges')
  const [actionError, setActionError] = useState(null)

  async function act(id, action) {
    setActionError(null)
    try {
      setData(await api.post(`/challenges/${id}/${action}`))
      if (action === 'complete') refreshUser()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading && !data) return <Loading />
  return (
    <>
      <ErrorMessage>{error || actionError}</ErrorMessage>
      <ul className="challenge-list">
        {data?.map((c) => {
          const s = CHALLENGE_STATUS[c.status]
          return (
            <li key={c.id} className={`card challenge challenge-${c.status}`}>
              <div>
                <h3>{c.title}</h3>
                <p className="muted">{c.description}</p>
                <p className="challenge-meta">
                  <span className={`badge badge-ch-${c.status}`}>
                    <span aria-hidden="true">{s.icon}</span> {s.text}
                  </span>
                  <span>
                    <span aria-hidden="true">⭐</span> {c.points} pontos
                  </span>
                  <span>
                    <span aria-hidden="true">⏱</span> {c.duration_days} dias
                  </span>
                </p>
              </div>
              {c.status === 'disponivel' && (
                <button type="button" className="btn btn-primary" onClick={() => act(c.id, 'join')} aria-label={`Participar do desafio ${c.title}`}>
                  Participar
                </button>
              )}
              {c.status === 'em_andamento' && (
                <button type="button" className="btn btn-primary" onClick={() => act(c.id, 'complete')} aria-label={`Marcar desafio ${c.title} como concluído`}>
                  Marcar como concluído
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function Education() {
  const [tab, setTab] = useState('conteudos')
  const tabRefs = useRef({})

  // Navegação por setas entre as abas (padrão WAI-ARIA)
  function onKeyDown(e) {
    const i = TABS.findIndex((t) => t.id === tab)
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    const next = TABS[(i + delta + TABS.length) % TABS.length].id
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <>
      <div className="page-header">
        <h1>Educação financeira</h1>
      </div>
      <p className="muted">Aprenda com conteúdos curtos, teste seus conhecimentos e ganhe pontos com desafios.</p>
      <div className="tabs" role="tablist" aria-label="Seções de educação financeira" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[t.id] = el)}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'conteudos' && <Contents />}
        {tab === 'quiz' && <Quiz />}
        {tab === 'desafios' && <Challenges />}
      </div>
    </>
  )
}
