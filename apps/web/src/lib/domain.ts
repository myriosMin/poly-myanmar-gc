import type {
  ApprovalState,
  ModerationAction,
  Role,
  RsvpStatus,
  ReviewObjectType,
} from '@poly-myanmar-gc/contracts'

export const polytechnics = ['SP', 'NP', 'NYP', 'RP', 'TP'] as const

export const studentStatuses = [
  'current student',
  'graduate',
  'looking for job',
  'employed',
  'mentor',
] as const

export const eventKinds = [
  'career fair',
  'hackathon',
  'tech talk',
  'networking',
] as const

export const resourceCategories = [
  'Internships',
  'Resume',
  'Interview Prep',
  'Hackathons',
  'Open Source',
  'Visa / Admin',
  'Scholarships',
  'Coursework',
] as const

export const collabTypes = [
  'hackathon',
  'project',
  'open source',
  'startup idea',
] as const

export type Polytechnic = (typeof polytechnics)[number]
export type StudentStatus = (typeof studentStatuses)[number]
export type EventKind = (typeof eventKinds)[number]
export type ResourceCategory = (typeof resourceCategories)[number]
export type CollabType = (typeof collabTypes)[number]
export const publicProfileFields = [
  'polytechnic',
  'course',
  'statusBadge',
  'jobSeeking',
  'linkedinUrl',
  'githubUrl',
  'portfolioUrl',
] as const
export type PublicProfileField = (typeof publicProfileFields)[number]

export interface Session {
  id: string
  name: string
  email: string
  role: Role
  approvalState: ApprovalState
  polytechnic: Polytechnic | null
  course: string | null
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  statusBadge: StudentStatus
  openToCollab: boolean
  jobSeeking: boolean
  publicFields: PublicProfileField[]
}

export interface DirectoryProfile {
  id: string
  name: string
  avatarUrl: string
  polytechnic: Polytechnic
  course: string
  graduationYear: number
  joinedAt: string
  bio: string
  skills: string[]
  hobbies: string[]
  portfolioUrl?: string
  githubUrl?: string
  linkedinUrl: string
  gmail: string
  statusBadge: StudentStatus
  openToCollab: boolean
  attendingEvents: boolean
  jobSeeking: boolean
  badges: StudentStatus[]
  eventHistory: Array<{
    id: string
    title: string
    status: 'going' | 'interested'
    date: string
  }>
  collabHistory: Array<{
    id: string
    title: string
    status: 'member' | 'interested'
    deadline?: string
  }>
}

export interface EventItem {
  id: string
  title: string
  kind: EventKind
  description: string
  location: string
  startsAt: string
  endsAt: string
  source: string
  attendees: string[]
  myRsvp: RsvpStatus
  capacity: number
  createdBy: string
}

export interface ResourceItem {
  id: string
  title: string
  url: string
  description: string
  categories: string[]
  submittedBy: string
  status: 'approved' | 'pending'
  createdAt: string
}

export interface CollabProject {
  id: string
  title: string
  type: CollabType
  description: string
  neededRoles: string[]
  neededSkills: string[]
  deadline: string
  teamSize: number
  contactLink: string
  createdBy: string
  status: 'open' | 'full'
  members: string[]
}

export interface AdminQueueItem {
  id: string
  type: ReviewObjectType
  title: string
  summary: string
  submittedBy: string
  createdAt: string
  actions: ModerationAction[]
}

export interface ProfileFilters {
  polytechnic: string
  course: string
  graduationYear: string
  status: string
  openToCollab: boolean
  jobSeeking: boolean
  search: string
}

export interface OnboardingInput {
  username: string
  email: string
  linkedinUrl: string
}

export interface ResourceSubmissionInput {
  title: string
  url: string
  description: string
  categories: string[]
}

export interface CollabCreateInput {
  title: string
  type: CollabType
  description: string
  neededRoles: string
  neededSkills: string
  deadline: string
  teamSize: number
  contactLink: string
}
