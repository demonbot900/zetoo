<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto flex min-h-screen max-w-(--breakpoint-2xl) flex-col lg:flex-row">
      <!-- Rail --------------------------------------------------------- -->
      <aside
        class="flex flex-col justify-between gap-8 border-b border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:w-[380px] lg:border-b-0 lg:border-r lg:p-8"
      >
        <div>
          <router-link to="/" class="mb-8 flex items-center">
            <ZetooLogo variant="full" :width="150" />
          </router-link>

          <h1 class="text-title-sm font-semibold text-gray-800 dark:text-white/90">
            Create your company workspace
          </h1>
          <p class="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            Five steps: company details, your admin account, branding, the team and the first board.
            It takes about two minutes.
          </p>

          <div class="mt-6">
            <div
              class="mb-2 flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400"
            >
              <span>Step {{ step + 1 }} of {{ steps.length }}</span>
              <span>{{ progress }}%</span>
            </div>
            <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                class="h-2 rounded-full bg-brand-500 transition-all duration-300"
                :style="{ width: `${progress}%` }"
              ></div>
            </div>
          </div>

          <div class="mt-6">
            <StepIndicator :steps="steps" :current="step" @go="goTo" />
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            Already have an account?
            <router-link to="/signin" class="font-medium text-brand-500 hover:text-brand-600">
              Sign in
            </router-link>
          </p>
        </div>
      </aside>

      <!-- Content ------------------------------------------------------ -->
      <main class="flex-1 p-6 lg:p-10">
        <div class="mx-auto max-w-3xl">
          <header class="mb-6">
            <h2 class="text-title-sm font-semibold text-gray-800 dark:text-white/90">
              {{ steps[step].title }}
            </h2>
            <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {{ steps[step].blurb }}
            </p>
          </header>

          <div class="zt-card p-5 sm:p-6">
            <CompanyStep v-if="step === 0" />
            <AccountStep v-else-if="step === 1" />
            <BrandingStep v-else-if="step === 2" />
            <TeamStep v-else-if="step === 3" />
            <BoardStep v-else />
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              class="zt-btn-ghost"
              :disabled="step === 0"
              :class="step === 0 ? 'invisible' : ''"
              @click="back"
            >
              Back
            </button>

            <div class="flex items-center gap-3">
              <p v-if="blockingError" class="text-theme-xs text-error-500">{{ blockingError }}</p>
              <button
                v-if="!isLastStep"
                type="button"
                class="zt-btn-primary"
                :disabled="!canContinue"
                @click="next"
              >
                Continue
              </button>
              <button
                v-else
                type="button"
                class="zt-btn-primary"
                :disabled="!canContinue"
                @click="finish"
              >
                Create workspace
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StepIndicator from '@/components/registration/StepIndicator.vue'
import ZetooLogo from '@/components/common/ZetooLogo.vue'
import CompanyStep from '@/components/registration/CompanyStep.vue'
import AccountStep from '@/components/registration/AccountStep.vue'
import BrandingStep from '@/components/registration/BrandingStep.vue'
import TeamStep from '@/components/registration/TeamStep.vue'
import BoardStep from '@/components/registration/BoardStep.vue'
import { useRegistration } from '@/composables/useRegistration'
import { useWorkspace } from '@/composables/useWorkspace'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const {
  draft,
  step,
  steps,
  progress,
  errors,
  canContinue,
  isLastStep,
  next,
  back,
  goTo,
  submit,
  reset,
} = useRegistration()
const { isRegistered } = useWorkspace()
const { claimWorkspace } = useAuth()

const registering = ref(false)
const registerError = ref('')

// A fresh visit to /register always starts at the top of the wizard.
onMounted(() => {
  if (!isRegistered.value && step.value === 0) reset()
})

const blockingError = computed(() => {
  if (registerError.value) return registerError.value
  const [first] = Object.values(errors.value)
  return first ?? ''
})

const finish = async () => {
  if (registering.value) return
  registerError.value = ''
  registering.value = true
  try {
    // Creates the company row and the session that ties this browser to it.
    // Without it the workspace sync has no tenant to write into.
    await claimWorkspace(draft.company.name, draft.owner.email, `${draft.owner.firstName} ${draft.owner.lastName}`.trim())
  } catch (error) {
    registerError.value =
      error instanceof Error ? error.message : 'Der Arbeitsbereich konnte nicht angelegt werden.'
    registering.value = false
    return
  }
  registering.value = false

  if (!submit()) return
  router.push('/dashboard')
}
</script>
