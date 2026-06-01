import { createUIActions } from '@actions'
import { createStore } from '@store'
import { createLauncher } from '@parts'
import type { WidgetContext, WidgetStore, LibredeskConfig } from '@types'

import { createPanel } from './ui/panel/panel'
import { stylesheet } from './ui/stylesheet'
import { hideElement, showElement } from '@utils'
import { createLibredeskApi } from './core/api/libredesk'
import { createLibredeskWs } from './core/ws/libredesk.ws'
import type { LibredeskWs } from './core/ws/libredesk.ws'
import { createChatActions } from './core/actions/chat.actions'
import type { ChatActions } from './core/actions/chat.actions'
import greetMessage from './core/static/greetMessage'

const resolveConfig = (): LibredeskConfig => {
  const params = new URLSearchParams(window.location.search)
  const global = (window as { WebChatConfig?: LibredeskConfig }).WebChatConfig
  return {
    baseUrl: global?.baseUrl ?? '',
    inboxId: params.get('inbox_id') ?? global?.inboxId ?? ''
  }
}

export class WebChat extends HTMLElement {
  private shadow: ShadowRoot
  private subscribersList = new Set<() => void>()
  private ws: LibredeskWs | null = null

  private store = createStore<WidgetStore>({
    botStatus: 'escalated',
    messages: [
      greetMessage,
      {
        id: 'test-answer',
        content:
          'Для инженеров бурения доступно несколько курсов в Томском политехе.\n\n' +
          '**1. Технологии геонавигации и MLWD**\n' +
          '* **Длительность:** 5 рабочих дней (40 акад. часов)\n' +
          '* **Стоимость:** 75 000 руб. без НДС\n' +
          '* **Сайт:** [Технологии геонавигации и MLWD](https://hw.tpu.ru/courses/mldw/)',
        type: 'plain',
        author: 'bot',
        timestamp: Date.now()
      },
      {
        id: 'test-csat-like',
        content: 'Был ли мой ответ полезен? Ваша оценка поможет мне стать лучше.',
        type: 'escalation_2',
        author: 'bot',
        timestamp: Date.now(),
      },
    ],
    escalation2State: "select_channel",
    isOpen: false,
    sessionToken: null,
    conversationUuid: null,
    isInitializing: false,
    isAwaitingReply: false
  })

  private ctx: WidgetContext = {
    store: this.store,
    onDestroy: (fn) => this.subscribersList.add(fn)
  }

  public constructor() {
    super()

    this.shadow = this.attachShadow({ mode: 'closed' })
  }

  public connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [stylesheet]

    // LibreDesk integration
    const config = resolveConfig()
    const api = createLibredeskApi(config)
    const chatActions: ChatActions = createChatActions(this.ctx.store, api)
    const {
      receiveMessage,
      setBotTyping,
      setBotThinking,
      setBotLongThinking,
      setBotError,
      setBotEscalated,
      initOnLoad
    }: ChatActions = chatActions

    this.ws = createLibredeskWs(config, {
      onNewMessage: receiveMessage,
      onTyping: (_uuid, isTyping) => {
        setBotTyping(isTyping)
      },
      onThinking: (_uuid, isThinking) => {
        setBotThinking(isThinking)
      },
      onLongThinking: (_uuid, isThinking) => {
        setBotLongThinking(isThinking)
      },
      onError: (_uuid, isError) => {
        setBotError(isError)
      },
      onEscalated: () => {
        setBotEscalated(true)
      },
      onClosed: () => {
        setBotEscalated(true)
      }
    })

    this.ctx.onDestroy(
      this.ctx.store.subscribe(
        (s) => s.sessionToken,
        (token) => {
          if (token !== null) {
            this.ws?.init(token)
          } else {
            this.ws?.close()
          }
        }
      )
    )

    // UI
    const uiActions = createUIActions(this.ctx.store)

    //launcher
    const launcher = createLauncher(() => {
      uiActions.toggleChat(true)
    })

    //panel
    const panel = createPanel(
      this.ctx,
      () => {
        uiActions.toggleChat(false)
      },
      (text) => {
        void chatActions.sendMessage(text)
      },
      () => {
        chatActions.resetSession()
        void chatActions.initOnLoad()
      },
      {
        onChannelSelect: (ch) => {
          chatActions.selectEscalation2Channel(ch)
        },
        onCsatRate: (uuid, rating) => {
          chatActions.rateCsat(uuid, rating)
        },
        onCsatReason: (uuid, rating, reason) =>
          chatActions.submitCsatReason(uuid, rating, reason)
      }
    )

    this.ctx.onDestroy(
      this.ctx.store.subscribe(
        (state) => state.isOpen,
        (isOpen) => {
          if (isOpen) {
            hideElement(launcher)
            showElement(panel)
          } else {
            hideElement(panel)
            showElement(launcher)
          }
        }
      )
    )

    this.shadow.append(launcher, panel)

    //initial
    const initial = this.ctx.store.getStore()

    if (initial.isOpen) {
      launcher.classList.add('is-hidden')
      launcher.style.display = 'none'
    } else {
      panel.classList.add('is-hidden')
      panel.style.display = 'none'
    }

    void initOnLoad()
  }

  public disconnectedCallback(): void {
    this.ws?.close()
    this.ws = null

    for (const subscriber of this.subscribersList) {
      subscriber()
    }

    this.subscribersList.clear()
  }
}
