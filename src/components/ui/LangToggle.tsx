import { useLang } from '@/state/lang'
import { useT } from '@/lib/useT'

export function LangToggle() {
  const { lang, setLang } = useLang()
  const t = useT()
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-muted transition-colors hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/[0.07]"
      title={lang === 'en' ? '切換為中文' : 'Switch to English'}
      aria-label={lang === 'en' ? '切換為中文' : 'Switch to English'}
    >
      {t.langToggleLabel}
    </button>
  )
}
