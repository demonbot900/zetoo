import { computed, reactive, ref } from 'vue'
import type { RegistrationDraft } from '@/types/company'
import {
  createInvite,
  emptyRegistrationDraft,
  isEmail,
  scorePassword,
  slugify,
  useWorkspace,
} from '@/composables/useWorkspace'
import { usePlanner } from '@/composables/usePlanner'

export interface WizardStep {
  id: string
  title: string
  blurb: string
}

export const wizardSteps: WizardStep[] = [
  { id: 'company', title: 'Company', blurb: 'Legal name, industry and working week.' },
  { id: 'account', title: 'Admin account', blurb: 'The first user, and workspace owner.' },
  { id: 'branding', title: 'Branding', blurb: 'Colours, fonts and the overall feel.' },
  { id: 'team', title: 'Team', blurb: 'Invite the people who will plan with you.' },
  { id: 'board', title: 'First board', blurb: 'Pick a workflow and go.' },
]

const draft = reactive<RegistrationDraft>(emptyRegistrationDraft())
const step = ref(0)
const submitted = ref(false)
/** Kept outside the draft: it is only ever compared, never stored. */
const confirmPassword = ref('')

export function useRegistration() {
  const { registerCompany } = useWorkspace()
  const { applyBoardTemplate, createBoard } = usePlanner()

  const errors = computed<Record<string, string>>(() => {
    const found: Record<string, string> = {}

    if (step.value === 0) {
      if (draft.company.name.trim().length < 2) found.name = 'Enter the company name.'
      if (!draft.company.slug) found.slug = 'A workspace URL is required.'
      if (draft.company.website && !/^https?:\/\/.+\..+/.test(draft.company.website)) {
        found.website = 'Use a full URL, e.g. https://example.com'
      }
      if (draft.company.workDays.length === 0) found.workDays = 'Pick at least one working day.'
    }

    if (step.value === 1) {
      if (!draft.owner.firstName.trim()) found.firstName = 'First name is required.'
      if (!draft.owner.lastName.trim()) found.lastName = 'Last name is required.'
      if (!isEmail(draft.owner.email)) found.email = 'Enter a valid work email.'
      if (scorePassword(draft.owner.password).score < 3) {
        found.password = 'Use at least 10 characters with mixed case, a number and a symbol.'
      }
      if (confirmPassword.value !== draft.owner.password) {
        found.confirmPassword = 'The two passwords do not match.'
      }
    }

    if (step.value === 4) {
      if (!draft.acceptedTerms) found.terms = 'Accept the terms to finish.'
    }

    return found
  })

  const canContinue = computed(() => Object.keys(errors.value).length === 0)

  const isLastStep = computed(() => step.value === wizardSteps.length - 1)

  const progress = computed(() => Math.round(((step.value + 1) / wizardSteps.length) * 100))

  const setName = (value: string) => {
    draft.company.name = value
    // The slug follows the name until the user edits it by hand.
    if (!draft.company.slug || draft.company.slug === slugify(draft.company.name.slice(0, -1))) {
      draft.company.slug = slugify(value)
    }
  }

  const toggleWorkDay = (day: number) => {
    const index = draft.company.workDays.indexOf(day)
    if (index === -1) draft.company.workDays.push(day)
    else draft.company.workDays.splice(index, 1)
    draft.company.workDays.sort()
  }

  const addInvite = (
    email: string,
    role: RegistrationDraft['invites'][number]['role'],
    jobTitle = '',
  ) => {
    if (!isEmail(email)) return false
    if (draft.invites.some((invite) => invite.email.toLowerCase() === email.toLowerCase()))
      return false
    draft.invites.push(createInvite({ email: email.trim(), role, jobTitle }))
    return true
  }

  const removeInvite = (id: string) => {
    const index = draft.invites.findIndex((invite) => invite.id === id)
    if (index !== -1) draft.invites.splice(index, 1)
  }

  const next = () => {
    if (!canContinue.value) return
    step.value = Math.min(step.value + 1, wizardSteps.length - 1)
  }

  const back = () => {
    step.value = Math.max(step.value - 1, 0)
  }

  const goTo = (index: number) => {
    if (index <= step.value) step.value = index
  }

  const reset = () => {
    Object.assign(draft, emptyRegistrationDraft())
    confirmPassword.value = ''
    step.value = 0
    submitted.value = false
  }

  /** Creates the workspace, lays out the first board and opens a sprint. */
  const submit = (): boolean => {
    if (!canContinue.value) return false
    registerCompany(draft)
    // Boards come first: columns, sprints and issues all hang off one, and
    // `createBoard` already opens the board's first sprint.
    createBoard({ name: draft.company.name || 'Erstes Board', client: draft.company.name })
    applyBoardTemplate(draft.boardTemplate, { keepIssues: false })
    submitted.value = true
    return true
  }

  return {
    draft,
    confirmPassword,
    step,
    steps: wizardSteps,
    errors,
    canContinue,
    isLastStep,
    progress,
    submitted,
    setName,
    toggleWorkDay,
    addInvite,
    removeInvite,
    next,
    back,
    goTo,
    reset,
    submit,
  }
}
