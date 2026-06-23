import type { IconName } from '@icons'
import type { Channel } from '@types'

interface ChannelMeta {
  icon: IconName
  /** Подпись кнопки канала. */
  label: string
  /** Модификатор класса кнопки: `escalation-btns__btn--${mod}`. */
  mod: string
  /** Префикс к сообщению при отправке контактов выбранным каналом. */
  prefix: string
  /** Плейсхолдер композера на шаге ввода контактов. */
  placeholder: string
  /** Инлайновая подсказка внутри пузыря escalation_2 для выбранного канала. */
  prompt: string
  /** Преобразует значение из env в внешнюю ссылку кнопки escalation_1 (null, если не задано). */
  toHref: (raw: string) => string | null
}

export const CHANNEL_PREFIXES = {
  telegram: 'Телеграм: ',
  max: 'МАХ: ',
  post: 'Почта: '
} as const

export const CHANNEL_ORDER: readonly Channel[] = ['telegram', 'max', 'email']

export const CHANNELS: Record<Channel, ChannelMeta> = {
  telegram: {
    icon: 'telegram',
    label: 'Telegram',
    mod: 'tg',
    prefix: CHANNEL_PREFIXES.telegram,
    placeholder: 'Введите ваш никнейм в Telegram',
    prompt:
      'Укажите ваш никнейм в Telegram (например, @nickname) или номер телефона в формате +7 999 123-45-67\n\nАлександра свяжется с вами в Telegram',
    toHref: (raw) => (raw.length > 0 ? `https://t.me/${raw}` : null)
  },
  max: {
    icon: 'max',
    label: 'MAX',
    mod: '1984',
    prefix: CHANNEL_PREFIXES.max,
    placeholder: 'Введите ваш номер телефона',
    prompt:
      'Укажите ваш номер телефона в формате +7 999 123-45-67\n\nАлександра свяжется с вами в MAX',
    toHref: (raw) => (raw.length > 0 ? raw : null)
  },
  email: {
    icon: 'email',
    label: 'Почта',
    mod: 'email',
    prefix: CHANNEL_PREFIXES.post,
    placeholder: 'Введите вашу почту',
    prompt:
      'Укажите ваш адрес электронной почты (например, name@example.com)\n\nАлександра напишет вам в ближайшее время',
    toHref: (raw) => (raw.length > 0 ? `mailto:${raw}` : null)
  }
}

export const isChannel = (value: unknown): value is Channel =>
  value === 'telegram' || value === 'max' || value === 'email'
