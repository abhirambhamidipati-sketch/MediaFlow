import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
if (!CLIENT_ID) {
  console.error('[MF] VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.')
}

// Module-level singleton flag — lives outside React's render cycle.
// StrictMode mounts→unmounts→remounts every component; component state resets
// on each mount, but module-level variables do NOT. This guarantees initialize()
// is called at most once per page load regardless of how many times the
// component mounts.
let _gsiInitialized = false

function GoogleSvg({ dim = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${dim ? 'opacity-30' : ''}`} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function getNotDisplayedMsg(reason) {
  const origin = window.location.origin
  const msgs = {
    invalid_client:
      `Google Sign-In is blocked for this domain. In Google Cloud Console → Credentials → your OAuth client → add ${origin} to Authorized JavaScript origins.`,
    unregistered_origin:
      `This origin is not registered with your Google OAuth client. In Google Cloud Console → Credentials → your OAuth client → add ${origin} to Authorized JavaScript origins.`,
    origin_mismatch:
      `Origin mismatch: your Google OAuth client does not allow ${origin}. Add it in Google Cloud Console → Credentials → your OAuth client → Authorized JavaScript origins.`,
    missing_client_id: 'Google client ID is missing. Set VITE_GOOGLE_CLIENT_ID.',
    suppressed_by_user:
      'Google Sign-In was dismissed by the browser. Try clearing site cookies, or disable "Block third-party cookies" for this site.',
    opt_out_or_no_session:
      'No Google account session found. Sign into Google in another tab first, then try again.',
    browser_not_supported: 'Your browser does not support Google Sign-In.',
  }
  return msgs[reason] ?? `Google Sign-In could not be shown (${reason}). Please try again.`
}

export function GoogleLoginButton({ onSuccess, onError }) {
  // Keep callbacks in refs — the effect runs only once on mount (empty deps).
  // Inline arrow functions in the parent re-create on every render; if they
  // were in deps, the effect would re-initialize the SDK on every keystroke.
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef  = useRef(onError)
  onSuccessRef.current = onSuccess
  onErrorRef.current   = onError

  const [sdkState, setSdkState] = useState(() => (CLIENT_ID ? 'loading' : 'unconfigured'))

  useEffect(() => {
    if (!CLIENT_ID) return

    let cancelled = false
    let attempts  = 0

    const tryInit = () => {
      if (cancelled) return

      if (window.google?.accounts?.id) {
        if (!_gsiInitialized && !cancelled) {
          window.google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: ({ credential }) => {
              if (credential) onSuccessRef.current?.(credential)
              else onErrorRef.current?.('Google did not return a credential. Please try again.')
            },
            cancel_on_tap_outside: true,
          })
          _gsiInitialized = true
        }
        if (!cancelled) setSdkState('ready')
      } else if (attempts < 50) {
        attempts++
        setTimeout(tryInit, 100)
      } else {
        if (!cancelled) {
          setSdkState('failed')
          onErrorRef.current?.('Google Sign-In script failed to load. Please refresh the page.')
        }
      }
    }

    tryInit()
    return () => { cancelled = true }
  }, []) // intentionally empty — callbacks accessed via refs

  const handleClick = () => {
    if (sdkState !== 'ready') return

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        onErrorRef.current?.(getNotDisplayedMsg(notification.getNotDisplayedReason()))
      }
      // isSkippedMoment / isDismissedMoment = user actively closed it; no error needed
    })
  }

  // No client ID — always show a visible disabled placeholder
  if (sdkState === 'unconfigured') {
    return (
      <button
        type="button"
        disabled
        title="Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable"
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/30 text-sm cursor-not-allowed select-none"
      >
        <GoogleSvg dim />
        Continue with Google
      </button>
    )
  }

  if (sdkState === 'failed') {
    return (
      <p className="text-center text-white/30 text-xs py-2">
        Google Sign-In unavailable — please refresh the page
      </p>
    )
  }

  const isLoading = sdkState === 'loading'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200
        ${isLoading
          ? 'border-white/8 bg-white/4 text-white/25 cursor-wait'
          : 'border-white/18 bg-white text-gray-800 hover:bg-gray-50 hover:border-white/30 active:scale-[0.98] active:bg-gray-100 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
        }`}
    >
      {isLoading
        ? <>
            <span className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
            Loading…
          </>
        : <>
            <GoogleSvg />
            Continue with Google
          </>
      }
    </button>
  )
}
