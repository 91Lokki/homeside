import { useLang } from '@/state/lang'

type Named = { name: string; nameTC?: string | null }

/** Returns a function that picks nameTC when zh is active, else name. */
export function useTName() {
  const { lang } = useLang()
  return (entity: Named | null | undefined, fallback = ''): string => {
    if (!entity) return fallback
    return (lang === 'zh' && entity.nameTC) ? entity.nameTC : entity.name
  }
}
