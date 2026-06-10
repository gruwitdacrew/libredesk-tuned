import type { Message, MessageHandlers, WidgetContext, WidgetStore } from '@types'
import { el, formatTime, iconLabelButton } from '@utils'
import { createMessage } from '../message/message'

export const createChat = (ctx: WidgetContext, handlers: MessageHandlers): HTMLElement => {
  const button = iconLabelButton({
    className: 'chat__contact',
    icon: 'user',
    label: 'Связаться с руководителем направления',
    onClick: () => {
      handlers.onContactManager()
    }
  }) as HTMLButtonElement

  const setButtonState = (state: Readonly<WidgetStore>): void => {
    const locked = state.botStatus === 'escalated' || state.escalation2State !== null
    button.disabled = locked
    button.style.opacity = locked ? '0.6' : '1'
    button.style.pointerEvents = locked ? 'none' : 'auto'
  }

  setButtonState(ctx.store.getStore())
  ctx.onDestroy(ctx.store.subscribe(setButtonState))

  const messagesEl = el('div', {
    className: 'chat__messages',
    attrs: { role: 'log', 'aria-live': 'polite', 'aria-label': 'История чата' }
  })

  const chat = el('div', { className: 'chat' }, [button, messagesEl])

  const rendered = { count: 0 }

  const scrollToBottom = (): void => {
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  let scrollFrame: number | null = null
  const scheduleScroll = (): void => {
    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame)
    }
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null
      scrollToBottom()
    })
  }

  ctx.onDestroy(() => {
    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame)
      scrollFrame = null
    }
  })

  /**
   * Рендер только дополняет список. Если количество сообщений уменьшилось
   * (сброс сессии очищает messages) — полностью перерисовываем с нуля.
   */
  const renderNewMessages = (messages: readonly Message[]): void => {
    if (messages.length < rendered.count) {
      messagesEl.innerHTML = ''
      rendered.count = 0
    }
    for (const msg of messages.slice(rendered.count)) {
      messagesEl.append(createMessage(ctx, msg, formatTime(msg.timestamp), handlers))
    }
    rendered.count = messages.length
    scrollToBottom()
  }

  renderNewMessages(ctx.store.getStore().messages)

  ctx.onDestroy(ctx.store.subscribe((state) => state.messages, renderNewMessages))

  ctx.onDestroy(
    ctx.store.subscribe(
      (state) => state.isOpen,
      (isOpen) => {
        if (isOpen) {
          scheduleScroll()
        }
      }
    )
  )

  ctx.onDestroy(
    ctx.store.subscribe(
      (state) => state.escalation2State,
      () => {
        scheduleScroll()
      }
    )
  )

  return chat
}
