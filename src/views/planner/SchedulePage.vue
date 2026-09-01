<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Schedule" />

    <div class="flex flex-col gap-6">
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-theme-sm text-gray-500 dark:text-gray-400">
          Every scheduled issue by due date. Drag an issue to move its deadline.
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <span
            v-for="legend in legends"
            :key="legend.label"
            class="inline-flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300"
          >
            <span class="h-2.5 w-2.5 rounded-full" :class="legend.color"></span>
            {{ legend.label }}
          </span>
        </div>
      </div>

      <div
        class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5"
      >
        <div class="custom-calendar">
          <FullCalendar :options="calendarOptions" />
        </div>
      </div>
    </div>

    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, EventClickArg, EventDropArg } from '@fullcalendar/core'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import { today, toISODate, usePlanner } from '@/composables/usePlanner'
import type { Issue } from '@/types/planner'

const { issues, memberById, selectIssue, updateIssue } = usePlanner()

const legends = [
  { label: 'Done', color: 'bg-success-500' },
  { label: 'In progress', color: 'bg-brand-500' },
  { label: 'Overdue', color: 'bg-error-500' },
  { label: 'Planned', color: 'bg-gray-400' },
]

const colorFor = (issue: Issue) => {
  if (issue.status === 'done') return '#12B76A'
  if (issue.dueDate !== null && issue.dueDate < today) return '#F04438'
  if (issue.status === 'in_progress') return '#465FFF'
  return '#98A2B3'
}

const events = computed(() =>
  issues
    .filter((issue) => issue.dueDate !== null)
    .map((issue) => ({
      id: issue.id,
      title: `${issue.id} · ${issue.title}`,
      start: issue.startDate ?? issue.dueDate!,
      // FullCalendar treats all-day end dates as exclusive.
      end: nextDay(issue.dueDate!),
      allDay: true,
      backgroundColor: colorFor(issue),
      borderColor: colorFor(issue),
      textColor: '#ffffff',
      extendedProps: {
        assignee: memberById(issue.assigneeId)?.name ?? 'Unassigned',
      },
    })),
)

function nextDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  parsed.setDate(parsed.getDate() + 1)
  return toISODate(parsed)
}

const onEventClick = (info: EventClickArg) => {
  selectIssue(info.event.id)
}

const onEventDrop = (info: EventDropArg) => {
  const issue = issues.find((item) => item.id === info.event.id)
  if (!issue || !info.event.start) return

  const newStart = toISODate(info.event.start)
  const span = issue.startDate && issue.dueDate ? daysApart(issue.startDate, issue.dueDate) : 0
  updateIssue(issue.id, {
    startDate: newStart,
    dueDate: shift(newStart, span),
  })
}

function daysApart(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000,
  )
}

function shift(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00`)
  parsed.setDate(parsed.getDate() + days)
  return toISODate(parsed)
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek',
  },
  height: 'auto',
  editable: true,
  dayMaxEvents: 4,
  events: events.value,
  eventClick: onEventClick,
  eventDrop: onEventDrop,
}))
</script>
