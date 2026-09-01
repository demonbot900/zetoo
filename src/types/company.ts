export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'

export type PlanId = 'starter' | 'team' | 'business'

export type MemberRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export type MemberStatus = 'active' | 'invited' | 'inactive'

export interface Company {
  id: string
  name: string
  slug: string
  industry: string
  size: CompanySize
  website: string
  /** Data URL or path. Empty string renders the generated monogram instead. */
  logo: string
  addressLine: string
  city: string
  postalCode: string
  country: string
  vatId: string
  timezone: string
  /** ISO weekday numbers, 1 = Monday. */
  workDays: number[]
  hoursPerDay: number
  plan: PlanId
  createdAt: string
}

export interface MemberProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  department: string
  role: MemberRole
  status: MemberStatus
  /** Image URL. Empty string falls back to initials on `accent`. */
  avatar: string
  /** Hex colour used for the initials avatar. */
  accent: string
  phone: string
  location: string
  timezone: string
  bio: string
  skills: string[]
  /** Hours this person can commit to a two-week sprint. */
  capacityHours: number
  startedAt: string
  links: {
    linkedin: string
    github: string
    x: string
    website: string
  }
}

export interface Invite {
  id: string
  email: string
  role: MemberRole
  jobTitle: string
  sentAt: string
}

export interface RegistrationDraft {
  company: Omit<Company, 'id' | 'createdAt'>
  owner: {
    firstName: string
    lastName: string
    email: string
    password: string
    jobTitle: string
    phone: string
    timezone: string
  }
  invites: Invite[]
  boardTemplate: string
  acceptedTerms: boolean
}
