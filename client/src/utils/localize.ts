import type { Lang } from '../i18n/translations'

export interface LocalizedLabel {
  name: string
  nameAr?: string
  nameFr?: string
}

export const pickLang = (lang: Lang | string, en: string, ar?: string, fr?: string): string => {
  if (lang === 'ar' && ar) return ar
  if (lang === 'fr' && fr) return fr
  return en
}

export const localizedName = (item: LocalizedLabel, lang: Lang | string): string =>
  pickLang(lang as Lang, item.name, item.nameAr, item.nameFr)

export const localizedText = (item: { description: string; descriptionAr?: string; descriptionFr?: string }, lang: Lang | string): string =>
  pickLang(lang as Lang, item.description, item.descriptionAr, item.descriptionFr)