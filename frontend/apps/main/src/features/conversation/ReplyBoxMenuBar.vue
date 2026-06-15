<template>
  <div
    class="flex justify-between h-14 relative"
    :class="{ 'items-end': isFullscreen, 'items-center': !isFullscreen }"
  >
    <!-- Emoji picker teleported to body so it isn't clipped by any overflow:hidden ancestor
         (e.g. Dialog, form). Position is computed from the emoji button's bounding rect. -->
    <Teleport to="body">
      <EmojiPicker
        ref="emojiPickerRef"
        :native="true"
        @select="onSelectEmoji"
        :style="pickerStyle"
        class="fixed z-[200]"
        v-if="false"
      />
    </Teleport>

    <div class="flex justify-items-start gap-2">
      <!-- File inputs -->
      <input type="file" class="hidden" ref="attachmentInput" multiple @change="handleFileUpload" />

      <!-- Editor buttons -->
      <Toggle
        class="px-2 py-2 border-0"
        variant="outline"
        @click="triggerFileUpload"
        :pressed="false"
      >
        <Paperclip class="h-4 w-4" />
      </Toggle>
    </div>

    <Button
      class="h-8 w-full px-8"
      @click="handleSend"
      :disabled="!enableSend"
      :isLoading="isSending"
      v-if="showSendButton"
    >
      {{ $t('globals.messages.send') }}
    </Button>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { onClickOutside, useMediaQuery } from '@vueuse/core'
import { Button } from '@shared-ui/components/ui/button'
import { Toggle } from '@shared-ui/components/ui/toggle'
import { Paperclip } from 'lucide-vue-next'

const EmojiPicker = defineAsyncComponent(async () => {
  const [mod] = await Promise.all([import('vue3-emoji-picker'), import('vue3-emoji-picker/css')])
  return mod.default
})

const attachmentInput = ref(null)
const isEmojiPickerVisible = ref(false)
const emojiPickerRef = ref(null)
const emojiToggleWrapperRef = ref(null)
const emit = defineEmits(['emojiSelect'])

const isMobile = useMediaQuery('(max-width: 768px)')
watch(isMobile, (m) => {
  if (m) isEmojiPickerVisible.value = false
})

// Using defineProps for props that don't need two-way binding
defineProps({
  isFullscreen: Boolean,
  isSending: Boolean,
  enableSend: Boolean,
  handleSend: Function,
  showSendButton: {
    type: Boolean,
    default: true
  },
  handleFileUpload: Function,
  handleInlineImageUpload: Function
})

// Compute fixed position for the teleported picker based on the emoji button's bounding rect.
// vue3-emoji-picker is ~350px wide; clamp left so it never overflows the right screen edge.
const pickerStyle = computed(() => {
  const el = emojiToggleWrapperRef.value
  if (!el || !isEmojiPickerVisible.value) return {}
  const rect = el.getBoundingClientRect()
  const pickerWidth = 360
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - pickerWidth - 8))
  return {
    bottom: `${window.innerHeight - rect.top + 8}px`,
    left: `${left}px`
  }
})

// Close picker when clicking outside; ignore clicks on the toggle button itself
// (otherwise the click-outside fires before the toggle, instantly re-closing).
onClickOutside(
  emojiPickerRef,
  () => {
    isEmojiPickerVisible.value = false
  },
  { ignore: [emojiToggleWrapperRef] }
)

const triggerFileUpload = () => {
  if (attachmentInput.value) {
    // Clear the value to allow the same file to be uploaded again.
    attachmentInput.value.value = ''
    attachmentInput.value.click()
  }
}

const toggleEmojiPicker = () => {
  isEmojiPickerVisible.value = !isEmojiPickerVisible.value
}

function onSelectEmoji(emoji) {
  emit('emojiSelect', emoji.i)
}
</script>
