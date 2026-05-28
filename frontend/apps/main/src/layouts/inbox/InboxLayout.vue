<template>
  <!-- Mobile: одна панель — setup / список / разговор -->
  <div v-if="isMobile" class="h-full w-full">
    <!--
      router-view рендерится ВСЕГДА (даже когда показывается список),
      чтобы InboxView.vue монтировался и запускал fetchConversationsList.
      Визуально скрываем его через "hidden" когда показываем список или setup-экран.
    -->
    <div :class="(isSearchRoute || isConversationOpen) ? 'h-full' : 'hidden'">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </div>

    <!-- Список или setup-экран когда разговор не открыт -->
    <template v-if="!isSearchRoute && !isConversationOpen">
      <!-- needsSetup реактивен: как только store заполнится — переключится на список -->
      <ConversationPlaceholder v-if="needsSetup" />
      <ConversationList v-else />
    </template>
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
// Показывать setup-экран только пока не создан первый инбокс
const needsSetup = computed(() => !inboxStore.inboxes.length)

// Persist panel sizes: [conversationList, conversationDetail]
const panelSizes = useStorage('inboxPanelSizes', [25, 75])

const onLayoutChange = (sizes) => {
  panelSizes.value = sizes
}
</script>
