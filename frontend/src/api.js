let csrfToken = ''

export function setCsrfToken(token) {
  csrfToken = token || ''
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (['POST', 'PUT', 'DELETE'].includes(options.method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  const res = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
}
