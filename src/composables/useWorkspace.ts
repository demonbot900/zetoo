import { computed, reactive, ref, watch } from 'vue'
import type {
  Company,
  CompanySize,
  Invite,
  MemberProfile,
  MemberRole,
  PlanId,
  RegistrationDraft,
} from '@/types/company'
import { colorFromString } from '@/utils/color'
import { load as syncLoad, save as syncSave } from '@/utils/sync'

const STORAGE_KEY = 'zetoo.workspace.v1'

/* ------------------------------------------------------------------ *
 * Reference data used by the registration wizard and settings screens
 * ------------------------------------------------------------------ */

export const industries = [
  'Software & SaaS',
  'Agency & Consulting',
  'E-commerce & Retail',
  'Finance & Insurance',
  'Healthcare',
  'Manufacturing',
  'Education',
  'Media & Entertainment',
  'Logistics',
  'Non-profit',
  'Other',
]

export const companySizes: { value: CompanySize; label: string; hint: string }[] = [
  { value: '1-10', label: '1–10', hint: 'Founding team' },
  { value: '11-50', label: '11–50', hint: 'Growing company' },
  { value: '51-200', label: '51–200', hint: 'Scale-up' },
  { value: '201-1000', label: '201–1000', hint: 'Mid-market' },
  { value: '1000+', label: '1000+', hint: 'Enterprise' },
]

export const plans: { id: PlanId; name: string; price: string; blurb: string; perks: string[] }[] =
  [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      blurb: 'Up to 5 people, one board.',
      perks: ['1 board', 'Backlog & sprints', 'Basic reports'],
    },
    {
      id: 'team',
      name: 'Team',
      price: '€9 / person / month',
      blurb: 'Unlimited boards and time tracking.',
      perks: ['Unlimited boards', 'Time tracking', 'Capacity planning', 'Custom theming'],
    },
    {
      id: 'business',
      name: 'Business',
      price: '€19 / person / month',
      blurb: 'Governance, SSO and audit trails.',
      perks: ['Everything in Team', 'SSO & SCIM', 'Audit log', 'Priority support'],
    },
  ]

export const memberRoles: { value: MemberRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full control, billing included.' },
  { value: 'admin', label: 'Admin', description: 'Manage members, boards and settings.' },
  { value: 'manager', label: 'Manager', description: 'Plan sprints and assign work.' },
  { value: 'member', label: 'Member', description: 'Work on issues and log time.' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to boards.' },
]

export const timezones = [
  'Europe/Berlin',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Warsaw',
  'Europe/Helsinki',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]

export const countries = [
  'Germany',
  'Austria',
  'Switzerland',
  'Netherlands',
  'France',
  'Spain',
  'Italy',
  'Poland',
  'Sweden',
  'United Kingdom',
  'Ireland',
  'United States',
  'Canada',
  'Brazil',
  'India',
  'Singapore',
  'Australia',
  'Other',
]

export const departments = [
  'Product',
  'Engineering',
  'Design',
  'Quality',
  'Marketing',
  'Sales',
  'Operations',
  'Support',
  'Finance',
  'People',
]

/* ------------------------------------------------------------------ *
 * Validation helpers — shared by the wizard and the member forms
 * ------------------------------------------------------------------ */

export const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim())

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

export interface PasswordScore {
  score: number
  label: string
  hints: string[]
}

export const scorePassword = (value: string): PasswordScore => {
  const hints: string[] = []
  let score = 0

  if (value.length >= 10) score += 1
  else hints.push('at least 10 characters')

  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  else hints.push('upper and lower case')

  if (/\d/.test(value)) score += 1
  else hints.push('a number')

  if (/[^A-Za-z0-9]/.test(value)) score += 1
  else hints.push('a symbol')

  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent']
  return { score, label: labels[score], hints }
}

