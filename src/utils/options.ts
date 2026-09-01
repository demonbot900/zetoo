import type { ZSelectOption } from '@/components/ui/ZSelect.vue'

/** Turns a plain string list into options for `ZSelect`. */
export const toOptions = (values: readonly string[]): ZSelectOption[] =>
  values.map((value) => ({ value, label: value }))

/** Turns a `Record<value, label>` map — as used for statuses — into options. */
export const recordToOptions = (record: Record<string, string>): ZSelectOption[] =>
  Object.entries(record).map(([value, label]) => ({ value, label }))
