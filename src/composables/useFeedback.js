let shakeTimer = null
let tapCleanupTimer = null

const SHAKE_CLASS = {
  soft: 'screen-shake-soft',
  medium: 'screen-shake-medium',
  strong: 'screen-shake-strong',
}

const TAP_SELECTOR = [
  'button:not(:disabled)',
  '[role="button"]:not(.disabled)',
  '.iconbtn',
  '.stage',
  '#clickCanvas',
  '.golden-pizza-btn',
  '.slot.filled:not(.disabled)',
  '.inv-card:not(.disabled)',
  '.toast.actionable',
  '.sheet-bg.open',
].join(',')

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function triggerScreenShake(level = 'soft') {
  if (typeof document === 'undefined' || reducedMotion()) return
  const cls = SHAKE_CLASS[level] || SHAKE_CLASS.soft
  const body = document.body
  Object.values(SHAKE_CLASS).forEach(c => body.classList.remove(c))
  // Force a reflow so repeated shakes of the same class replay reliably.
  void body.offsetWidth
  body.classList.add(cls)
  window.clearTimeout(shakeTimer)
  shakeTimer = window.setTimeout(() => body.classList.remove(cls), level === 'strong' ? 360 : 260)
}

export function installGlobalInteractionFeedback() {
  if (typeof document === 'undefined') return () => {}

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    const target = event.target?.closest?.(TAP_SELECTOR)
    if (!target || target.matches?.(':disabled')) return
    if (target.classList.contains('disabled') || target.getAttribute('aria-disabled') === 'true') return

    target.classList.remove('tap-feedback-pop')
    void target.offsetWidth
    target.classList.add('tap-feedback-pop')

    window.clearTimeout(tapCleanupTimer)
    tapCleanupTimer = window.setTimeout(() => {
      document.querySelectorAll('.tap-feedback-pop').forEach(el => el.classList.remove('tap-feedback-pop'))
    }, 180)

    if (navigator.vibrate) {
      try { navigator.vibrate(8) } catch (e) { /* ignore */ }
    }
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  return () => {
    document.removeEventListener('pointerdown', onPointerDown)
    window.clearTimeout(tapCleanupTimer)
  }
}