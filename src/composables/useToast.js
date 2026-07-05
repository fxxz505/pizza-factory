// Toast 队列 + 确认弹窗的响应式状态（替代原版动态插入 DOM 的写法）。
import { reactive } from 'vue'

export const toasts = reactive([])
let toastSeq = 0

export function showToast(title, body, opts) {
  const id = ++toastSeq
  const life = (opts && opts.life) || 4200
  const entry = {
    id, title, body,
    actionable: !!(opts && opts.actionable),
    onClick: opts && opts.onClick,
    fading: false,
  }
  toasts.push(entry)
  setTimeout(() => {
    entry.fading = true
    setTimeout(() => {
      const idx = toasts.findIndex(t => t.id === id)
      if (idx !== -1) toasts.splice(idx, 1)
    }, 300)
  }, life)
  return entry
}
export function dismissToast(id) {
  const idx = toasts.findIndex(t => t.id === id)
  if (idx !== -1) toasts.splice(idx, 1)
}
export function handleToastClick(entry) {
  if (entry.onClick) entry.onClick()
  dismissToast(entry.id)
}

/* ---- Confirm modal ---- */
export const confirmState = reactive({
  open: false,
  title: '',
  body: '',
  okLabel: '确认',
  onOk: null,
})
export function showConfirm(title, body, okLabel, onOk) {
  confirmState.open = true
  confirmState.title = title
  confirmState.body = body
  confirmState.okLabel = okLabel
  confirmState.onOk = onOk
}
export function confirmOk() {
  const cb = confirmState.onOk
  confirmState.open = false
  confirmState.onOk = null
  if (cb) cb()
}
export function confirmCancel() {
  confirmState.open = false
  confirmState.onOk = null
}
