import { createMessageHandlers, createUIActions } from '@actions'
import { createStore } from '@store'
import { createLauncher } from '@parts'
import type { LibredeskConfig, WidgetContext, WidgetStore } from '@types'

import { createPanel } from './ui/panel/panel'
import { stylesheet } from './ui/stylesheet'
import greetMessage from './core/static/greetMessage'
import { createChatRuntime } from './setup/chatRuntime'
import {
  wireEscalationLayout,
  wireEscalationPersistence,
  wirePanelVisibility
} from './setup/wiring'

const resolveConfig = (): LibredeskConfig => {
  const params = new URLSearchParams(window.location.search)
  const global = (window as { WebChatConfig?: LibredeskConfig }).WebChatConfig
  const config: LibredeskConfig = {
    // Пустой baseUrl → относительные запросы (тот же origin / dev-прокси). При
    // встраивании на сторонний сайт baseUrl нужно задавать через WebChatConfig.
    baseUrl: global?.baseUrl ?? '',
    inboxId: params.get('inbox_id') ?? global?.inboxId ?? ''
  }
  if (config.inboxId === '') {
    console.warn(
      '[WebChat] inboxId не задан (WebChatConfig.inboxId или ?inbox_id) — запросы/WS и ключи хранилища будут некорректны.'
    )
  }
  if (config.baseUrl === '') {
    console.warn(
      '[WebChat] baseUrl не задан (WebChatConfig.baseUrl) — используется текущий origin.'
    )
  }
  return config
}

export class WebChat extends HTMLElement {
  private shadow: ShadowRoot
  private subscribers = new Set<() => void>()

  private store = createStore<WidgetStore>({
    botStatus: 'online',
    messages: [greetMessage],
    escalation2State: null,
    escalationContactsSent: false,
    isOpen: false,
    sessionToken: null,
    conversationUuid: null,
    isInitializing: false,
    isAwaitingReply: false
  })

  private ctx: WidgetContext = {
    store: this.store,
    onDestroy: (fn) => this.subscribers.add(fn)
  }

  public constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'closed' })
  }

  public connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [stylesheet]

    const config = resolveConfig()
    const { api, chatActions } = createChatRuntime(this.ctx, config)
    wireEscalationPersistence(this.ctx, api)

    const uiActions = createUIActions(this.ctx.store)
    const launcher = createLauncher(() => {
      uiActions.toggleChat(true)
    })
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
      createMessageHandlers(chatActions)
    )

    wirePanelVisibility(this.ctx, launcher, panel)
    wireEscalationLayout(this.ctx, panel)

    this.shadow.append(launcher, panel)

    void chatActions.initOnLoad()
  }

  public disconnectedCallback(): void {
    for (const unsubscribe of this.subscribers) {
      unsubscribe()
    }
    this.subscribers.clear()
  }
}
