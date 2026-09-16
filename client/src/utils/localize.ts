import type { Lang } from '../i18n/translations'

export interface LocalizedLabel {
  name: string
  nameAr?: string
  nameFr?: string
}

export const pickLang = (lang: Lang | string, en: string, ar?: string): string => {
  if (lang === 'ar' && ar) return ar
  return en
}

export const localizedName = (item: LocalizedLabel, lang: Lang | string): string =>
  pickLang(lang as Lang, item.name, item.nameAr)

export const localizedText = (item: { description?: string; descriptionAr?: string }, lang: Lang | string): string =>
  pickLang(lang as Lang, item.description ?? '', item.descriptionAr)