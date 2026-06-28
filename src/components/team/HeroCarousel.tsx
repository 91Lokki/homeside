import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const PEEK = 14 // px of each neighbour card peeking at the screen edges
const GAP = 12 // px between cards
const DUR = 340 // snap animation (ms)

/**
 * A lightweight 3-card peek carousel for the Team hero. Renders prev / current /
 * next cards; the current one is centred with a sliver of its neighbours showing.
 * The card follows the finger during a horizontal drag and snaps to the previous
 * or next card on release; a committed snap calls onCommit(dir) and the parent
 * shifts its centered team, which re-windows these cards and re-centres us
 * instantly (same team stays put → no visible jump).
 *
 * The transform is driven IMPERATIVELY during the gesture (no per-frame React
 * renders, and a forced reflow makes the snap transition fire reliably without
 * requestAnimationFrame). React only owns the committed window. No carousel
 * library, no data ownership; vertical scrolling is preserved (touch-action pan-y).
 */
export function HeroCarousel({
  prev,
  current,
  next,
  centerKey,
  onCommit,
  jumpFrom,
  cardHeight = 296,
}: {
  prev: ReactNode
  current: ReactNode
  next: ReactNode
  centerKey: string
  onCommit: (dir: 'next' | 'prev') => void
  /** When the team changes via search / Back (not a swipe), slide the new card
   *  in from this side. Ignored for swipe commits (those re-centre instantly). */
  jumpFrom?: 'left' | 'right' | null
  /** Fixed card height (px) so cards never resize between teams. */
  cardHeight?: number
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const selfCommit = useRef(false)
  const prevCenter = useRef(centerKey)

  const cardW = Math.max(0, w - 2 * (PEEK + GAP))
  const step = cardW + GAP
  const baseTx = PEEK - cardW // centres the middle (current) card

  // Latest geometry for the imperative handlers (which bind once).
  const geo = useRef({ baseTx, step })
  geo.current = { baseTx, step }

  const apply = (x: number, animate: boolean) => {
    const el = trackRef.current
    if (!el) return
    el.style.transition = animate ? `transform ${DUR}ms var(--ease-calm)` : 'none'
    el.style.transform = `translate3d(${x}px,0,0)`
  }

  // Measure before paint, keep current on resize.
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Re-centre when the centered team changes. A swipe commit (selfCommit) and a
  // plain width change re-centre instantly; an external jump (search / Back to
  // home) whooshes the new card in from `jumpFrom`.
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const centerChanged = prevCenter.current !== centerKey
    prevCenter.current = centerKey
    if (!centerChanged || selfCommit.current) {
      selfCommit.current = false
      apply(baseTx, false)
      return
    }
    if (jumpFrom) {
      const off = (jumpFrom === 'left' ? -1 : 1) * (w || step * 1.5)
      apply(baseTx + off, false)
      void el.offsetHeight // commit the off-screen start before animating in
      apply(baseTx, true)
    } else {
      apply(baseTx, false)
    }
  }, [centerKey, baseTx, jumpFrom, w])

  // Gesture via native listeners (so a horizontal drag can preventDefault while
  // touch-action: pan-y keeps vertical scrolling working).
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    let sx = 0, sy = 0, active = false, axis: 'h' | 'v' | null = null, d = 0
    const clampMul = 0.9
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      sx = t.clientX
      sy = t.clientY
      active = true
      axis = null
      d = 0
      apply(geo.current.baseTx, false)
    }
    const onMove = (e: TouchEvent) => {
      if (!active) return
      const t = e.touches[0]
      const dx = t.clientX - sx
      const dy = t.clientY - sy
      if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (axis === 'h') {
        e.preventDefault()
        const { baseTx: b, step: s } = geo.current
        d = Math.max(-s * clampMul, Math.min(s * clampMul, dx))
        apply(b + d, false)
      }
    }
    const onEnd = () => {
      if (!active) return
      active = false
      if (axis !== 'h') return
      const { baseTx: b, step: s } = geo.current
      const commit = Math.abs(d) > Math.min(s * 0.3, 90)
      const dir: 'next' | 'prev' = d < 0 ? 'next' : 'prev'
      const target = commit ? (d < 0 ? -s : s) : 0
      const el2 = trackRef.current
      if (el2) {
        // Forced reflow so the snap actually animates (was transition:none mid-drag).
        el2.style.transition = `transform ${DUR}ms var(--ease-calm)`
        void el2.offsetHeight
        el2.style.transform = `translate3d(${b + target}px,0,0)`
      }
      // Commit after the snap finishes — a timer, not transitionend, so it's
      // deterministic. The parent re-windows and the track remounts re-centred,
      // so the just-snapped team stays put (no jump).
      if (commit)
        window.setTimeout(() => {
          selfCommit.current = true // tell the re-centre effect this was a swipe
          onCommit(dir)
        }, DUR + 20)
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [onCommit])

  const cell = { flex: `0 0 ${cardW}px`, maxWidth: `${cardW}px`, height: `${cardHeight}px` } as const

  return (
    <div ref={viewportRef} className="overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <div
        key={centerKey}
        ref={trackRef}
        className="flex items-stretch"
        style={{ gap: `${GAP}px`, transform: `translate3d(${baseTx}px,0,0)`, willChange: 'transform' }}
      >
        <div style={cell} aria-hidden>
          {prev}
        </div>
        <div style={cell}>{current}</div>
        <div style={cell} aria-hidden>
          {next}
        </div>
      </div>
    </div>
  )
}
