const icons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}
const colors = {
  success: 'border-green-500/50 bg-green-500/10 text-green-300',
  error: 'border-red-500/50 bg-red-500/10 text-red-300',
  info: 'border-violet-500/50 bg-violet-500/10 text-violet-300',
  warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300',
}

function ToastItem({ toast, onDismiss }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md
                  text-sm font-medium animate-slide-in cursor-pointer ${colors[toast.type] ?? colors.info}`}
      onClick={() => onDismiss(toast.id)}
    >
      <span>{icons[toast.type]}</span>
      <span>{toast.message}</span>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
