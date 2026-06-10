/**
 * Значения conversation.status, на которые подписан виджет. Имена статусов задаются
 * на бэкенде и приходят на русском — храним каноничные имена, а сверяем их
 * регистронезависимо (см. предикаты ниже).
 */
export const CONVERSATION_STATUS = {
  OPEN: 'Открытый',
  ESCALATION: 'Эскалация',
  /** Обрабатывается как ESCALATION. */
  REQUEST_CONTACTS: 'ЗапросКонтактов',
  CLOSED: 'Закрытый',
  PROCESSED: 'Обработан'
} as const

export type ConversationStatus = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS]

const matches = (status: string, target: ConversationStatus): boolean =>
  status.trim().toLowerCase() === target.toLowerCase()

export const isEscalatedStatus = (status: string): boolean =>
  matches(status, CONVERSATION_STATUS.ESCALATION) ||
  matches(status, CONVERSATION_STATUS.REQUEST_CONTACTS)

export const isClosedStatus = (status: string): boolean =>
  matches(status, CONVERSATION_STATUS.CLOSED) || matches(status, CONVERSATION_STATUS.PROCESSED)
