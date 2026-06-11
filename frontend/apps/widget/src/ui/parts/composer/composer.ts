import type { WidgetContext } from '@types'
import { el, iconLabelButton } from '@utils'
import { CHANNELS, isChannel } from '../../../core/static/channels'

const MAX_LENGTH = 4000
const WARN_THRESHOLD = MAX_LENGTH * 0.95
const VISIBLE_THRESHOLD = MAX_LENGTH * 0.8

const DEFAULT_PLACEHOLDER = 'Напишите сообщение...'
const SELECT_CHANNEL = 'Выберите способ связи'

export const createComposer = (
  ctx: WidgetContext,
  onSend: (text: string) => void,
  onReset: () => void
): HTMLElement => {
  const textarea = el('textarea', {
    className: 'composer__input',
    attrs: { 'aria-label': 'Введите сообщение' }
  })
  textarea.placeholder = DEFAULT_PLACEHOLDER
  textarea.maxLength = MAX_LENGTH

  const counter = el('span', { className: 'composer__counter', attrs: { 'aria-live': 'polite' } })

  const updateCounter = (): void => {
    const len = textarea.value.length
    counter.textContent = `${String(len)} / ${String(MAX_LENGTH)}`
    counter.classList.toggle('composer__counter--visible', len >= VISIBLE_THRESHOLD)
    counter.classList.toggle('composer__counter--warn', len >= WARN_THRESHOLD)
    buttonSend.disabled = len === 0
  }

  const handleSend = (): void => {
    const text = textarea.value.trim()
    if (text.length === 0) {
      return
    }
    onSend(text)
    textarea.value = ''
    textarea.focus()
    updateCounter()
  }

  const buttonSend = iconLabelButton({
    className: 'composer__send',
    icon: 'send',
    ariaLabel: 'Отправить сообщение',
    onClick: () => {
      handleSend()
    }
  }) as HTMLButtonElement
  buttonSend.disabled = true

  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  })
  textarea.addEventListener('input', updateCounter)

  const composer = el('form', { className: 'composer' }, [textarea, buttonSend])

  /** «Диалог завершен» — показывается вместо ввода, когда диалог закрыт. */
  const doneText = el('p', { className: 'composer__done-text is-hidden', text: 'Диалог завершен' })

  /**
   * Кнопка перезапуска видна и в завершённом диалоге (под текстом), и на шаге выбора
   * канала escalation_2 — тогда поднимается над заблокированным вводом (модификатор --top).
   */
  const restartBtn = iconLabelButton({
    className: 'composer__restart is-hidden',
    icon: 'addNew',
    label: 'Начать новый диалог',
    onClick: onReset
  }) as HTMLButtonElement

  const setLocked = (locked: boolean): void => {
    textarea.disabled = locked
    if (locked) {
      buttonSend.disabled = true
    } else {
      updateCounter()
    }
  }

  const sync = (): void => {
    const s = ctx.store.getStore()
    const completed = s.botStatus === 'escalated' && s.escalation2State === null
    const selectingChannel = s.escalation2State === 'select_channel'

    composer.classList.toggle('is-hidden', completed)
    counter.classList.toggle('is-hidden', completed)
    doneText.classList.toggle('is-hidden', !completed)
    restartBtn.classList.toggle('is-hidden', !(completed || selectingChannel))
    restartBtn.classList.toggle('composer__restart--top', selectingChannel)

    const channel = s.escalation2State
    const isSelectChannel = s.botStatus === 'escalated' && selectingChannel
    const defaultPlaceHolder = isSelectChannel ? SELECT_CHANNEL : DEFAULT_PLACEHOLDER

    textarea.placeholder = isChannel(channel) ? CHANNELS[channel].placeholder : defaultPlaceHolder

    setLocked(selectingChannel)
  }

  sync()
  ctx.onDestroy(
    ctx.store.subscribe(
      (s) => s,
      () => {
        sync()
      }
    )
  )

  return el('div', { className: 'composer__wrapper' }, [composer, counter, doneText, restartBtn])
}
