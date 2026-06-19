export const CONVERSATION_LIST_TYPE = {
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  TEAM_UNASSIGNED: 'team_unassigned',
  VIEW: 'view',
  ALL: 'all',
  MENTIONED: 'mentioned'
}

export const CONVERSATION_DEFAULT_STATUSES = {
  OPEN: 'Открыт',
  SNOOZED: 'Отложен',
  RESOLVED: 'Обработан',
  CLOSED: 'Закрыт',
  ESCALATION: 'Эскалация',
  HANDLED: 'Обработан',
  CONTACT_COLLECT: 'ЗапросКонтактов'
}

export const CONVERSATION_DEFAULT_STATUSES_LIST = Object.values(CONVERSATION_DEFAULT_STATUSES)

// Источник диалога определяется по каналу инбокса: виджет = livechat, канал связи = email/telegram.
export const INBOX_SOURCE = { WIDGET: 'widget', CHANNEL: 'channel' }

// Вкладки инбокса. key совпадает с параметром роута :type.
// status: '' = любой статус; source: null = любой источник.
export const INBOX_TABS = [
  {
    key: 'all',
    labelKey: 'globals.messages.all',
    label: 'Все',
    icon: 'List',
    status: '',
    source: null
  },
  {
    key: 'active-channel',
    label: 'Активные (мессенджеры)',
    icon: 'Mail',
    status: CONVERSATION_DEFAULT_STATUSES.OPEN,
    source: INBOX_SOURCE.CHANNEL
  },
  {
    key: 'active-widget',
    label: 'Активные (чат-бот)',
    icon: 'MessageCircle',
    status: CONVERSATION_DEFAULT_STATUSES.OPEN,
    source: INBOX_SOURCE.WIDGET
  },
  {
    key: 'escalated',
    label: 'Эскалированные',
    icon: 'TriangleAlert',
    status: CONVERSATION_DEFAULT_STATUSES.ESCALATION,
    source: null
  },
  {
    key: 'completed',
    label: 'Завершенные',
    icon: 'CircleCheck',
    status: CONVERSATION_DEFAULT_STATUSES.CLOSED,
    source: null
  },
  {
    key: 'processed',
    label: 'Отработанные',
    icon: 'BadgeCheck',
    status: CONVERSATION_DEFAULT_STATUSES.HANDLED,
    source: null
  }
]

export const INBOX_TABS_BY_KEY = Object.fromEntries(INBOX_TABS.map((t) => [t.key, t]))

export const MACRO_CONTEXT = {
  REPLY: 'reply',
  NEW_CONVERSATION: 'new-conversation'
}

export const TAG_ACTION = {
  ADD: 'add_tags',
  SET: 'set_tags',
  REMOVE: 'remove_tags'
}
