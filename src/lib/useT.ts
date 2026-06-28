import { useLang } from '@/state/lang'
import { getT, type Translations } from './i18n'

export function useT(): Translations {
  const { lang } = useLang()
  return getT(lang)
}
