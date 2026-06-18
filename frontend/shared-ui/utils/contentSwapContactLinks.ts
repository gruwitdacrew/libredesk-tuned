import CHANNEL_PREFIXES from '@shared-ui/constants/channel-prefixes'

const TG_LINK = 'https://t.me/'

// Сопоставление «префикс → канал» и единый regex строятся один раз на загрузку
// модуля, а не пересобираются на каждое сообщение в диалоге. Префиксы — это
// внутренние константы без regex-метасимволов, поэтому экранирование не нужно.
const CHANNEL_BY_PREFIX = new Map<string, string>(
  Object.entries(CHANNEL_PREFIXES).map(([channel, prefix]) => [prefix, channel])
)
const PREFIX_RE = new RegExp(`^(?:${Object.values(CHANNEL_PREFIXES).join('|')})`)

/** Значение похоже на телефонный номер, а не на ник: начинается с «+» или цифры. */
const isPhoneNumber = (value: string): boolean => /^[+\d]/.test(value)

/** Копируемое значение: ссылку для перехода построить нельзя (номер телефона, MAX). */
const copyable = (value: string): string =>
  `<span class="contact-copy" data-copy="${value}">${value}</span>`

/** Якорь-ссылка, открывается в новой вкладке. */
const link = (href: string, text: string): string =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`

/**
 * Этой клоунады бы не было, если бы бек меня послушал, а теперь я канал связи ищу по префиксам)))
 */
function swapContactLinks(content: string): string {
  const match = PREFIX_RE.exec(content)
  if (match === null) return content

  const prefix = match[0]
  const channel = CHANNEL_BY_PREFIX.get(prefix)
  const value = content.slice(prefix.length).trim()
  if (value.length === 0) return content

  let swapped: string
  if (channel === 'max') {
    swapped = copyable(value)
  } else if (channel === 'telegram') {
    swapped = isPhoneNumber(value)
      ? copyable(value)
      : link(`${TG_LINK}${value.replace(/^@/, '')}`, value)
  } else {
    swapped = link(`mailto:${value}`, value)
  }

  return `${prefix}${swapped}`
}

export default swapContactLinks
