import axios from 'axios'

// When VITE_API_BASE_URL is set (dev → Azure, or production build), all requests
// go directly to that origin.  When it is absent the baseURL is the bare path
// '/api' and Vite's dev-proxy forwards requests to localhost:8000 — exactly the
// original local-only behaviour, so nothing breaks for pure-local development.
const _origin = import.meta.env.VITE_API_BASE_URL ?? ''

const api = axios.create({
  baseURL: `${_origin}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 → clear auth and redirect to login (avoids stale token loops)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthEndpoint =
        err.config.url?.includes('/token/') ||
        err.config.url?.includes('/register/') ||
        err.config.url?.includes('/auth/google/')
      if (!isAuthEndpoint) {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
