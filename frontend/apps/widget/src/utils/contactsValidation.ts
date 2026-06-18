import type { Channel, Escalation2State } from '@widget/core/types'

function validate(text: string, pattern: RegExp): boolean {
  return pattern.test(text.trim())
}

/**
 * MAX привязан к номеру телефона РФ: код страны +7 или 8, затем 10 цифр.
 * Допускаются разделители — пробелы, дефисы, скобки, точки: +7 (999) 123-45-67, 89991234567.
 */
const RU_PHONE = /^(?:\+7|8)[\s\-().]*\d{3}[\s\-().]*\d{3}[\s\-().]*\d{2}[\s\-().]*\d{2}$/

/** Telegram username: 5–32 символа [a-z0-9_], опциональный префикс @. */
const TELEGRAM_USERNAME =
  /^@[a-zA-Z0-9_]{5,32}$|^(?:\+7|8)[\s\-().]*\d{3}[\s\-().]*\d{3}[\s\-().]*\d{2}[\s\-().]*\d{2}$/

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateMax = (text: string): boolean => validate(text, RU_PHONE)

const validateTelegram = (text: string): boolean => validate(text, TELEGRAM_USERNAME)

const validateEmail = (text: string): boolean => validate(text, EMAIL)

const validationMap: Map<Channel | 'select_channel', (text: string) => boolean> = new Map([
  ['max', validateMax],
  ['telegram', validateTelegram],
  ['email', validateEmail]
])

export function validateContact(text: string, channel: Escalation2State): boolean {
  if (!channel) return false

  const validator = validationMap.get(channel)

  if (!validator) return false

  return validator(text)
}
