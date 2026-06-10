import type { Message, MessageHandlers, WidgetContext } from '@types'
import { el, renderContent } from '@utils'
import { buildEscalation1Btns } from './escalation1'
import { buildEscalation2Btns } from './escalation2'
import { buildCsatRatingBtns, buildCsatReasonBtns } from './csat'

export const createMessage = (
  ctx: WidgetContext,
  msg: Message,
  messageTime: string,
  handlers: MessageHandlers
): HTMLElement => {
  const messageText = el('div', { className: 'message__text' })
  const time = el('span', { className: 'message__time' })
  const isBot = msg.author === 'bot'

  if (isBot) {
    messageText.innerHTML = renderContent(msg.content)
  } else {
    messageText.textContent = msg.content
  }

  const message = el('div', { className: isBot ? 'message' : 'message message--user' }, [
    messageText
  ])

  if (messageTime.length > 0) {
    time.innerText = messageTime
  }

  const wrapper = el('div', { className: 'message-wrapper' }, [message])

  switch (msg.type) {
    case 'escalation_1':
      wrapper.classList.add('message-wrapper--escalation')
      wrapper.append(buildEscalation1Btns(), time)
      break

    case 'escalation_2':
      wrapper.classList.add('message-wrapper--escalation')
      wrapper.append(buildEscalation2Btns(ctx, handlers.onChannelSelect), time)
      break

    case 'csat':
      if (msg.meta?.csatUuid === undefined) break

      wrapper.classList.add('message-wrapper--csat')
      wrapper.append(buildCsatRatingBtns(msg.meta.csatUuid, handlers.onCsatRate, msg.meta.rating))
      break

    case 'csat_reason':
      if (!msg.meta) break
      if (msg.meta.csatUuid === undefined || msg.meta.rating === undefined) break

      wrapper.classList.add('message-wrapper--csat')
      wrapper.append(buildCsatReasonBtns(msg.meta.csatUuid, msg.meta.rating, handlers.onCsatReason))
      break

    default:
      wrapper.append(time)
      break
  }

  return wrapper
}
