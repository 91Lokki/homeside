import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/state/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full border text-muted transition-colors hover:text-ink',
        className,
      )}
    >
      {/* The two icons cross-fade + rotate, so the swap glides rather than jumps. */}
      <span className="relative block h-4 w-4">
        <Sun
          size={16}
          className="absolute inset-0 transition-all duration-500 ease-calm"
          style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(-90deg) scale(0.4)' : 'rotate(0) scale(1)' }}
        />
        <Moon
          size={16}
          className="absolute inset-0 transition-all duration-500 ease-calm"
          style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0) scale(1)' : 'rotate(90deg) scale(0.4)' }}
        />
      </span>
    </button>
  )
}