export const initialsOf = (member: Pick<MemberProfile, 'firstName' | 'lastName'>): string =>
  `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase() || '?'

export const fullName = (member: Pick<MemberProfile, 'firstName' | 'lastName'>): string =>
  `${member.firstName} ${member.lastName}`.trim()

export const guessTimezone = (): string => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timezones.includes(zone) ? zone : 'UTC'
  } catch {
    return 'UTC'
  }
}

const uid = (prefix: string): string =>
  `${prefix}${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

interface WorkspaceState {
  company: Company | null
  members: MemberProfile[]
  invites: Invite[]
  currentUserId: string | null
}

const state = reactive<WorkspaceState>({
  company: null,
  members: [],
  invites: [],
  currentUserId: null,
})

/** Bumped whenever the workspace is replaced, so other stores can react. */
export const workspaceVersion = ref(0)

const isRestoring = ref(true)
/** Set once the user edits, so a slow server response cannot overwrite them. */
let isDirty = false
/**
 * Nothing is written before the database has answered.
 *
 * A save is a whole-document replace, so a store that has not hydrated yet
 * would push its empty state over the top and delete every row. That is not
 * hypothetical: it is how a freshly opened tab wiped boards it had never
 * loaded.
 */
let hasHydrated = false

const persist = () => {
  if (isRestoring.value || !hasHydrated) return
  isDirty = true
  syncSave('workspace', STORAGE_KEY, {
    company: state.company,
    members: state.members,
    invites: state.invites,
    currentUserId: state.currentUserId,
  })
}

const apply = (parsed: WorkspaceState | null) => {
  if (!parsed?.company) return
  state.company = parsed.company
  state.members = parsed.members ?? []
  state.invites = parsed.invites ?? []
  state.currentUserId = parsed.currentUserId ?? state.members[0]?.id ?? null
}

/** Paint from the local mirror immediately, then reconcile with the database. */
const restore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) apply(JSON.parse(raw) as WorkspaceState)
  } catch {
    // Corrupt payload: fall back to an unregistered workspace.
  }
}

restore()
isRestoring.value = false

watch(() => JSON.stringify(state), persist, { deep: false })

/**
 * Resolves once the database has had its say.
 *
 * The navigation guard decides between the app and the registration wizard
 * from `isRegistered`, so it has to await this. Without it a reload always
 * redirects to registration: the guard would run while the workspace is still
 * in flight and see an empty store.
 */
export const workspaceReady: Promise<void> = syncLoad<WorkspaceState>(
  'workspace',
  STORAGE_KEY,
  (value) => !value.company,
).then((remote) => {
  if (remote && !isDirty) {
    isRestoring.value = true
    apply(remote)
    isRestoring.value = false
    // Let the planner rebuild its team from the members the database returned.
    workspaceVersion.value += 1
  }
  hasHydrated = true
})

/* ------------------------------------------------------------------ *
 * Factories
 * ------------------------------------------------------------------ */

export const emptyRegistrationDraft = (): RegistrationDraft => ({
  company: {
    name: '',
    slug: '',
    industry: industries[0],
    size: '11-50',
    website: '',
    logo: '',
    addressLine: '',
    city: '',
    postalCode: '',
    country: 'Germany',
    vatId: '',
    timezone: guessTimezone(),
    workDays: [1, 2, 3, 4, 5],
    hoursPerDay: 8,
    plan: 'team',
  },
  owner: {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    jobTitle: '',
    phone: '',
    timezone: guessTimezone(),
  },
  invites: [],
  boardTemplate: 'scrum',
  acceptedTerms: false,
})

export const createMemberProfile = (input: Partial<MemberProfile> = {}): MemberProfile => {
  const firstName = input.firstName ?? ''
  const lastName = input.lastName ?? ''
  return {
    id: input.id ?? uid('m-'),
    firstName,
    lastName,
    email: input.email ?? '',
    jobTitle: input.jobTitle ?? 'Team member',
    department: input.department ?? 'Product',
    role: input.role ?? 'member',
    status: input.status ?? 'active',
    avatar: input.avatar ?? '',
    accent: input.accent ?? colorFromString(`${firstName}${lastName}${input.email ?? ''}`),
    phone: input.phone ?? '',
    location: input.location ?? '',
    timezone: input.timezone ?? guessTimezone(),
    bio: input.bio ?? '',
    skills: input.skills ?? [],
    capacityHours: input.capacityHours ?? 60,
    startedAt: input.startedAt ?? new Date().toISOString().slice(0, 10),
    links: {
      linkedin: input.links?.linkedin ?? '',
      github: input.links?.github ?? '',
      x: input.links?.x ?? '',
      website: input.links?.website ?? '',
    },
  }
}

