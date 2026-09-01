export type LanguageRegion =
  | 'Western Europe'
  | 'Northern Europe'
  | 'Central Europe'
  | 'Southern Europe'
  | 'Eastern Europe'
  | 'Caucasus'
  | 'Middle East'
  | 'Central Asia'
  | 'South Asia'
  | 'East Asia'
  | 'Southeast Asia'

export interface Language {
  /** BCP 47 tag used for Intl formatting and the document `lang` attribute. */
  code: string
  /** Name in the language itself — what a speaker looks for in the list. */
  native: string
  /** English name, kept searchable in the picker. */
  english: string
  /**
   * flag-icons identifier — an ISO 3166-1 alpha-2 country code, or one of the
   * subdivision codes the library ships (`gb-wls`, `es-ct`, …). Rendered as
   * `<span class="fi fi-{flag}">`, not as an emoji: emoji flags do not draw on
   * Windows and cannot be sized reliably.
   */
  flag: string
  region: LanguageRegion
  /** True when a message catalogue ships for this language. */
  translated?: boolean
  /** True for right-to-left scripts; drives the document `dir` attribute. */
  rtl?: boolean
}

/**
 * Every language offered in the switcher: the official language of each
 * European and Asian country plus the widely used regional ones. Regional
 * languages carry their state or country flag where no separate one exists.
 */
