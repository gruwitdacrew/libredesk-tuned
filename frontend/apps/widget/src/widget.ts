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
        id: '123',
        content: 'adsasddsaads\ndasdsadasads',
        type: 'escalation_2',
        author: 'bot',
        timestamp: Date.now()
      }
    ],
    escalation2State: 'select_channel',
    escalationContactsSent: false,
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

    // Persist the escalation choice (channel + contacts-sent lock) so it survives
    // reloads. resetSession clears the key explicitly. Selector subscriptions only
    // fire on actual change, so this never spams localStorage.
    const persistEscalation = (): void => {
      const s = this.ctx.store.getStore()
      api.storeEscalation({ state: s.escalation2State, sent: s.escalationContactsSent })
    }
    this.ctx.onDestroy(this.ctx.store.subscribe((s) => s.escalation2State, persistEscalation))
    this.ctx.onDestroy(this.ctx.store.subscribe((s) => s.escalationContactsSent, persistEscalation))

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
          chatActions.submitCsatReason(uuid, rating, reason),
        onContactManager: () => {
          void chatActions.sendMessage('Переведите на руководителя')
        }
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

    // Toggle the escalation layout class on the panel (adds breathing room above
    // the composer). Driven here, where `panel` is in scope, so it applies on the
    // initial render too — including a reload straight into an escalated state.
    const syncEscalationClass = (): void => {
      const s = this.ctx.store.getStore()
      const escalating = s.botStatus === 'escalated' || s.escalation2State !== null
      panel.classList.toggle('panel--escalation', escalating)
    }
    syncEscalationClass()
    this.ctx.onDestroy(this.ctx.store.subscribe((s) => s.botStatus, syncEscalationClass))
    this.ctx.onDestroy(this.ctx.store.subscribe((s) => s.escalation2State, syncEscalationClass))

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
