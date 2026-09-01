<template>
  <router-link to="/dashboard" class="lg:hidden">
    <ZetooLogo variant="full" :width="130" />
  </router-link>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ZetooLogo from '@/components/common/ZetooLogo.vue'
</script>
