import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Hand over from the static boot splash in index.html once React has painted.
// The logo animation (1.8 s loop, see index.html) closes on its finished frame:
// the moment the green arrow completes its sweep (50% of the cycle; the gear has
// settled since 45%). Later in the cycle the arrow fades and the gear tilts back,
// so the animations are frozen on that frame while the splash fades out.
// In-app page loaders (RouteLoader) are not affected.
// setTimeout, not requestAnimationFrame: rAF never fires in a background tab.
const SPLASH_CYCLE_MS = 1800
const SPLASH_DONE_AT_MS = SPLASH_CYCLE_MS * 0.5 // mlrit-sweep reaches scaleX(1)

function splashRemainingMs(anims) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0
  // Progress of the running CSS animation; fall back to time since page load.
  const elapsed = Number(anims[0]?.currentTime ?? performance.now())
  const pos = elapsed % SPLASH_CYCLE_MS
  return pos <= SPLASH_DONE_AT_MS ? SPLASH_DONE_AT_MS - pos : SPLASH_CYCLE_MS - pos + SPLASH_DONE_AT_MS
}

setTimeout(() => {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  const anims = splash.getAnimations?.({ subtree: true }) || []
  setTimeout(() => {
    // Snap every part of the logo to the finished frame and hold it there.
    for (const a of anims) {
      try {
        const t = Number(a.currentTime) || 0
        a.currentTime = t - (t % SPLASH_CYCLE_MS) + SPLASH_DONE_AT_MS
        a.pause()
      } catch {
        /* animation already gone */
      }
    }
    splash.classList.add('is-done')
    setTimeout(() => splash.remove(), 400)
  }, splashRemainingMs(anims))
}, 0)
