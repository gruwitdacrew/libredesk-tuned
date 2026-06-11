// Per-channel presentation colors, used wherever a conversation's source
// (inbox channel) is shown: the conversation list and the admin inbox list.
// Tailwind class strings are written out in full so the JIT scanner picks
// them up (see the content globs in tailwind.config.cjs).
const CHANNEL_STYLES = {
  email: {
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  livechat: {
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
  telegram: {
    text: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
  }
}

const FALLBACK_STYLE = {
  text: 'text-muted-foreground',
  badge: 'bg-muted text-muted-foreground'
}

/**
 * Resolve the color classes for a channel.
 * @param {string} channel - Channel type (e.g. "email", "livechat", "telegram").
 * @returns {{ text: string, badge: string }} Text and badge Tailwind classes.
 */
export function getChannelStyle(channel) {
  return CHANNEL_STYLES[channel] || FALLBACK_STYLE
}
