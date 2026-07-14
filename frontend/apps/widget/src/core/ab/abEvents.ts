import type { Channel } from '@types'

/**
 * A/B-трекинг действий с каналами связи. Изолированный модуль: чтобы убрать
 * эксперимент, достаточно удалить эту директорию и вызовы abChannelSelected /
 * abContactsValid / abContactsInvalid + initAbEvents.
 */

// Имена WS-событий — зеркало будущих backend-констант WidgetMsgType*.
const AB_EVENT = {
  CHANNEL_SELECTED: 'channel_selected',
  CONTACTS_VALID: 'contacts_valid',
  CONTACTS_INVALID: 'contacts_invalid',
} as const

type AbSender = (data: object) => void

let sender: AbSender | null = null

/** Один раз связывает трекер с WS-отправкой (вызывается из chatRuntime). */
export const initAbEvents = (send: AbSender): void => {
  sender = send
}

const emit = (type: string, uuid: string | null, channel: Channel): void => {
  if (sender === null || uuid === null) {
    return
  }
  sender({ type, data: { conversation_uuid: uuid, channel } })
}

export const abChannelSelected = (uuid: string | null, channel: Channel): void =>
  emit(AB_EVENT.CHANNEL_SELECTED, uuid, channel)

export const abContactsValid = (uuid: string | null, channel: Channel): void =>
  emit(AB_EVENT.CONTACTS_VALID, uuid, channel)

export const abContactsInvalid = (uuid: string | null, channel: Channel): void =>
  emit(AB_EVENT.CONTACTS_INVALID, uuid, channel)
