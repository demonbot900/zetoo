<template>
  <div
    v-if="isMobileOpen"
    class="fixed inset-0 z-9999 bg-gray-900/45 backdrop-blur-[3px] lg:hidden"
    @click="toggleMobileSidebar"
  ></div>
</template>

<script setup lang="ts">
import { useSidebar } from '@/composables/useSidebar'
const { toggleMobileSidebar, isMobileOpen } = useSidebar()
</script>
