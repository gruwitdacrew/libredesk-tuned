<template>
  <nav class="fixed bottom-0 inset-x-0 z-50 flex md:hidden h-14 border-t bg-sidebar text-sidebar-foreground">
    <router-link
      :to="lastInboxPath || { name: 'inboxes' }"
      class="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
      :class="isInboxActive ? 'text-foreground' : 'text-muted-foreground'"
    >
      <Inbox class="h-5 w-5" />
      <span class="text-[10px]">{{ t('globals.terms.inbox', 2) }}</span>
    </router-link>

    <router-link
      v-if="userStore.can('contacts:read_all')"
      :to="{ name: 'contacts' }"
      class="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
      :class="isContactsActive ? 'text-foreground' : 'text-muted-foreground'"
    >
      <BookUser class="h-5 w-5" />
      <span class="text-[10px]">{{ t('globals.terms.contact', 2) }}</span>
    </router-link>

    <router-link
      v-if="userStore.hasReportTabPermissions"
      :to="{ name: 'reports' }"
      class="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
      :class="isReportsActive ? 'text-foreground' : 'text-muted-foreground'"
    >
      <FileLineChart class="h-5 w-5" />
      <span class="text-[10px]">{{ t('globals.terms.report', 2) }}</span>
    </router-link>

    <router-link
      v-if="userStore.hasAdminTabPermissions"
      :to="{ name: userStore.can('general_settings:manage') ? 'general' : 'admin' }"
      class="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
      :class="isAdminActive ? 'text-foreground' : 'text-muted-foreground'"
    >
      <Shield class="h-5 w-5" />
      <span class="text-[10px]">{{ t('globals.terms.admin') }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { Inbox, BookUser, FileLineChart, Shield } from 'lucide-vue-next'
import { useUserStore } from '@main/stores/user'

const route = useRoute()
const { t } = useI18n()
const userStore = useUserStore()
const lastInboxPath = useStorage('lastInboxPath', '')

const isInboxActive = computed(() => route.path.startsWith('/inboxes'))
const isContactsActive = computed(() => route.path.startsWith('/contacts'))
const isReportsActive = computed(() => route.path.startsWith('/reports'))
const isAdminActive = computed(() => route.path.startsWith('/admin'))
</script>
