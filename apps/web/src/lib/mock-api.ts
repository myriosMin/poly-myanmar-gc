import {
  approvalStates,
  moderationActions,
  rsvpStatuses,
  reviewObjectTypes,
  roles,
} from '@poly-myanmar-gc/contracts'
import {
  collabTypes,
  eventKinds,
  polytechnics,
  resourceCategories,
  studentStatuses,
  type AdminQueueItem,
  type CollabCreateInput,
  type CollabProject,
  type DirectoryProfile,
  type EventItem,
  type OnboardingInput,
  type ProfileFilters,
  type ResourceItem,
  type ResourceSubmissionInput,
  type Session,
} from '@/lib/domain'

const pause = async (ms = 180) => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms))
}

const clone = <T,>(value: T): T => structuredClone(value)

const ensureStrings = (value: string[]) =>
  value.map((item) => item.trim()).filter(Boolean)

let session: Session = {
  id: 'me-001',
  name: 'Min Thu',
  email: 'min.thu@gmail.com',
  role: 'reviewer',
  approvalState: 'approved',
  polytechnic: 'SP',
  linkedinUrl: 'https://linkedin.com/in/min-thu',
  githubUrl: 'https://github.com/minthu',
  portfolioUrl: 'https://minthu.dev',
  statusBadge: 'mentor',
  openToCollab: true,
  jobSeeking: false,
}

const profiles: DirectoryProfile[] = [
  {
    id: 'profile-1',
    name: 'Nilar Htet',
    polytechnic: 'NP',
    course: 'Diploma in Business Informatics',
    graduationYear: 2026,
    skills: ['Product Design', 'Figma', 'Research'],
    hobbies: ['reading', 'matcha', 'journaling'],
    portfolioUrl: 'https://nilar.dev',
    linkedinUrl: 'https://linkedin.com/in/nilarhtet',
    gmail: 'nilar.htet@gmail.com',
    statusBadge: 'current student',
    openToCollab: true,
    attendingEvents: true,
    jobSeeking: true,
    badges: ['current student', 'looking for job'],
    githubUrl: 'https://github.com/nilarhtet',
  },
  {
    id: 'profile-2',
    name: 'Aung Min',
    polytechnic: 'SP',
    course: 'Diploma in Information Technology',
    graduationYear: 2024,
    skills: ['React', 'FastAPI', 'Supabase'],
    hobbies: ['open source', 'badminton'],
    portfolioUrl: 'https://aungmin.dev',
    linkedinUrl: 'https://linkedin.com/in/aungmin',
    gmail: 'aungmin@gmail.com',
    statusBadge: 'employed',
    openToCollab: true,
    attendingEvents: false,
    jobSeeking: false,
    badges: ['employed', 'mentor'],
    githubUrl: 'https://github.com/aungmin',
  },
  {
    id: 'profile-3',
    name: 'Thiri Zin',
    polytechnic: 'TP',
    course: 'Diploma in Cybersecurity',
    graduationYear: 2025,
    skills: ['Security', 'Cloud', 'Python'],
    hobbies: ['cafe hopping', 'capture the flag'],
    linkedinUrl: 'https://linkedin.com/in/thirizin',
    gmail: 'thiri.zin@gmail.com',
    statusBadge: 'graduate',
    openToCollab: false,
    attendingEvents: true,
    jobSeeking: true,
    badges: ['graduate', 'looking for job'],
  },
  {
    id: 'profile-4',
    name: 'Ko Zeyar',
    polytechnic: 'NYP',
    course: 'Diploma in Data Science',
    graduationYear: 2023,
    skills: ['SQL', 'Analytics', 'Data Viz'],
    hobbies: ['coffee', 'volleyball'],
    portfolioUrl: 'https://zeyar.io',
    linkedinUrl: 'https://linkedin.com/in/kozeyar',
    gmail: 'ko.zeyar@gmail.com',
    statusBadge: 'mentor',
    openToCollab: true,
    attendingEvents: false,
    jobSeeking: false,
    badges: ['mentor', 'employed'],
    githubUrl: 'https://github.com/kozeyar',
  },
]

