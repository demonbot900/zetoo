<template>
  <ThemeProvider>
    <SidebarProvider>
      <RouterView />
      <ThemeCustomizer />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import ThemeCustomizer from './components/theme/ThemeCustomizer.vue'
</script>
