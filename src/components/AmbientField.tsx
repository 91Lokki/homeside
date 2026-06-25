import { useEffect, useRef } from 'react'
import { hashString, hexToRgb, mulberry32 } from '@/lib/prng'
import { cn } from '@/lib/utils'

/**
 * "Quiet Currents" — a slow generative flow field that lives behind the mascot.
 *
 * Hundreds of faint motes drift along a seeded value-noise field, leaving
 * whisper-thin trails that continuously fade. Each team's seed gives its home
 * base a unique-but-stable ambiance. Deliberately near-invisible: the gallery
 * stays white; this is breath, not decoration. Static frame under reduced motion.
 */
export function AmbientField({
  seed,
  color,
  isDark,
  className,
}: {
  seed: string
  color: string
  isDark: boolean
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rgb = hexToRgb(color)
    const fade = isDark ? '14, 14, 12' : '251, 251, 249'

    // --- seeded 2D value noise ---
    const baseSeed = hashString(seed + '·field')
    const rand = mulberry32(baseSeed)
    const grid = 256
    const lattice = new Float32Array(grid * grid)
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand()
    const smooth = (t: number) => t * t * (3 - 2 * t)
    const noise = (x: number, y: number) => {
      const xi = Math.floor(x) & (grid - 1)
      const yi = Math.floor(y) & (grid - 1)
      const xf = x - Math.floor(x)
      const yf = y - Math.floor(y)
      const x1 = (xi + 1) & (grid - 1)
      const y1 = (yi + 1) & (grid - 1)
      const v00 = lattice[yi * grid + xi]
      const v10 = lattice[yi * grid + x1]
      const v01 = lattice[y1 * grid + xi]
      const v11 = lattice[y1 * grid + x1]
      const u = smooth(xf)
      const v = smooth(yf)
      return v00 * (1 - u) * (1 - v) + v10 * u * (1 - v) + v01 * (1 - u) * v + v11 * u * v
    }

    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    interface Mote {
      x: number
      y: number
      tinted: boolean
      life: number
      maxLife: number
    }
    let motes: Mote[] = []

    const spawn = (): Mote => ({
      x: rand() * w,
      y: rand() * h,
      tinted: rand() < 0.22,
      life: 0,
      maxLife: 200 + rand() * 400,
    })

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = isDark ? '#0e0e0c' : '#fbfbf9'
      ctx.fillRect(0, 0, w, h)
      const count = Math.round(Math.min(220, (w * h) / 2600))
      motes = Array.from({ length: count }, spawn)
    }

    const scale = 0.0016
    const speed = 0.26
    let t = 0
    let raf = 0

    const step = () => {
      t += 0.0007
      // gently fade the previous frame toward the canvas color (trails)
      ctx.fillStyle = `rgba(${fade}, 0.095)`
      ctx.fillRect(0, 0, w, h)

      for (const m of motes) {
        const angle = noise(m.x * scale + t, m.y * scale - t) * Math.PI * 2
        m.x += Math.cos(angle) * speed
        m.y += Math.sin(angle) * speed
        m.life++
        if (m.x < -10 || m.x > w + 10 || m.y < -10 || m.y > h + 10 || m.life > m.maxLife) {
          Object.assign(m, spawn())
        }
        const a = m.tinted ? (isDark ? 0.05 : 0.04) : isDark ? 0.035 : 0.03
        ctx.fillStyle = m.tinted
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`
          : isDark
            ? `rgba(180,180,172,${a})`
            : `rgba(60,60,55,${a})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(step)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    if (reduced) {
      // a few static motes, no animation
      for (let i = 0; i < 600; i++) {
        const m = spawn()
        for (let k = 0; k < 60; k++) {
          const angle = noise(m.x * scale, m.y * scale) * Math.PI * 2
          m.x += Math.cos(angle) * speed
          m.y += Math.sin(angle) * speed
        }
        ctx.fillStyle = m.tinted ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)` : isDark ? 'rgba(180,180,172,0.04)' : 'rgba(60,60,55,0.035)'
        ctx.beginPath()
        ctx.arc(m.x, m.y, 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      raf = requestAnimationFrame(step)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [seed, color, isDark])

  return <canvas ref={ref} aria-hidden className={cn('h-full w-full', className)} />
}
