export const roles = ['member', 'reviewer', 'superadmin'] as const

export const approvalStates = [
  'pending',
  'needs_manual_review',
  'approved',
  'rejected',
  'banned',
] as const

export const reviewObjectTypes = [
  'user_application',
  'resource_submission',
  'draft_event',
  'collab_flag',
] as const

export const moderationActions = [
  'approve',
  'reject',
  'ban',
  'remove',
  'dismiss_flag',
] as const

export const rsvpStatuses = ['going', 'interested', 'not_going'] as const

export const appRoutes = [
  '/auth',
  '/pending-approval',
  '/profiles',
  '/events',
  '/resources',
  '/collab',
  '/admin',
  '/settings',
  '/legal/privacy',
  '/legal/terms',
  '/legal/guidelines',
] as const

export type Role = (typeof roles)[number]
export type ApprovalState = (typeof approvalStates)[number]
export type ReviewObjectType = (typeof reviewObjectTypes)[number]
export type ModerationAction = (typeof moderationActions)[number]
export type RsvpStatus = (typeof rsvpStatuses)[number]
export type AppRoute = (typeof appRoutes)[number]