let events: EventItem[] = [
  {
    id: 'event-1',
    title: 'Singapore Career Fair Warm-Up',
    kind: 'career fair',
    description:
      'A small meetup before the career fair to compare booths, prep questions, and coordinate travel.',
    location: 'NUS Shaw Foundation Alumni House',
    startsAt: '2026-04-02T10:00:00+08:00',
    endsAt: '2026-04-02T12:30:00+08:00',
    source: 'Admin',
    attendees: ['Nilar Htet', 'Aung Min'],
    myRsvp: 'going',
    capacity: 18,
  },
  {
    id: 'event-2',
    title: 'Poly Myanmar Hack Night',
    kind: 'hackathon',
    description:
      'Project matching and team formation for students who want to join hackathons together.',
    location: 'One-North Co-working Space',
    startsAt: '2026-04-09T18:30:00+08:00',
    endsAt: '2026-04-09T21:30:00+08:00',
    source: 'Worker draft',
    attendees: ['Thiri Zin'],
    myRsvp: 'interested',
    capacity: 24,
  },
  {
    id: 'event-3',
    title: 'Grad Resume Clinic',
    kind: 'tech talk',
    description:
      'Review resumes, LinkedIn profiles, and internship applications in pairs.',
    location: 'Zoom / hybrid',
    startsAt: '2026-04-14T19:00:00+08:00',
    endsAt: '2026-04-14T20:15:00+08:00',
    source: 'Admin',
    attendees: ['Ko Zeyar', 'Min Thu'],
    myRsvp: 'not_going',
    capacity: 50,
  },
]

let resources: ResourceItem[] = [
  {
    id: 'resource-1',
    title: 'SP internship tracker for 2026',
    url: 'https://example.com/sp-internships',
    description: 'A clean list of local internships and application deadlines.',
    categories: ['Internships', 'Resume'],
    submittedBy: 'Aung Min',
    status: 'approved',
    createdAt: '2026-03-22T10:30:00+08:00',
  },
  {
    id: 'resource-2',
    title: 'Interview prep notes for fresh grads',
    url: 'https://example.com/interview-notes',
    description: 'Question bank plus practice prompts for technical interviews.',
    categories: ['Interview Prep', 'Coursework'],
    submittedBy: 'Nilar Htet',
    status: 'approved',
    createdAt: '2026-03-23T09:00:00+08:00',
  },
]

let resourceSubmissions: ResourceItem[] = []

let collabs: CollabProject[] = [
  {
    id: 'collab-1',
    title: 'Campus Career Compass',
    type: 'project',
    description:
      'A lightweight site to map career fair booths, transport, and team meetups.',
    neededRoles: ['Frontend', 'Design', 'Research'],
    neededSkills: ['React', 'UI Thinking', 'Content'],
    deadline: '2026-04-20',
    teamSize: 5,
    contactLink: 'https://linkedin.com/in/minthu',
    createdBy: 'Min Thu',
    status: 'open',
    members: ['Min Thu', 'Aung Min'],
  },
  {
    id: 'collab-2',
    title: 'Poly Myanmar Open Source Sprint',
    type: 'open source',
    description:
      'Short open source sprint for students who want to ship a repo together.',
    neededRoles: ['Backend', 'QA', 'Docs'],
    neededSkills: ['FastAPI', 'Git', 'Testing'],
    deadline: '2026-04-11',
    teamSize: 8,
    contactLink: 'https://github.com/',
    createdBy: 'Ko Zeyar',
    status: 'open',
    members: ['Ko Zeyar', 'Thiri Zin'],
  },
]

let adminQueue: AdminQueueItem[] = [
  {
    id: 'queue-1',
    type: 'user_application',
    title: 'Nilar Htet',
    summary: 'NP student. LinkedIn verified. Wants access to events and collab.',
    submittedBy: 'nilar.htet@gmail.com',
    createdAt: '2026-03-24T08:45:00+08:00',
    actions: ['approve', 'reject'],
  },
  {
    id: 'queue-2',
    type: 'resource_submission',
    title: 'Hackathon prep checklist',
    summary: 'Categories: Hackathons, Interview Prep.',
    submittedBy: 'Thiri Zin',
    createdAt: '2026-03-24T09:30:00+08:00',
    actions: ['approve', 'reject'],
  },
  {
    id: 'queue-3',
    type: 'draft_event',
    title: 'Career Fair Ride Share',
    summary: 'Draft sourced from SG event listings. Needs manual confirmation.',
    submittedBy: 'Worker',
    createdAt: '2026-03-24T10:15:00+08:00',
    actions: ['approve', 'reject'],
  },
  {
    id: 'queue-4',
    type: 'collab_flag',
    title: 'Suspicious collab link',
    summary: 'A recent project listing has a shortened URL that should be checked.',
    submittedBy: 'System',
    createdAt: '2026-03-24T11:00:00+08:00',
    actions: ['dismiss_flag', 'ban'],
  },
]

