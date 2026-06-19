<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="h-12 flex-shrink-0 px-2 border-b flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          v-if="isMobile"
          @click="goBack"
          class="p-1 rounded hover:bg-accent"
          aria-label="Back"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <span v-if="!conversationStore.conversation.loading">
          {{ conversationStore.currentContactName }}
        </span>
        <Skeleton class="w-[130px] h-6" v-else />
      </div>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger :disabled="!isActiveChannelConversation">
            <div
              class="flex items-center space-x-1 bg-primary px-2 py-1 rounded text-sm"
              :class="isActiveChannelConversation ? 'cursor-pointer' : 'cursor-default'"
              v-if="!conversationStore.conversation.loading"
            >
              <span class="text-secondary font-medium inline-block">
                {{ conversationStore.current?.status }}
              </span>
            </div>
            <Skeleton class="w-[70px] h-6 rounded-full" v-else />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              v-for="status in statusActionOptions()"
              :key="status.value"
              @click="handleUpdateStatus(status.label)"
            >
              {{ status.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Messages & reply box -->
    <div class="flex flex-col flex-grow overflow-hidden">
      <MessageList class="flex-1 overflow-y-auto" />
      <!-- Поле ввода доступно только в «Активных (каналы связи)»: открытый диалог не из чат-бота. -->
      <ReplyBox v-if="isActiveChannelConversation" />
    </div>
  </div>
</template>

<script lang="ts" setup>
//@ts-nocheck
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { ChevronLeft } from 'lucide-vue-next'
import { useConversationStore } from '../../stores/conversation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@shared-ui/components/ui/dropdown-menu'
import MessageList from '@/features/conversation/message/MessageList.vue'
import ReplyBox from './ReplyBox.vue'
import { EMITTER_EVENTS } from '../../constants/emitterEvents.js'
import { CONVERSATION_DEFAULT_STATUSES } from '../../constants/conversation'
import { useEmitter } from '../../composables/useEmitter'
import { Skeleton } from '@shared-ui/components/ui/skeleton'

const router = useRouter()
const route = useRoute()
const isMobile = useMediaQuery('(max-width: 768px)')
const conversationStore = useConversationStore()
const emitter = useEmitter()

// «Активный (каналы связи)»: открытый диалог не из чат-бота (виджета).
// Только в этом состоянии доступны смена статуса и ответ.
const isActiveChannelConversation = computed(() => {
  const conv = conversationStore.current
  return conv?.status === CONVERSATION_DEFAULT_STATUSES.OPEN && conv?.inbox_channel !== 'livechat'
})

// Из тега активного диалога можно перевести только в «Открыт» или «Обработан».
const STATUS_ACTIONS = [CONVERSATION_DEFAULT_STATUSES.OPEN, CONVERSATION_DEFAULT_STATUSES.RESOLVED]

function statusActionOptions() {
  return STATUS_ACTIONS.map((label) =>
    conversationStore.statusOptions.find((s) => s.label === label)
  ).filter(Boolean)
}

const goBack = () => {
  if (route.params.teamID) {
    router.push({ name: 'team-inbox', params: { teamID: route.params.teamID } })
  } else if (route.params.viewID) {
    router.push({ name: 'view-inbox', params: { viewID: route.params.viewID } })
  } else if (route.params.type) {
    router.push({ name: 'inbox', params: { type: route.params.type } })
  } else {
    router.back()
  }
}

const handleUpdateStatus = (status) => {
  if (status === CONVERSATION_DEFAULT_STATUSES.SNOOZED) {
    emitter.emit(EMITTER_EVENTS.SET_NESTED_COMMAND, {
      command: 'snooze',
      open: true
    })
    return
  }
  conversationStore.updateStatus(status)
}
</script>
