<template>
  <!-- Mobile: одна панель — setup / список / разговор -->
  <div v-if="isMobile" class="h-full w-full">
    <template v-if="!isSearchRoute && !isConversationOpen">
      <!-- ConversationPlaceholder сам показывает спиннер пока грузит данные -->
      <!-- needsSetup реактивен: как только store заполнится — переключится на список -->
      <ConversationPlaceholder v-if="needsSetup" />
      <ConversationList v-else />
    </template>
    <router-view v-else v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </div>

  <!-- Desktop: две resizable-панели -->
  <ResizablePanelGroup
    v-else-if="!isSearchRoute"
    direction="horizontal"
    class="h-screen w-full"
    @layout="onLayoutChange"
  >
    <!-- Conversation List Panel -->
    <ResizablePanel
      :default-size="panelSizes[0]"
      :min-size="20"
      :max-size="45"
    >
      <ConversationList />
    </ResizablePanel>

    <ResizableHandle />

    <!-- Conversation Detail Panel -->
    <ResizablePanel :default-size="panelSizes[1]" :min-size="30">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </ResizablePanel>
  </ResizablePanelGroup>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage, useMediaQuery } from '@vueuse/core'
import ConversationList from '@/features/conversation/list/ConversationList.vue'
import ConversationPlaceholder from '@/features/conversation/ConversationPlaceholder.vue'
import { useInboxStore } from '@/stores/inbox'
import { useUsersStore } from '@/stores/users'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@shared-ui/components/ui/resizable'

const route = useRoute()
const isMobile = useMediaQuery('(max-width: 768px)')
const isSearchRoute = computed(() => route.name === 'search')
const isConversationOpen = computed(() => !!route.params.uuid)

const inboxStore = useInboxStore()
const usersStore = useUsersStore()
// Показывать setup-экран пока не настроен первый инбокс или не приглашён агент
const needsSetup = computed(() => !inboxStore.inboxes.length || !usersStore.users.length)

// Persist panel sizes: [conversationList, conversationDetail]
const panelSizes = useStorage('inboxPanelSizes', [25, 75])

const onLayoutChange = (sizes) => {
  panelSizes.value = sizes
}
</script>
