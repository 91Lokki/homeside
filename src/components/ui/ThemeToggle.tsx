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
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
