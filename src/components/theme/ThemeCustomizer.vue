<template>
  <ZDrawer
    :open="isCustomizerOpen"
    title="Customise"
    subtitle="Colours, fonts, spacing and shape — saved to this browser."
    size="lg"
    :tabs="tabs"
    :active-tab="activeTab"
    @update:active-tab="activeTab = $event"
    @close="close"
  >
    <template #icon>
      <ZetooLogo variant="icon" :width="20" />
    </template>

    <div class="flex flex-col gap-6">
      <ThemePreview v-if="activeTab === 'style'" />
      <ThemeControls :sections="sectionsForTab" />
    </div>

    <template #footer>
      <button type="button" class="zt-btn-ghost py-2.5" @click="reset">Reset</button>
      <router-link to="/settings/appearance" class="zt-btn-primary py-2.5" @click="close">
        Open appearance settings
      </router-link>
    </template>
  </ZDrawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ZDrawer from '@/components/ui/ZDrawer.vue'
import ZetooLogo from '@/components/common/ZetooLogo.vue'
import ThemeControls from './ThemeControls.vue'
import ThemePreview from './ThemePreview.vue'
import { useCustomizer } from '@/composables/useCustomizer'
import { useAppearance } from '@/composables/useAppearance'

const { isCustomizerOpen, close } = useCustomizer()
const { reset } = useAppearance()

const activeTab = ref('style')

const tabs = [
  { id: 'style', label: 'Style' },
  { id: 'type', label: 'Typography' },
  { id: 'layout', label: 'Layout' },
  { id: 'board', label: 'Board' },
]

const sectionsForTab = computed(
  () =>
    ({
      style: ['presets', 'colors'],
      type: ['typography'],
      layout: ['layout'],
      board: ['board', 'actions'],
    })[activeTab.value] as ('presets' | 'colors' | 'typography' | 'layout' | 'board' | 'actions')[],
)
</script>
