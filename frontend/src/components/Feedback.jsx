export function ErrorMessage({ children }) {
  if (!children) return null
  return (
    <p className="error" role="alert">
      {children}
    </p>
  )
}

export function Loading() {
  return (
    <p className="loading" role="status">
      Carregando…
    </p>
  )
}