export const languages: Language[] = [
  // --- Western Europe ---------------------------------------------------
  { code: 'en-GB', native: 'English', english: 'English', flag: 'gb', region: 'Western Europe', translated: true },
  { code: 'ga', native: 'Gaeilge', english: 'Irish', flag: 'ie', region: 'Western Europe' },
  { code: 'cy', native: 'Cymraeg', english: 'Welsh', flag: 'gb-wls', region: 'Western Europe' },
  { code: 'gd', native: 'Gàidhlig', english: 'Scottish Gaelic', flag: 'gb-sct', region: 'Western Europe' },
  { code: 'de', native: 'Deutsch', english: 'German', flag: 'de', region: 'Western Europe', translated: true },
  { code: 'nds', native: 'Plattdüütsch', english: 'Low German', flag: 'de', region: 'Western Europe' },
  { code: 'hsb', native: 'Hornjoserbšćina', english: 'Upper Sorbian', flag: 'de', region: 'Western Europe' },
  { code: 'fr', native: 'Français', english: 'French', flag: 'fr', region: 'Western Europe', translated: true },
  { code: 'br', native: 'Brezhoneg', english: 'Breton', flag: 'fr', region: 'Western Europe' },
  { code: 'oc', native: 'Occitan', english: 'Occitan', flag: 'fr', region: 'Western Europe' },
  { code: 'co', native: 'Corsu', english: 'Corsican', flag: 'fr', region: 'Western Europe' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch', flag: 'nl', region: 'Western Europe', translated: true },
  { code: 'fy', native: 'Frysk', english: 'Frisian', flag: 'nl', region: 'Western Europe' },
  { code: 'wa', native: 'Walon', english: 'Walloon', flag: 'be', region: 'Western Europe' },
  { code: 'lb', native: 'Lëtzebuergesch', english: 'Luxembourgish', flag: 'lu', region: 'Western Europe' },
  { code: 'rm', native: 'Rumantsch', english: 'Romansh', flag: 'ch', region: 'Western Europe' },

  // --- Northern Europe --------------------------------------------------
  { code: 'da', native: 'Dansk', english: 'Danish', flag: 'dk', region: 'Northern Europe', translated: true },
  { code: 'sv', native: 'Svenska', english: 'Swedish', flag: 'se', region: 'Northern Europe', translated: true },
  { code: 'nb', native: 'Norsk bokmål', english: 'Norwegian Bokmål', flag: 'no', region: 'Northern Europe', translated: true },
  { code: 'nn', native: 'Norsk nynorsk', english: 'Norwegian Nynorsk', flag: 'no', region: 'Northern Europe' },
  { code: 'fi', native: 'Suomi', english: 'Finnish', flag: 'fi', region: 'Northern Europe', translated: true },
  { code: 'is', native: 'Íslenska', english: 'Icelandic', flag: 'is', region: 'Northern Europe' },
  { code: 'fo', native: 'Føroyskt', english: 'Faroese', flag: 'fo', region: 'Northern Europe' },
  { code: 'kl', native: 'Kalaallisut', english: 'Greenlandic', flag: 'gl', region: 'Northern Europe' },
  { code: 'se', native: 'Davvisámegiella', english: 'Northern Sami', flag: 'no', region: 'Northern Europe' },
  { code: 'et', native: 'Eesti', english: 'Estonian', flag: 'ee', region: 'Northern Europe' },
  { code: 'lv', native: 'Latviešu', english: 'Latvian', flag: 'lv', region: 'Northern Europe' },
  { code: 'lt', native: 'Lietuvių', english: 'Lithuanian', flag: 'lt', region: 'Northern Europe' },

  // --- Central Europe ---------------------------------------------------
  { code: 'pl', native: 'Polski', english: 'Polish', flag: 'pl', region: 'Central Europe', translated: true },
  { code: 'szl', native: 'Ślōnskŏ gŏdka', english: 'Silesian', flag: 'pl', region: 'Central Europe' },
  { code: 'cs', native: 'Čeština', english: 'Czech', flag: 'cz', region: 'Central Europe', translated: true },
  { code: 'sk', native: 'Slovenčina', english: 'Slovak', flag: 'sk', region: 'Central Europe' },
  { code: 'hu', native: 'Magyar', english: 'Hungarian', flag: 'hu', region: 'Central Europe' },
  { code: 'sl', native: 'Slovenščina', english: 'Slovenian', flag: 'si', region: 'Central Europe' },

  // --- Southern Europe --------------------------------------------------
  { code: 'es', native: 'Español', english: 'Spanish', flag: 'es', region: 'Southern Europe', translated: true },
  { code: 'ca', native: 'Català', english: 'Catalan', flag: 'es-ct', region: 'Southern Europe' },
  { code: 'eu', native: 'Euskara', english: 'Basque', flag: 'es-pv', region: 'Southern Europe' },
  { code: 'gl', native: 'Galego', english: 'Galician', flag: 'es-ga', region: 'Southern Europe' },
  { code: 'ast', native: 'Asturianu', english: 'Asturian', flag: 'es', region: 'Southern Europe' },
  { code: 'pt', native: 'Português', english: 'Portuguese', flag: 'pt', region: 'Southern Europe', translated: true },
  { code: 'it', native: 'Italiano', english: 'Italian', flag: 'it', region: 'Southern Europe', translated: true },
  { code: 'sc', native: 'Sardu', english: 'Sardinian', flag: 'it', region: 'Southern Europe' },
  { code: 'scn', native: 'Sicilianu', english: 'Sicilian', flag: 'it', region: 'Southern Europe' },
  { code: 'fur', native: 'Furlan', english: 'Friulian', flag: 'it', region: 'Southern Europe' },
  { code: 'mt', native: 'Malti', english: 'Maltese', flag: 'mt', region: 'Southern Europe' },
  { code: 'el', native: 'Ελληνικά', english: 'Greek', flag: 'gr', region: 'Southern Europe' },
  { code: 'sq', native: 'Shqip', english: 'Albanian', flag: 'al', region: 'Southern Europe' },
  { code: 'hr', native: 'Hrvatski', english: 'Croatian', flag: 'hr', region: 'Southern Europe' },
  { code: 'bs', native: 'Bosanski', english: 'Bosnian', flag: 'ba', region: 'Southern Europe' },
  { code: 'sr', native: 'Српски', english: 'Serbian', flag: 'rs', region: 'Southern Europe' },
  { code: 'cnr', native: 'Crnogorski', english: 'Montenegrin', flag: 'me', region: 'Southern Europe' },
  { code: 'mk', native: 'Македонски', english: 'Macedonian', flag: 'mk', region: 'Southern Europe' },

  // --- Eastern Europe ---------------------------------------------------
  { code: 'ro', native: 'Română', english: 'Romanian', flag: 'ro', region: 'Eastern Europe' },
  { code: 'bg', native: 'Български', english: 'Bulgarian', flag: 'bg', region: 'Eastern Europe' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian', flag: 'ua', region: 'Eastern Europe', translated: true },
  { code: 'be', native: 'Беларуская', english: 'Belarusian', flag: 'by', region: 'Eastern Europe' },
  { code: 'ru', native: 'Русский', english: 'Russian', flag: 'ru', region: 'Eastern Europe' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', flag: 'tr', region: 'Eastern Europe', translated: true },

  // --- Caucasus ---------------------------------------------------------
  { code: 'ka', native: 'ქართული', english: 'Georgian', flag: 'ge', region: 'Caucasus' },
  { code: 'hy', native: 'Հայերեն', english: 'Armenian', flag: 'am', region: 'Caucasus' },
  { code: 'az', native: 'Azərbaycan', english: 'Azerbaijani', flag: 'az', region: 'Caucasus' },

  // --- Middle East ------------------------------------------------------
  { code: 'ar', native: 'العربية', english: 'Arabic', flag: 'sa', region: 'Middle East', rtl: true },
  { code: 'he', native: 'עברית', english: 'Hebrew', flag: 'il', region: 'Middle East', rtl: true },
  { code: 'fa', native: 'فارسی', english: 'Persian', flag: 'ir', region: 'Middle East', rtl: true },
  { code: 'fa-AF', native: 'دری', english: 'Dari', flag: 'af', region: 'Middle East', rtl: true },
  { code: 'ku', native: 'کوردی', english: 'Kurdish', flag: 'iq', region: 'Middle East', rtl: true },
  { code: 'ps', native: 'پښتو', english: 'Pashto', flag: 'af', region: 'Middle East', rtl: true },

  // --- Central Asia -----------------------------------------------------
  { code: 'kk', native: 'Қазақша', english: 'Kazakh', flag: 'kz', region: 'Central Asia' },
  { code: 'uz', native: 'Oʻzbekcha', english: 'Uzbek', flag: 'uz', region: 'Central Asia' },
  { code: 'ky', native: 'Кыргызча', english: 'Kyrgyz', flag: 'kg', region: 'Central Asia' },
  { code: 'tk', native: 'Türkmençe', english: 'Turkmen', flag: 'tm', region: 'Central Asia' },
  { code: 'tg', native: 'Тоҷикӣ', english: 'Tajik', flag: 'tj', region: 'Central Asia' },

  // --- South Asia -------------------------------------------------------
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', flag: 'in', region: 'South Asia' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', flag: 'bd', region: 'South Asia' },
  { code: 'ur', native: 'اردو', english: 'Urdu', flag: 'pk', region: 'South Asia', rtl: true },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi', flag: 'in', region: 'South Asia' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', flag: 'in', region: 'South Asia' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati', flag: 'in', region: 'South Asia' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', flag: 'in', region: 'South Asia' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', flag: 'in', region: 'South Asia' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', flag: 'in', region: 'South Asia' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam', flag: 'in', region: 'South Asia' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia', flag: 'in', region: 'South Asia' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese', flag: 'in', region: 'South Asia' },
  { code: 'ne', native: 'नेपाली', english: 'Nepali', flag: 'np', region: 'South Asia' },
  { code: 'si', native: 'සිංහල', english: 'Sinhala', flag: 'lk', region: 'South Asia' },
  { code: 'dv', native: 'ދިވެހި', english: 'Dhivehi', flag: 'mv', region: 'South Asia', rtl: true },

  // --- East Asia --------------------------------------------------------
  { code: 'zh-Hans', native: '简体中文', english: 'Chinese (Simplified)', flag: 'cn', region: 'East Asia' },
  { code: 'zh-Hant', native: '繁體中文', english: 'Chinese (Traditional)', flag: 'tw', region: 'East Asia' },
  { code: 'yue', native: '廣東話', english: 'Cantonese', flag: 'hk', region: 'East Asia' },
  { code: 'ja', native: '日本語', english: 'Japanese', flag: 'jp', region: 'East Asia' },
  { code: 'ko', native: '한국어', english: 'Korean', flag: 'kr', region: 'East Asia' },
  { code: 'mn', native: 'Монгол', english: 'Mongolian', flag: 'mn', region: 'East Asia' },
  { code: 'bo', native: 'བོད་སྐད་', english: 'Tibetan', flag: 'cn', region: 'East Asia' },
  { code: 'ug', native: 'ئۇيغۇرچە', english: 'Uyghur', flag: 'cn', region: 'East Asia', rtl: true },

  // --- Southeast Asia ---------------------------------------------------
  { code: 'th', native: 'ไทย', english: 'Thai', flag: 'th', region: 'Southeast Asia' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', flag: 'vn', region: 'Southeast Asia' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', flag: 'id', region: 'Southeast Asia' },
  { code: 'jv', native: 'Basa Jawa', english: 'Javanese', flag: 'id', region: 'Southeast Asia' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay', flag: 'my', region: 'Southeast Asia' },
  { code: 'fil', native: 'Filipino', english: 'Filipino', flag: 'ph', region: 'Southeast Asia' },
  { code: 'km', native: 'ភាសាខ្មែរ', english: 'Khmer', flag: 'kh', region: 'Southeast Asia' },
  { code: 'lo', native: 'ລາວ', english: 'Lao', flag: 'la', region: 'Southeast Asia' },
  { code: 'my', native: 'မြန်မာ', english: 'Burmese', flag: 'mm', region: 'Southeast Asia' },
]

export const regionOrder: LanguageRegion[] = [
  'Western Europe',
  'Northern Europe',
  'Central Europe',
  'Southern Europe',
  'Eastern Europe',
  'Caucasus',
  'Middle East',
  'Central Asia',
  'South Asia',
  'East Asia',
  'Southeast Asia',
]

/** The flag-icons class pair for a language, e.g. `fi fi-gb-wls`. */
export const flagClass = (language: Pick<Language, 'flag'>): string =>
  `fi fi-${language.flag}`

export const languageByCode = (code: string): Language =>
  languages.find((language) => language.code === code) ??
  languages.find((language) => language.code.split('-')[0] === code.split('-')[0]) ??
  languages[0]

/** True when the language is written right to left. */
export const isRtl = (code: string): boolean => languageByCode(code).rtl === true

/**
 * Short badge for the closed trigger: the base subtag in capitals, kept
 * distinct where two entries share one (`zh-Hans` / `zh-Hant`).
 */
export const languageBadge = (language: Language): string => {
  const [base, variant] = language.code.split('-')
  if (!variant) return base.toUpperCase()
  // `Hans`/`Hant` are scripts, `AF`/`GB` are regions — both disambiguate.
  return `${base.toUpperCase()}-${variant.length > 2 ? variant.slice(0, 4) : variant.toUpperCase()}`
}

/** Languages sorted by region, then alphabetically by their English name. */
export const languagesByRegion = (): Language[] =>
  regionOrder.flatMap((region) =>
    languages
      .filter((language) => language.region === region)
      .sort((a, b) => a.english.localeCompare(b.english)),
  )