export const createInvite = (input: Partial<Invite> = {}): Invite => ({
  id: input.id ?? uid('i-'),
  email: input.email ?? '',
  role: input.role ?? 'member',
  jobTitle: input.jobTitle ?? '',
  sentAt: input.sentAt ?? new Date().toISOString(),
})

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export function useWorkspace() {
  const company = computed(() => state.company)
  const members = computed(() => state.members)
  const invites = computed(() => state.invites)
  const isRegistered = computed(() => state.company !== null)

  const activeMembers = computed(() => state.members.filter((m) => m.status === 'active'))

  const currentUser = computed(
    () =>
      state.members.find((member) => member.id === state.currentUserId) ?? state.members[0] ?? null,
  )

  const memberById = (id: string | null) =>
    id === null ? undefined : state.members.find((member) => member.id === id)

  const setCurrentUser = (id: string) => {
    state.currentUserId = id
    persist()
  }

  const updateCompany = (patch: Partial<Company>) => {
    if (!state.company) return
    Object.assign(state.company, patch)
    persist()
  }

  const addMember = (input: Partial<MemberProfile>): MemberProfile => {
    const member = createMemberProfile(input)
    state.members.push(member)
    persist()
    return member
  }

  const updateMember = (id: string, patch: Partial<MemberProfile>) => {
    const member = memberById(id)
    if (!member) return
    Object.assign(member, patch, {
      links: { ...member.links, ...(patch.links ?? {}) },
    })
    persist()
  }

  const removeMember = (id: string) => {
    const index = state.members.findIndex((member) => member.id === id)
    if (index === -1) return
    if (state.members[index].role === 'owner') return
    state.members.splice(index, 1)
    if (state.currentUserId === id) state.currentUserId = state.members[0]?.id ?? null
    persist()
  }

  const inviteMember = (input: Partial<Invite>): Invite => {
    const invite = createInvite(input)
    state.invites.push(invite)
    // An invited person already gets a placeholder profile so they can be
    // assigned work before they accept.
    const [firstName, ...rest] = invite.email.split('@')[0].split(/[._-]/)
    addMember({
      firstName: firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'Invited',
      lastName: rest.length ? rest.join(' ').replace(/^\w/, (c) => c.toUpperCase()) : '',
      email: invite.email,
      role: invite.role,
      jobTitle: invite.jobTitle || 'Invited member',
      status: 'invited',
    })
    persist()
    return invite
  }

  const revokeInvite = (id: string) => {
    const index = state.invites.findIndex((invite) => invite.id === id)
    if (index === -1) return
    const [invite] = state.invites.splice(index, 1)
    const member = state.members.find(
      (candidate) => candidate.email === invite.email && candidate.status === 'invited',
    )
    if (member) removeMember(member.id)
    persist()
  }

  /** Turns the wizard payload into a live workspace. */
  const registerCompany = (draft: RegistrationDraft): Company => {
    const now = new Date().toISOString()
    const company: Company = {
      ...draft.company,
      slug: draft.company.slug || slugify(draft.company.name),
      id: uid('c-'),
      createdAt: now,
    }

    const owner = createMemberProfile({
      firstName: draft.owner.firstName,
      lastName: draft.owner.lastName,
      email: draft.owner.email,
      jobTitle: draft.owner.jobTitle || 'Founder',
      department: 'Product',
      role: 'owner',
      status: 'active',
      phone: draft.owner.phone,
      timezone: draft.owner.timezone,
      location: [draft.company.city, draft.company.country].filter(Boolean).join(', '),
      capacityHours: draft.company.hoursPerDay * draft.company.workDays.length * 2,
    })

    const invited = draft.invites.filter((invite) => isEmail(invite.email))
    const invitedMembers = invited.map((invite) => {
      const handle = invite.email.split('@')[0].split(/[._-]/)
      return createMemberProfile({
        firstName: handle[0] ? handle[0].charAt(0).toUpperCase() + handle[0].slice(1) : 'Teammate',
        lastName: handle[1] ? handle[1].charAt(0).toUpperCase() + handle[1].slice(1) : '',
        email: invite.email,
        jobTitle: invite.jobTitle || 'Invited member',
        role: invite.role,
        status: 'invited',
        timezone: draft.company.timezone,
        capacityHours: draft.company.hoursPerDay * draft.company.workDays.length * 2,
      })
    })

    state.company = company
    state.members = [owner, ...invitedMembers]
    state.invites = invited
    state.currentUserId = owner.id
    isRestoring.value = false
    persist()
    workspaceVersion.value += 1

    return company
  }

  const resetWorkspace = () => {
    state.company = null
    state.members = []
    state.invites = []
    state.currentUserId = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    workspaceVersion.value += 1
  }

  return {
    // state
    company,
    members,
    activeMembers,
    invites,
    currentUser,
    isRegistered,
    workspaceVersion,
    // lookups
    memberById,
    // mutations
    setCurrentUser,
    updateCompany,
    addMember,
    updateMember,
    removeMember,
    inviteMember,
    revokeInvite,
    registerCompany,
    resetWorkspace,
  }
}
