<template>
  <FullScreenLayout>
    <div class="bg-white font-outfit dark:bg-gray-900">
      <LandingHeader />

      <!-- Hero -->
      <section class="relative overflow-hidden pt-32 pb-16 sm:pt-40 lg:pb-24">
        <div
          class="pointer-events-none absolute inset-x-0 -top-40 -z-1 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(70,95,255,0.16),rgba(70,95,255,0))]"
        ></div>
        <div
          class="pointer-events-none absolute right-0 top-0 -z-1 w-full max-w-[450px] opacity-60"
        >
          <img src="/images/shape/grid-01.svg" alt="" />
        </div>

        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-4xl text-center">
            <h1
              class="mt-6 font-merriweather font-bold text-gray-900 text-title-sm dark:text-white/90 sm:text-title-lg lg:text-title-2xl"
            >
              Plan the sprint, track the hours,
              <span class="text-brand-500 dark:text-brand-400">ship on the date</span>
              you promised
            </h1>

            <p class="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-500 dark:text-gray-400">
              Zetoo is issue tracking with time planning built in. Board, backlog, timeline and
              burndown share one estimate, so capacity problems surface while you can still fix
              them.
            </p>

            <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <router-link
                to="/dashboard"
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 sm:w-auto"
              >
                Open the board
                <svg class="stroke-current" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M7.29 5l5.21 5.208-5.21 5.209"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </router-link>
              <router-link
                to="/register"
                class="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05] sm:w-auto"
              >
                Create free account
              </router-link>
            </div>

          </div>

          <!-- Product preview -->
          <div class="relative mx-auto mt-16 max-w-5xl">
            <div
              class="pointer-events-none absolute -inset-x-6 -bottom-10 top-10 -z-1 rounded-3xl bg-brand-500/10 blur-2xl dark:bg-brand-500/20"
            ></div>
            <div
              class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div
                class="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]"
              >
                <span class="h-3 w-3 rounded-full bg-error-400"></span>
                <span class="h-3 w-3 rounded-full bg-orange-300"></span>
                <span class="h-3 w-3 rounded-full bg-success-400"></span>
                <span class="ml-3 text-theme-xs text-gray-400">zetoo.app/dashboard</span>
              </div>

              <div class="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
                <div
                  v-for="metric in previewMetrics"
                  :key="metric.label"
                  class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ metric.label }}</p>
                  <div class="mt-3 flex items-end justify-between">
                    <h4 class="text-title-sm font-semibold text-gray-800 dark:text-white/90">
                      {{ metric.value }}
                    </h4>
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-theme-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500"
                    >
                      {{ metric.delta }}
                    </span>
                  </div>
                </div>

                <div
                  class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2"
                >
                  <div class="flex items-center justify-between">
                    <h4 class="font-medium text-gray-800 dark:text-white/90">Sprint burndown</h4>
                    <span class="text-theme-xs text-gray-400">Hours remaining</span>
                  </div>
                  <div class="mt-6 flex h-40 items-end gap-2 sm:gap-3">
                    <div
                      v-for="(bar, index) in previewBars"
                      :key="index"
                      class="flex-1 rounded-t-md bg-brand-500/80 transition-colors hover:bg-brand-500 dark:bg-brand-500/60 dark:hover:bg-brand-500"
                      :style="{ height: bar + '%' }"
                    ></div>
                  </div>
                </div>

                <div
                  class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <h4 class="font-medium text-gray-800 dark:text-white/90">Workload</h4>
                  <ul class="mt-5 flex flex-col gap-4">
                    <li v-for="channel in previewChannels" :key="channel.label">
                      <div class="flex items-center justify-between text-theme-sm">
                        <span class="text-gray-600 dark:text-gray-300">{{ channel.label }}</span>
                        <span class="text-gray-500 dark:text-gray-400">{{ channel.share }}%</span>
                      </div>
                      <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          class="h-2 rounded-full"
                          :class="channel.accent ? 'bg-success-500' : 'bg-brand-500'"
                          :style="{ width: channel.share + '%' }"
                        ></div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section id="features" class="py-20 lg:py-28">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-2xl text-center">
            <span
              class="text-theme-sm font-medium uppercase tracking-wide text-brand-500 dark:text-brand-400"
            >
              One plan, one truth
            </span>
            <h2
              class="mt-3 font-merriweather text-title-sm font-bold text-gray-900 dark:text-white/90 sm:text-title-md"
            >
              Everything a sprint needs, nothing it does not
            </h2>
            <p class="mt-4 text-base leading-7 text-gray-500 dark:text-gray-400">
              Estimates, assignees and dates are entered once. Every board, chart and report below
              reads from the same numbers.
            </p>
          </div>

          <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="feature in features"
              :key="feature.title"
              class="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-brand-300 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
            >
              <span
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/[0.12] dark:text-brand-400 dark:group-hover:bg-brand-500 dark:group-hover:text-white"
              >
                <component :is="feature.icon" class="size-6" />
              </span>
              <h3 class="mt-5 font-medium text-gray-800 dark:text-white/90">{{ feature.title }}</h3>
              <p class="mt-2 text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                {{ feature.description }}
              </p>
            </article>
          </div>
        </div>
      </section>

      <!-- Preview / split section -->
      <section
        id="preview"
        class="border-y border-gray-200 bg-gray-50 py-20 dark:border-gray-800 dark:bg-white/[0.02] lg:py-28"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span
                class="text-theme-sm font-medium uppercase tracking-wide text-brand-500 dark:text-brand-400"
              >
                Built for planning
              </span>
              <h2
                class="mt-3 font-merriweather text-title-sm font-bold text-gray-900 dark:text-white/90 sm:text-title-md"
              >
                The estimate you enter is the estimate every view uses
              </h2>
              <p class="mt-4 text-base leading-7 text-gray-500 dark:text-gray-400">
                Change an estimate on a card and the column total, the burndown, the workload bar
                and the sprint header all move with it. No second spreadsheet to reconcile.
              </p>

              <ul class="mt-8 flex flex-col gap-5">
                <li v-for="item in previewPoints" :key="item.title" class="flex gap-4">
                  <span
                    class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                  >
                    <svg class="fill-current" width="14" height="14" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M15.29 5.79a1 1 0 0 1 0 1.42l-6.5 6.5a1 1 0 0 1-1.42 0l-3-3a1 1 0 1 1 1.42-1.42l2.29 2.3 5.79-5.8a1 1 0 0 1 1.42 0Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  <div>
                    <h3 class="font-medium text-gray-800 dark:text-white/90">{{ item.title }}</h3>
                    <p class="mt-1 text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                      {{ item.description }}
                    </p>
                  </div>
                </li>
              </ul>

              <router-link
                to="/dashboard"
                class="mt-9 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
              >
                See it live
                <svg class="stroke-current" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M7.29 5l5.21 5.208-5.21 5.209"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </router-link>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div
                v-for="(shot, index) in previewShots"
                :key="shot.title"
                class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
                :class="index % 2 === 1 ? 'sm:mt-10' : ''"
              >
                <img :src="shot.image" :alt="shot.title" class="h-44 w-full object-cover" />
                <div class="p-5">
                  <h3 class="font-medium text-gray-800 dark:text-white/90">{{ shot.title }}</h3>
                  <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                    {{ shot.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials -->
      <!-- Pricing -->
      <section
        id="pricing"
        class="border-y border-gray-200 bg-gray-50 py-20 dark:border-gray-800 dark:bg-white/[0.02] lg:py-28"
      >
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-2xl text-center">
            <h2
              class="font-merriweather text-title-sm font-bold text-gray-900 dark:text-white/90 sm:text-title-md"
            >
              Pricing that scales with the team, not the seat count
            </h2>
            <p class="mt-4 text-base leading-7 text-gray-500 dark:text-gray-400">
              Every plan includes the board, backlog, timeline and time tracking.
            </p>
          </div>

          <div class="mt-14 grid gap-6 lg:grid-cols-3">
            <div
              v-for="plan in plans"
              :key="plan.name"
              class="relative flex flex-col rounded-2xl border bg-white p-8 dark:bg-white/[0.03]"
              :class="
                plan.featured
                  ? 'border-brand-500 shadow-theme-lg dark:border-brand-500'
                  : 'border-gray-200 dark:border-gray-800'
              "
            >
              <span
                v-if="plan.featured"
                class="absolute -top-3 left-8 rounded-full bg-brand-500 px-3 py-1 text-theme-xs font-medium text-white"
              >
                Most popular
              </span>

              <h3 class="font-medium text-gray-800 dark:text-white/90">{{ plan.name }}</h3>
              <p class="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">{{ plan.summary }}</p>

              <p class="mt-6 flex items-baseline gap-1">
                <span class="text-title-sm font-semibold text-gray-900 dark:text-white/90">
                  {{ plan.price }}
                </span>
                <span class="text-theme-sm text-gray-500 dark:text-gray-400">{{
                  plan.period
                }}</span>
              </p>

              <ul class="mt-7 flex flex-1 flex-col gap-3">
                <li
                  v-for="item in plan.items"
                  :key="item"
                  class="flex items-start gap-2.5 text-theme-sm text-gray-600 dark:text-gray-300"
                >
                  <svg
                    class="mt-0.5 shrink-0 fill-success-500"
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M15.29 5.79a1 1 0 0 1 0 1.42l-6.5 6.5a1 1 0 0 1-1.42 0l-3-3a1 1 0 1 1 1.42-1.42l2.29 2.3 5.79-5.8a1 1 0 0 1 1.42 0Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {{ item }}
                </li>
              </ul>

              <router-link
                :to="plan.to"
                class="mt-8 inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-sm font-medium transition-colors"
                :class="
                  plan.featured
                    ? 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                "
              >
                {{ plan.cta }}
              </router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section id="faq" class="py-20 lg:py-28">
        <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2
            class="text-center font-merriweather text-title-sm font-bold text-gray-900 dark:text-white/90 sm:text-title-md"
          >
            Questions, answered
          </h2>

          <div class="mt-12 flex flex-col gap-3">
            <div
              v-for="(faq, index) in faqs"
              :key="faq.question"
              class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                :aria-expanded="openFaq === index"
                @click="toggleFaq(index)"
              >
                <span class="font-medium text-gray-800 dark:text-white/90">{{ faq.question }}</span>
                <svg
                  class="shrink-0 stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400"
                  :class="openFaq === index ? 'rotate-180' : ''"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 7.5l5 5 5-5"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <p
                v-if="openFaq === index"
                class="px-6 pb-5 text-theme-sm leading-6 text-gray-500 dark:text-gray-400"
              >
                {{ faq.answer }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import GridIcon from '@/icons/GridIcon.vue'
import PieChartIcon from '@/icons/PieChartIcon.vue'
import TableIcon from '@/icons/TableIcon.vue'
import ListIcon from '@/icons/ListIcon.vue'
import CalenderIcon from '@/icons/CalenderIcon.vue'
import PlugInIcon from '@/icons/PlugInIcon.vue'

const previewMetrics = [
  { label: 'Sprint progress', value: '3 / 13', delta: '9 days left' },
  { label: 'Hours logged', value: '61h', delta: 'of 115h' },
  { label: 'On-time delivery', value: '92%', delta: '+4 pts' },
]

const previewBars = [100, 96, 88, 82, 74, 70, 64, 58, 52, 42, 36, 28]

const previewChannels = [
  { label: 'Diego Marín', share: 94, accent: false },
  { label: 'Priya Raman', share: 78, accent: true },
  { label: 'Noah Feldman', share: 63, accent: false },
  { label: 'Lena Bauer', share: 41, accent: false },
]

const features = [
  {
    icon: GridIcon,
    title: 'Sprint board',
    description:
      'Drag issues across To Do, In Progress, In Review and Done. Every column totals its remaining hours as you move work.',
  },
  {
    icon: ListIcon,
    title: 'Backlog planning',
    description:
      'Pull work into the next sprint and watch committed hours and story points update against team capacity.',
  },
  {
    icon: CalenderIcon,
    title: 'Timeline',
    description:
      'A day-by-day Gantt view grouped by epic, with overdue bars in red and today marked so slippage is obvious.',
  },
  {
    icon: PieChartIcon,
    title: 'Burndown and velocity',
    description:
      'Remaining hours against the ideal line, plus committed versus completed points for every closed sprint.',
  },
  {
    icon: TableIcon,
    title: 'Time tracking',
    description:
      'Log hours on any issue. Estimate versus logged shows on the card, in the table and in the accuracy report.',
  },
  {
    icon: PlugInIcon,
    title: 'Capacity and workload',
    description:
      'Per-person capacity for each sprint, with over-allocation flagged before the sprint starts rather than after.',
  },
]

const previewPoints = [
  {
    title: 'One estimate, everywhere',
    description: 'Hours entered on an issue drive the board, the burndown and capacity at once.',
  },
  {
    title: 'Capacity before commitment',
    description: 'Over-allocated people show up while the sprint is still being planned.',
  },
  {
    title: 'Dates that mean something',
    description: 'Start and due dates place the issue on the timeline and on the schedule.',
  },
]

const previewShots = [
  {
    title: 'Board',
    description: 'Four columns, hours per column.',
    image: '/images/grid-image/image-01.png',
  },
  {
    title: 'Backlog',
    description: 'Plan sprints against capacity.',
    image: '/images/grid-image/image-02.png',
  },
  {
    title: 'Timeline',
    description: 'Epics laid out day by day.',
    image: '/images/grid-image/image-03.png',
  },
  {
    title: 'Reports',
    description: 'Burndown, velocity, accuracy.',
    image: '/images/grid-image/image-04.png',
  },
]

const plans = [
  {
    name: 'Free',
    summary: 'For one team finding its rhythm.',
    price: '$0',
    period: '/forever',
    items: [
      'Up to 10 people',
      'Board, backlog and issue tracking',
      'Time logging and estimates',
      'One active sprint',
    ],
    cta: 'Start planning',
    to: '/register',
    featured: false,
  },
  {
    name: 'Team',
    summary: 'For teams that plan sprint by sprint.',
    price: '$9',
    period: '/user / month',
    items: [
      'Everything in Free',
      'Timeline, burndown and velocity',
      'Capacity and workload planning',
      'Unlimited sprints and epics',
    ],
    cta: 'Start free trial',
    to: '/register',
    featured: true,
  },
  {
    name: 'Company',
    summary: 'For several teams on one roadmap.',
    price: '$18',
    period: '/user / month',
    items: [
      'Everything in Team',
      'Cross-team timeline and dependencies',
      'Timesheet export and audit history',
      'SSO and priority support',
    ],
    cta: 'Talk to sales',
    to: '/register',
    featured: false,
  },
]

const faqs = [
  {
    question: 'How is this different from a plain issue tracker?',
    answer:
      'Estimates and logged hours are first-class. The same numbers drive the board totals, the burndown, the timeline and each person’s capacity, so planning and tracking never drift apart.',
  },
  {
    question: 'Do people have to fill in a separate timesheet?',
    answer:
      'No. Hours are logged on the issue itself from the detail panel, and the timesheet view is generated from those entries.',
  },
  {
    question: 'Can we move work between sprints mid-flight?',
    answer:
      'Yes. Drag an issue between sprints on the backlog and the committed hours, points and capacity bars update immediately.',
  },
  {
    question: 'What happens to an issue with no estimate?',
    answer:
      'It still moves through the board, but it contributes nothing to the burndown or capacity. Unestimated work is flagged in the sprint header so it does not stay invisible.',
  },
]

const openFaq = ref<number | null>(0)

const toggleFaq = (index: number) => {
  openFaq.value = openFaq.value === index ? null : index
}
</script>