const listMeta = {
  roles,
  approvalStates,
  reviewObjectTypes,
  moderationActions,
  rsvpStatuses,
}

function filterProfiles(filters: ProfileFilters) {
  return profiles.filter((profile) => {
    const polytechnicMatch =
      !filters.polytechnic || profile.polytechnic === filters.polytechnic
    const courseMatch =
      !filters.course ||
      profile.course.toLowerCase().includes(filters.course.toLowerCase())
    const yearMatch =
      !filters.graduationYear ||
      String(profile.graduationYear) === filters.graduationYear
    const statusMatch = !filters.status || profile.statusBadge === filters.status
    const collabMatch =
      !filters.openToCollab || profile.openToCollab === filters.openToCollab
    const jobMatch = !filters.jobSeeking || profile.jobSeeking === filters.jobSeeking
    const search = filters.search.trim().toLowerCase()
    const searchMatch =
      !search ||
      profile.name.toLowerCase().includes(search) ||
      profile.skills.some((skill) => skill.toLowerCase().includes(search))

    return (
      polytechnicMatch &&
      courseMatch &&
      yearMatch &&
      statusMatch &&
      collabMatch &&
      jobMatch &&
      searchMatch
    )
  })
}

export const mockApi = {
  meta: listMeta,

  async getSession() {
    await pause()
    return clone(session)
  },

  async submitOnboarding(input: OnboardingInput) {
    await pause()
    session = {
      ...session,
      name: input.name,
      polytechnic: input.polytechnic,
      approvalState: 'pending',
      linkedinUrl: input.linkedinUrl,
      githubUrl: input.githubUrl || undefined,
      portfolioUrl: input.portfolioUrl || undefined,
      statusBadge: input.statusBadge,
      openToCollab: input.openToCollab,
      jobSeeking: input.jobSeeking,
    }

    adminQueue = [
      {
        id: `queue-${Date.now()}`,
        type: 'user_application',
        title: input.name,
        summary: `${input.polytechnic} verified via LinkedIn. Waiting on reviewer approval.`,
        submittedBy: input.linkedinUrl,
        createdAt: new Date().toISOString(),
        actions: ['approve', 'reject'],
      },
      ...adminQueue.filter((item) => item.type !== 'user_application'),
    ]

    return clone(session)
  },

  async simulateApproval() {
    await pause()
    session = { ...session, approvalState: 'approved' }
    adminQueue = adminQueue.filter((item) => item.type !== 'user_application')
    return clone(session)
  },

  async getProfiles(filters: ProfileFilters) {
    await pause()
    const items = filterProfiles(filters)
    return {
      items: clone(items),
      total: items.length,
      counts: {
        polytechnics: polytechnics.map((polytechnic) => ({
          value: polytechnic,
          count: profiles.filter((profile) => profile.polytechnic === polytechnic)
            .length,
        })),
        statuses: studentStatuses.map((status) => ({
          value: status,
          count: profiles.filter((profile) => profile.statusBadge === status).length,
        })),
      },
    }
  },

  async getProfileById(id: string) {
    await pause()
    return clone(profiles.find((profile) => profile.id === id) ?? null)
  },

  async getEvents() {
    await pause()
    return {
      items: clone(events),
      total: events.length,
      kinds: eventKinds.map((kind) => ({
        value: kind,
        count: events.filter((event) => event.kind === kind).length,
      })),
    }
  },

  async setRsvp(eventId: string, status: (typeof rsvpStatuses)[number]) {
    await pause()
    events = events.map((event) => {
      if (event.id !== eventId) {
        return event
      }

      const attendeeSet = new Set(event.attendees)
      if (status === 'going' || status === 'interested') {
        attendeeSet.add(session.name)
      } else {
        attendeeSet.delete(session.name)
      }

      return {
        ...event,
        myRsvp: status,
        attendees: [...attendeeSet],
      }
    })

    return clone(events.find((event) => event.id === eventId) ?? null)
  },

  async getResources() {
    await pause()
    return {
      items: clone(resources),
      submissions: clone(resourceSubmissions),
      categories: resourceCategories.map((category) => ({
        value: category,
        count: resources.filter((resource) =>
          resource.categories.includes(category),
        ).length,
      })),
    }
  },

  async submitResource(input: ResourceSubmissionInput) {
    await pause()
    const submission: ResourceItem = {
      id: `resource-submission-${Date.now()}`,
      title: input.title,
      url: input.url,
      description: input.description,
      categories: input.categories,
      submittedBy: session.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    resourceSubmissions = [submission, ...resourceSubmissions]
    adminQueue = [
      {
        id: submission.id,
        type: 'resource_submission',
        title: submission.title,
        summary: submission.categories.join(', '),
        submittedBy: submission.submittedBy,
        createdAt: submission.createdAt,
        actions: ['approve', 'reject'],
      },
      ...adminQueue.filter((item) => item.type !== 'resource_submission'),
    ]

    return clone(submission)
  },

  async getCollabProjects() {
    await pause()
    return {
      items: clone(collabs),
      total: collabs.length,
      types: collabTypes.map((type) => ({
        value: type,
        count: collabs.filter((project) => project.type === type).length,
      })),
    }
  },

  async createCollabProject(input: CollabCreateInput) {
    await pause()
    const project: CollabProject = {
      id: `collab-${Date.now()}`,
      title: input.title,
      type: input.type,
      description: input.description,
      neededRoles: ensureStrings(input.neededRoles.split(',')),
      neededSkills: ensureStrings(input.neededSkills.split(',')),
      deadline: input.deadline,
      teamSize: Number(input.teamSize),
      contactLink: input.contactLink,
      createdBy: session.name,
      status: 'open',
      members: [session.name],
    }

    collabs = [project, ...collabs]
    return clone(project)
  },

  async joinCollab(id: string) {
    await pause()
    collabs = collabs.map((project) => {
      if (project.id !== id) {
        return project
      }

      const members = new Set(project.members)
      members.add(session.name)
      return {
        ...project,
        members: [...members],
      }
    })

    return clone(collabs.find((project) => project.id === id) ?? null)
  },

  async leaveCollab(id: string) {
    await pause()
    collabs = collabs.map((project) => {
      if (project.id !== id) {
        return project
      }

      return {
        ...project,
        members: project.members.filter((member) => member !== session.name),
      }
    })

    return clone(collabs.find((project) => project.id === id) ?? null)
  },

  async getAdminQueue() {
    await pause()
    return {
      items: clone(adminQueue),
      totals: reviewObjectTypes.reduce(
        (acc, type) => ({
          ...acc,
          [type]: adminQueue.filter((item) => item.type === type).length,
        }),
        {} as Record<string, number>,
      ),
    }
  },

  async reviewQueueItem(id: string, action: (typeof moderationActions)[number]) {
    await pause()
    const item = adminQueue.find((queueItem) => queueItem.id === id)
    if (!item) {
      return null
    }

    if (item.type === 'user_application' && action === 'approve') {
      session = { ...session, approvalState: 'approved' }
    }

    if (item.type === 'user_application' && action === 'reject') {
      session = { ...session, approvalState: 'rejected' }
    }

    if (item.type === 'resource_submission' && action === 'approve') {
      resources = [
        {
          id: id.replace('resource-submission', 'resource'),
          title: item.title,
          url: 'https://example.com/approved-resource',
          description: item.summary,
          categories: item.summary.split(',').map((part) => part.trim()),
          submittedBy: item.submittedBy,
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
        ...resources,
      ]
      resourceSubmissions = resourceSubmissions.filter(
        (submission) => submission.id !== id,
      )
    }

    if (item.type === 'draft_event' && action === 'approve') {
      events = [
        {
          id: `event-${Date.now()}`,
          title: item.title,
          kind: 'career fair',
          description: item.summary,
          location: 'Singapore',
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          source: 'Telegram review',
          attendees: [],
          myRsvp: 'interested',
          capacity: 20,
        },
        ...events,
      ]
    }

    if (item.type === 'collab_flag' && action === 'ban') {
      session = { ...session, approvalState: 'banned' }
    }

    adminQueue = adminQueue.filter((queueItem) => queueItem.id !== id)
    return clone(item)
  },

  async getSettings() {
    await pause()
    return clone(session)
  },

  async updateSettings(update: Partial<Session>) {
    await pause()
    session = {
      ...session,
      ...update,
    }
    return clone(session)
  },
}
