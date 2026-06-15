<template>
  <LoadingOverlay :loading="isLoading" reserve-height>
    <div class="flex justify-between mb-5">
      <div></div>
      <router-link :to="{ name: 'new-inbox' }">
        <Button>{{ $t('inbox.newInbox') }}</Button>
      </router-link>
    </div>

    <!-- Mobile: card list -->
    <div v-if="isMobile" class="space-y-3">
      <div v-if="isLoading" class="text-center text-sm text-muted-foreground py-8">
        {{ $t('globals.terms.loading') }}
      </div>
      <div
        v-else-if="!data.length"
        class="flex flex-col items-center gap-2 py-12 text-muted-foreground"
      >
        <Ghost class="h-8 w-8 opacity-50" />
        <p class="text-sm">{{ $t('globals.messages.noResultsFound') }}</p>
      </div>
      <div
        v-for="inbox in data"
        :key="inbox.id"
        class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
      >
        <div class="flex flex-col gap-1 min-w-0">
          <router-link
            :to="{ name: 'edit-inbox', params: { id: inbox.id } }"
            class="text-sm font-medium text-primary hover:underline truncate"
            >{{ inbox.name }}</router-link
          >
          <div class="flex items-center gap-2 mt-0.5">
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              :class="getChannelStyle(inbox.channel).badge"
            >
              {{ inbox.channel }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
              :class="
                inbox.enabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              "
            >
              {{ inbox.enabled ? $t('globals.messages.enable') : $t('globals.messages.disable') }}
            </span>
          </div>
        </div>
        <InboxDataTableDropDown
          :inbox="inbox"
          @editInbox="handleEditInbox"
          @deleteInbox="handleDeleteInbox"
          @toggleInbox="handleToggleInbox"
        />
      </div>
    </div>

    <!-- Desktop: data table -->
    <div v-else>
      <DataTable :columns="columns" :data="data" :loading="isLoading" />
    </div>
  </LoadingOverlay>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { h } from 'vue'
import { RouterLink } from 'vue-router'
import { Ghost } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import InboxDataTableDropDown from '@main/features/admin/inbox/InboxDataTableDropDown.vue'
import { handleHTTPError } from '@shared-ui/utils/http.js'
import { Button } from '@shared-ui/components/ui/button'
import DataTable from '@main/components/datatable/DataTable.vue'
import { EMITTER_EVENTS } from '@main/constants/emitterEvents.js'
import { useEmitter } from '@main/composables/useEmitter'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import LoadingOverlay from '@main/components/layout/LoadingOverlay.vue'
import { useInboxStore } from '@main/stores/inbox'
import { getChannelStyle } from '@main/utils/channel'
import api from '@main/api'

const isMobile = useMediaQuery('(max-width: 768px)')

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const emitter = useEmitter()
const inboxStore = useInboxStore()
const isLoading = ref(false)
const data = ref([])

onMounted(async () => {
  // Handle OAuth callback messages
  const errorCode = route.query.error
  const successCode = route.query.success

  if (errorCode) {
    let msg
    if (errorCode === 'oauth_denied') {
      msg = t('toast.authorizationDenied')
    } else if (errorCode === 'inbox_already_exists') {
      msg = t('inbox.oauthAlreadyExists')
    } else if (errorCode === 'inbox_not_found') {
      msg = t('inbox.oauthNotFound')
    } else if (errorCode === 'email_mismatch') {
      msg = t('inbox.oauthEmailMismatch')
    } else {
      msg = t('toast.errorConnectingInbox')
    }
    setTimeout(() => {
      emitter.emit(EMITTER_EVENTS.SHOW_TOAST, {
        variant: 'destructive',
        description: msg
      })
    }, 500)
  } else if (successCode) {
    const msg =
      successCode === 'oauth_reconnected' ? t('toast.inboxReconnected') : t('toast.inboxConnected')
    setTimeout(() => {
      emitter.emit(EMITTER_EVENTS.SHOW_TOAST, { description: msg })
    }, 500)
  }

  await getInboxes()
})

const getInboxes = async () => {
  try {
    isLoading.value = true
    await inboxStore.fetchInboxes(true)
    data.value = inboxStore.inboxes
  } catch (error) {
    emitter.emit(EMITTER_EVENTS.SHOW_TOAST, {
      variant: 'destructive',
      description: handleHTTPError(error).message
    })
  } finally {
    isLoading.value = false
  }
}

// Columns for the data table
const columns = [
  {
    accessorKey: 'name',
    header: function () {
      return h('div', { class: 'text-center' }, t('globals.terms.name'))
    },
    cell: function ({ row }) {
      return h(
        'div',
        { class: 'text-center' },
        h(
          RouterLink,
          {
            to: { name: 'edit-inbox', params: { id: row.original.id } },
            class: 'text-primary hover:underline'
          },
          () => row.getValue('name')
        )
      )
    }
  },
  {
    accessorKey: 'channel',
    header: function () {
      return h('div', { class: 'text-center' }, t('globals.terms.channel'))
    },
    cell: function ({ row }) {
      const channel = row.getValue('channel')
      return h(
        'div',
        { class: 'text-center' },
        h(
          'span',
          {
            class: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getChannelStyle(channel).badge}`
          },
          channel
        )
      )
    }
  },
  {
    accessorKey: 'enabled',
    header: () => h('div', { class: 'text-center' }, t('globals.terms.enabled')),
    cell: ({ row }) => {
      const enabled = row.getValue('enabled')
      return h('div', { class: 'text-center' }, enabled ? 'Yes' : 'No')
    }
  },
  {
    accessorKey: 'created_at',
    header: function () {
      return h('div', { class: 'text-center' }, t('globals.terms.createdAt'))
    },
    cell: function ({ row }) {
      return h('div', { class: 'text-center' }, format(row.getValue('created_at'), 'PPpp'))
    }
  },
  {
    accessorKey: 'updated_at',
    header: function () {
      return h('div', { class: 'text-center' }, t('globals.terms.updatedAt'))
    },
    cell: function ({ row }) {
      return h(
        'div',
        { class: 'text-center' },
        format(row.getValue('updated_at'), 'PPpp', { locale: ru })
      )
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => {
      const inbox = row.original
      return h(
        'div',
        { class: 'relative' },
        h(InboxDataTableDropDown, {
          inbox,
          onEditInbox: (id) => handleEditInbox(id),
          onDeleteInbox: (id) => handleDeleteInbox(id),
          onToggleInbox: (id) => handleToggleInbox(id)
        })
      )
    }
  }
]

const handleEditInbox = (id) => {
  router.push({ path: `/admin/inboxes/${id}/edit` })
}

const handleDeleteInbox = async (id) => {
  await api.deleteInbox(id)
  getInboxes()
}

const handleToggleInbox = async (id) => {
  await api.toggleInbox(id)
  getInboxes()
}
</script>
