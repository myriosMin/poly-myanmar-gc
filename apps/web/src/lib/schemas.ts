import { z } from 'zod'
import {
  collabTypes,
  polytechnics,
  publicProfileFields,
  studentStatuses,
} from '@/lib/domain'

export const onboardingSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  polytechnic: z.enum(polytechnics),
  course: z.string().min(2, 'Add your course'),
  graduationYear: z.string().min(4, 'Add your graduation year'),
  linkedinUrl: z.url('Use a valid LinkedIn URL'),
  githubUrl: z.string().url('Use a valid GitHub URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Use a valid portfolio URL').optional().or(z.literal('')),
  skills: z.string().min(2, 'Add at least one skill'),
  hobbies: z.string().min(2, 'Add at least one hobby'),
  openToCollab: z.boolean().default(true),
  jobSeeking: z.boolean().default(false),
  statusBadge: z.enum(studentStatuses),
})

export const resourceSubmissionSchema = z.object({
  title: z.string().min(4, 'Add a title'),
  url: z.url('Use a valid resource URL'),
  description: z.string().min(12, 'Add a short description'),
  categoryInput: z.string().optional().default(''),
})

export const collabCreateSchema = z.object({
  title: z.string().min(4, 'Add a project title'),
  type: z.enum(collabTypes),
  description: z.string().min(16, 'Describe the project'),
  neededRoles: z.string().min(2, 'List the roles'),
  neededSkills: z.string().min(2, 'List the skills'),
  deadline: z.string().min(4, 'Add a deadline'),
  teamSize: z.coerce.number().min(2).max(20),
  contactLink: z.url('Use a valid contact link'),
})

export const settingsSchema = z.object({
  name: z.string().min(2),
  linkedinUrl: z.url(),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  statusBadge: z.enum(studentStatuses),
  openToCollab: z.boolean(),
  jobSeeking: z.boolean(),
  publicFields: z.array(z.enum(publicProfileFields)).min(1),
})

export type OnboardingForm = z.input<typeof onboardingSchema>
export type ResourceSubmissionForm = z.input<typeof resourceSubmissionSchema>
export type CollabCreateForm = z.input<typeof collabCreateSchema>
export type SettingsForm = z.input<typeof settingsSchema>
