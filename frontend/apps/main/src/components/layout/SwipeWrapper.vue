<script setup>
/**
 * Renderless компонент — обрабатывает свайп-жесты для мобильного сайдбара.
 * Должен быть размещён ВНУТРИ <SidebarProvider> (не как slot-контент),
 * иначе inject() от useSidebar() не найдёт контекст.
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSidebar } from '@shared-ui/components/ui/sidebar'
import { useMediaQuery } from '@vueuse/core'
import { useRoute } from 'vue-router'

const { openMobile, setOpenMobile } = useSidebar()
const isMobile = useMediaQuery('(max-width: 768px)')
const route = useRoute()

// Закрывать сайдбар при навигации (клик по кнопке в сайдбаре)
watch(
  () => route.path,
  () => {
    if (openMobile.value) {
      setOpenMobile(false)
    }
  }
)

// px от левого края — зона начала жеста открытия
const EDGE_THRESHOLD = 32
// минимальная дистанция горизонтального свайпа
const SWIPE_MIN = 55

const startX = ref(0)
const startY = ref(0)
const axis = ref(null) // 'h' | 'v' | null

const onTouchStart = (e) => {
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
  axis.value = null
}

const onTouchMove = (e) => {
  if (axis.value) return
  const dx = Math.abs(e.touches[0].clientX - startX.value)
  const dy = Math.abs(e.touches[0].clientY - startY.value)
  if (dx > 6 || dy > 6) {
    axis.value = dx > dy ? 'h' : 'v'
  }
}

const onTouchEnd = (e) => {
  if (!isMobile.value || axis.value !== 'h') return

  const dx = e.changedTouches[0].clientX - startX.value
  const dy = Math.abs(e.changedTouches[0].clientY - startY.value)

  // Если вертикаль значительно больше — игнорируем (скролл)
  if (dy > Math.abs(dx) * 1.3) return

  if (!openMobile.value && dx > SWIPE_MIN && startX.value < EDGE_THRESHOLD) {
    setOpenMobile(true)
  } else if (openMobile.value && dx < -SWIPE_MIN) {
    setOpenMobile(false)
  }
}

onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>

<template><!-- sidebar swipe handler --></template>
