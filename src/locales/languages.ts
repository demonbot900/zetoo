export type LanguageRegion =
  | 'Western Europe'
  | 'Northern Europe'
  | 'Central Europe'
  | 'Southern Europe'
  | 'Eastern Europe'
  | 'Caucasus'

export interface Language {
  /** BCP 47 tag used for Intl formatting and the document `lang` attribute. */
  code: string
  /** Name in the language itself — what a speaker looks for in the list. */
  native: string
  /** English name, kept searchable in the picker. */
  english: string
  /** Flag emoji shown next to the name. */
  flag: string
  region: LanguageRegion
  /** True when a message catalogue ships for this language. */
  translated?: boolean
}

/**
 * Every European language offered in the switcher: the official language of
 * each country plus the widely used regional ones. Regional languages carry
 * their state or country flag where no separate emoji exists.
 */
export const languages: Language[] = [
  // --- Western Europe ---------------------------------------------------
  { code: 'en-GB', native: 'English', english: 'English', flag: '🇬🇧', region: 'Western Europe', translated: true },
  { code: 'ga', native: 'Gaeilge', english: 'Irish', flag: '🇮🇪', region: 'Western Europe' },
  { code: 'cy', native: 'Cymraeg', english: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', region: 'Western Europe' },
  { code: 'gd', native: 'Gàidhlig', english: 'Scottish Gaelic', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', region: 'Western Europe' },
  { code: 'de', native: 'Deutsch', english: 'German', flag: '🇩🇪', region: 'Western Europe', translated: true },
  { code: 'fr', native: 'Français', english: 'French', flag: '🇫🇷', region: 'Western Europe', translated: true },
  { code: 'nl', native: 'Nederlands', english: 'Dutch', flag: '🇳🇱', region: 'Western Europe', translated: true },
  { code: 'fy', native: 'Frysk', english: 'Frisian', flag: '🇳🇱', region: 'Western Europe' },
  { code: 'lb', native: 'Lëtzebuergesch', english: 'Luxembourgish', flag: '🇱🇺', region: 'Western Europe' },
  { code: 'rm', native: 'Rumantsch', english: 'Romansh', flag: '🇨🇭', region: 'Western Europe' },

  // --- Northern Europe --------------------------------------------------
  { code: 'da', native: 'Dansk', english: 'Danish', flag: '🇩🇰', region: 'Northern Europe', translated: true },
  { code: 'sv', native: 'Svenska', english: 'Swedish', flag: '🇸🇪', region: 'Northern Europe', translated: true },
  { code: 'nb', native: 'Norsk bokmål', english: 'Norwegian', flag: '🇳🇴', region: 'Northern Europe', translated: true },
  { code: 'fi', native: 'Suomi', english: 'Finnish', flag: '🇫🇮', region: 'Northern Europe', translated: true },
  { code: 'is', native: 'Íslenska', english: 'Icelandic', flag: '🇮🇸', region: 'Northern Europe' },
  { code: 'fo', native: 'Føroyskt', english: 'Faroese', flag: '🇫🇴', region: 'Northern Europe' },
  { code: 'kl', native: 'Kalaallisut', english: 'Greenlandic', flag: '🇬🇱', region: 'Northern Europe' },
  { code: 'se', native: 'Davvisámegiella', english: 'Northern Sami', flag: '🇳🇴', region: 'Northern Europe' },
  { code: 'et', native: 'Eesti', english: 'Estonian', flag: '🇪🇪', region: 'Northern Europe' },
  { code: 'lv', native: 'Latviešu', english: 'Latvian', flag: '🇱🇻', region: 'Northern Europe' },
  { code: 'lt', native: 'Lietuvių', english: 'Lithuanian', flag: '🇱🇹', region: 'Northern Europe' },

  // --- Central Europe ---------------------------------------------------
  { code: 'pl', native: 'Polski', english: 'Polish', flag: '🇵🇱', region: 'Central Europe', translated: true },
  { code: 'cs', native: 'Čeština', english: 'Czech', flag: '🇨🇿', region: 'Central Europe', translated: true },
  { code: 'sk', native: 'Slovenčina', english: 'Slovak', flag: '🇸🇰', region: 'Central Europe' },
  { code: 'hu', native: 'Magyar', english: 'Hungarian', flag: '🇭🇺', region: 'Central Europe' },
  { code: 'sl', native: 'Slovenščina', english: 'Slovenian', flag: '🇸🇮', region: 'Central Europe' },

  // --- Southern Europe --------------------------------------------------
  { code: 'es', native: 'Español', english: 'Spanish', flag: '🇪🇸', region: 'Southern Europe', translated: true },
  { code: 'ca', native: 'Català', english: 'Catalan', flag: '🇪🇸', region: 'Southern Europe' },
  { code: 'eu', native: 'Euskara', english: 'Basque', flag: '🇪🇸', region: 'Southern Europe' },
  { code: 'gl', native: 'Galego', english: 'Galician', flag: '🇪🇸', region: 'Southern Europe' },
  { code: 'pt', native: 'Português', english: 'Portuguese', flag: '🇵🇹', region: 'Southern Europe', translated: true },
  { code: 'it', native: 'Italiano', english: 'Italian', flag: '🇮🇹', region: 'Southern Europe', translated: true },
  { code: 'mt', native: 'Malti', english: 'Maltese', flag: '🇲🇹', region: 'Southern Europe' },
  { code: 'el', native: 'Ελληνικά', english: 'Greek', flag: '🇬🇷', region: 'Southern Europe' },
  { code: 'sq', native: 'Shqip', english: 'Albanian', flag: '🇦🇱', region: 'Southern Europe' },
  { code: 'hr', native: 'Hrvatski', english: 'Croatian', flag: '🇭🇷', region: 'Southern Europe' },
  { code: 'bs', native: 'Bosanski', english: 'Bosnian', flag: '🇧🇦', region: 'Southern Europe' },
  { code: 'sr', native: 'Српски', english: 'Serbian', flag: '🇷🇸', region: 'Southern Europe' },
  { code: 'cnr', native: 'Crnogorski', english: 'Montenegrin', flag: '🇲🇪', region: 'Southern Europe' },
  { code: 'mk', native: 'Македонски', english: 'Macedonian', flag: '🇲🇰', region: 'Southern Europe' },

  // --- Eastern Europe ---------------------------------------------------
  { code: 'ro', native: 'Română', english: 'Romanian', flag: '🇷🇴', region: 'Eastern Europe' },
  { code: 'bg', native: 'Български', english: 'Bulgarian', flag: '🇧🇬', region: 'Eastern Europe' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian', flag: '🇺🇦', region: 'Eastern Europe', translated: true },
  { code: 'be', native: 'Беларуская', english: 'Belarusian', flag: '🇧🇾', region: 'Eastern Europe' },
  { code: 'ru', native: 'Русский', english: 'Russian', flag: '🇷🇺', region: 'Eastern Europe' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', flag: '🇹🇷', region: 'Eastern Europe', translated: true },

  // --- Caucasus ---------------------------------------------------------
  { code: 'ka', native: 'ქართული', english: 'Georgian', flag: '🇬🇪', region: 'Caucasus' },
  { code: 'hy', native: 'Հայերեն', english: 'Armenian', flag: '🇦🇲', region: 'Caucasus' },
  { code: 'az', native: 'Azərbaycan', english: 'Azerbaijani', flag: '🇦🇿', region: 'Caucasus' },
]

export const regionOrder: LanguageRegion[] = [
  'Western Europe',
  'Northern Europe',
  'Central Europe',
  'Southern Europe',
  'Eastern Europe',
  'Caucasus',
]

export const languageByCode = (code: string): Language =>
  languages.find((language) => language.code === code) ??
  languages.find((language) => language.code.split('-')[0] === code.split('-')[0]) ??
  languages[0]

/** Languages sorted by region, then alphabetically by their English name. */
export const languagesByRegion = (): Language[] =>
  regionOrder.flatMap((region) =>
    languages
      .filter((language) => language.region === region)
      .sort((a, b) => a.english.localeCompare(b.english)),
  )
