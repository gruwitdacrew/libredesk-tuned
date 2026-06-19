import type { Channel, WidgetContext } from '@types'
import { el, iconLabelButton, lockChoice, selectChoice } from '@utils'
import { CHANNELS, CHANNEL_ORDER, isChannel } from '../../../core/static/channels'

/**
 * Пузырь escalation_2: кнопки каналов + инлайновая подсказка, которая обновляется
 * на месте при переключении канала (новое сообщение не добавляется). Начальное
 * состояние читается из стора (чтобы восстановленный/заблокированный выбор
 * отрисовался корректно), а подписка блокирует кнопки после отправки контактов.
 */
export const buildEscalation2Btns = (
  ctx: WidgetContext,
  onChannelSelect: (channel: Channel) => void
): HTMLElement => {
  const btns = el('div', { className: 'escalation-btns' })
  const prompt = el('p', { className: 'escalation2__prompt' })
  const container = el('div', { className: 'escalation2' }, [btns, prompt])

  const byChannel = new Map<Channel, HTMLButtonElement>()
  const all: HTMLButtonElement[] = []

  const showPrompt = (channel: Channel): void => {
    prompt.textContent = CHANNELS[channel].prompt
    prompt.classList.add('escalation2__prompt--visible')
  }

  for (const channel of CHANNEL_ORDER) {
    const meta = CHANNELS[channel]

    const button = iconLabelButton({
      className: `escalation-btns__btn escalation-btns__btn--${meta.mod}`,
      icon: meta.icon,
      label: meta.label,
      onClick: () => {
        selectChoice(all, button)
        showPrompt(channel)
        onChannelSelect(channel)
      }
    }) as HTMLButtonElement
    byChannel.set(channel, button)
    all.push(button)
    btns.append(button)
  }

  const initial = ctx.store.getStore()

  if (isChannel(initial.escalation2State)) {
    const button = byChannel.get(initial.escalation2State)
    if (button !== undefined) {
      selectChoice(all, button)
      showPrompt(initial.escalation2State)
    }
  }
  if (initial.escalationContactsSent) {
    lockChoice(all)
  }

  ctx.onDestroy(
    ctx.store.subscribe(
      (s) => s.escalationContactsSent,
      (sent) => {
        if (container.isConnected && sent) {
          lockChoice(all)
        }
      }
    )
  )

  return container
}
