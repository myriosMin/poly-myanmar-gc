import type {
  ModerationAction,
  ReviewObjectType,
  RsvpStatus,
} from "@poly-myanmar-gc/contracts";
import type {
  AdminQueueItem,
  CollabCreateInput,
  CollabProject,
  DirectoryProfile,
  EventItem,
  OnboardingInput,
  ProfileFilters,
  PublicProfileField,
  ResourceItem,
  ResourceSubmissionInput,
  Session,
} from "@/lib/domain";
import {
  collabTypes,
  defaultPublicProfileFields,
  eventKinds,
  polytechnics,
  publicProfileFields,
  studentStatuses,
} from "@/lib/domain";
import { getAccessToken, getAuthenticatedUser } from "@/lib/supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const RSVP_LOCAL_STATE = new Map<string, RsvpStatus>();
const ADMIN_ITEM_TYPES = new Map<string, ReviewObjectType>();
const FLAG_SUBJECTS = new Map<string, string>();

type ApiPage<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};

type ApiMeResponse = {
  profile: ApiProfile;
  can_access_private_app: boolean;
  pending_review_count: number;
  queue_access: boolean;
};

type ApiDeletionRequestResponse = {
  request_id: string;
  status: string;
  already_exists: boolean;
  message: string;
};

type ApiProfile = {
  id: string;
  username: string;
  email: string;
  google_subject: string | null;
  role: Session["role"];
  approval_status: Session["approvalState"];
  name: string | null;
  polytechnic: string | null;
  course: string | null;
  graduation_year: number | null;
  linkedin_url: string;
  github_url: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  hobbies: string[] | null;
  status_badges: string[] | null;
  public_preferences: string[] | null;
  open_to_collab: boolean | null;
  job_seeking: boolean | null;
  created_at: string;
};

type ApiProfileLite = {
  id: string;
  username: string;
  polytechnic: string | null;
  course: string | null;
  graduation_year: number | null;
  status_badges: string[] | null;
  open_to_collab: boolean | null;
  job_seeking: boolean | null;
  created_at: string;
  name: string | null;
};

type ApiEvent = {
  id: string;
  title: string;
  kind: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  source_url: string | null;
  origin: string;
  created_by: string;
  attendance_count: number;
  capacity: number | null;
};

type ApiResource = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  categories: string[];
  submitted_by: string;
  published_at: string;
};

type ApiResourceSubmission = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  categories: string[];
  submitted_by: string;
  status: string;
  created_at: string;
};

type ApiCollab = {
  id: string;
  title: string;
  type: string;
  description: string;
  needed_roles: string[];
  needed_skills: string[];
  deadline: string | null;
  team_size: number;
  contact_link: string;
  created_by: string;
  status: string;
  member_count: number;
};

type ApiApproval = {
  id: string;
  user_id: string;
  review_object_type: ReviewObjectType;
  status: string;
  submitted_payload: Record<string, unknown>;
  created_at: string;
};

type ApiEventDraft = {
  id: string;
  title: string;
  description: string;
  source_name: string;
  created_at: string;
};

type ApiFlag = {
  id: string;
  subject_id: string;
  subject_type: string;
  status: string;
  reason: string;
  severity: string;
  created_at: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`API ${response.status} on ${path}: ${details}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function normalizeCollabType(value: string): string {
  return value.replace(/_/g, " ");
}

function denormalizeCollabType(value: string): string {
  return value.replace(/ /g, "_");
}

function normalizeEventKind(value: string): string {
  return value.replace(/_/g, " ");
}

function normalizePublicFields(
  fields: string[] | null | undefined,
): PublicProfileField[] {
  if (!fields?.length) {
    return defaultPublicProfileFields;
  }
  const allowed = new Set<string>(publicProfileFields);
  const normalized = fields.filter((field): field is PublicProfileField =>
    allowed.has(field),
  );
  return normalized.length ? normalized : defaultPublicProfileFields;
}

function createAvatar(seed: string): string {
  const [a = "A", b = "M"] = seed
    .split(" ")
    .map((part) => part.trim().charAt(0).toUpperCase())
    .filter(Boolean);
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#caa37d" />
          <stop offset="100%" stop-color="#6f8e8f" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" rx="40" fill="url(#bg)" />
      <circle cx="160" cy="146" r="76" fill="rgba(255,255,255,0.32)" />
      <path d="M71 338c22-55 64-83 89-83s67 28 89 83" fill="rgba(255,255,255,0.32)" />
      <text x="160" y="372" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="white" fill-opacity="0.92">${a}${b}</text>
    </svg>
  `)}`;
}

function toSession(profile: ApiProfile): Session {
  const statusBadges = profile.status_badges ?? [];
  const jobSeeking = profile.job_seeking ?? false;
  const polytechnic =
    profile.polytechnic &&
    polytechnics.includes(profile.polytechnic as (typeof polytechnics)[number])
      ? (profile.polytechnic as Session["polytechnic"])
      : null;
  const statusBadge =
    (statusBadges.find((badge) =>
      studentStatuses.includes(badge as (typeof studentStatuses)[number]),
    ) as Session["statusBadge"] | undefined) ??
    (jobSeeking ? "looking for job" : "current student");

  return {
    id: profile.id,
    username: profile.username,
    name: profile.name ?? "",
    email: profile.email,
    role: profile.role,
    approvalState: profile.approval_status,
    polytechnic,
    course: profile.course,
    graduationYear: profile.graduation_year,
    linkedinUrl: profile.linkedin_url,
    githubUrl: profile.github_url ?? undefined,
    portfolioUrl: profile.portfolio_url ?? undefined,
    skills: profile.skills ?? [],
    hobbies: profile.hobbies ?? [],
    statusBadge,
    openToCollab: profile.open_to_collab ?? false,
    jobSeeking,
    publicFields: normalizePublicFields(profile.public_preferences),
  };
}

function toDirectoryProfile(profile: ApiProfile): DirectoryProfile {
  const statusBadges = profile.status_badges ?? [];
  const jobSeeking = profile.job_seeking ?? false;
  const profileName = profile.username || profile.name || "member";
  const profileCourse = profile.course ?? "Not provided yet";
  const profilePolytechnic = profile.polytechnic ?? "SP";
  const statusBadge =
    (statusBadges.find((badge) =>
      studentStatuses.includes(badge as (typeof studentStatuses)[number]),
    ) as DirectoryProfile["statusBadge"] | undefined) ??
    (jobSeeking ? "looking for job" : "current student");

  return {
    id: profile.id,
    name: profileName,
    avatarUrl: createAvatar(profileName),
    polytechnic: (polytechnics.includes(
      profilePolytechnic as (typeof polytechnics)[number],
    )
      ? profilePolytechnic
      : "SP") as DirectoryProfile["polytechnic"],
    course: profileCourse,
    graduationYear: profile.graduation_year ?? new Date().getFullYear(),
    joinedAt: profile.created_at,
    bio: `${profileCourse} member in Singapore community network.`,
    skills: profile.skills ?? [],
    hobbies: profile.hobbies ?? [],
    portfolioUrl: profile.portfolio_url ?? undefined,
    githubUrl: profile.github_url ?? undefined,
    linkedinUrl: profile.linkedin_url,
    gmail: profile.email,
    statusBadge,
    openToCollab: profile.open_to_collab ?? false,
    attendingEvents: false,
    jobSeeking,
    badges: Array.from(
      new Set([statusBadge, ...(statusBadges as DirectoryProfile["badges"])]),
    ),
    eventHistory: [],
    collabHistory: [],
  };
}

function toLiteDirectoryProfile(profile: ApiProfileLite): DirectoryProfile {
  const statusBadges = profile.status_badges ?? [];
  const jobSeeking = profile.job_seeking ?? false;
  const profileName = profile.username || profile.name || "member";
  const profileCourse = profile.course ?? "Not provided yet";
  const profilePolytechnic = profile.polytechnic ?? "SP";
  const statusBadge =
    (statusBadges.find((badge) =>
      studentStatuses.includes(badge as (typeof studentStatuses)[number]),
    ) as DirectoryProfile["statusBadge"] | undefined) ??
    (jobSeeking ? "looking for job" : "current student");

  return {
    id: profile.id,
    name: profileName,
    avatarUrl: createAvatar(profileName),
    polytechnic: (polytechnics.includes(
      profilePolytechnic as (typeof polytechnics)[number],
    )
      ? profilePolytechnic
      : "SP") as DirectoryProfile["polytechnic"],
    course: profileCourse,
    graduationYear: profile.graduation_year ?? new Date().getFullYear(),
    joinedAt: profile.created_at,
    bio: `${profileCourse} member in Singapore community network.`,
    skills: [],
    hobbies: [],
    portfolioUrl: undefined,
    githubUrl: undefined,
    linkedinUrl: "",
    gmail: "",
    statusBadge,
    openToCollab: profile.open_to_collab ?? false,
    attendingEvents: false,
    jobSeeking,
    badges: Array.from(
      new Set([statusBadge, ...(statusBadges as DirectoryProfile["badges"])]),
    ),
    eventHistory: [],
    collabHistory: [],
  };
}

function toEventItem(event: ApiEvent): EventItem & { attendanceCount: number } {
  const kind = normalizeEventKind(event.kind);
  const safeKind = eventKinds.includes(kind as (typeof eventKinds)[number])
    ? (kind as EventItem["kind"])
    : "networking";

  return {
    id: event.id,
    title: event.title,
    kind: safeKind,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at ?? event.starts_at,
    source: event.origin,
    attendees: [],
    myRsvp: RSVP_LOCAL_STATE.get(event.id) ?? "not_going",
    capacity: event.capacity ?? 0,
    createdBy: event.created_by,
    attendanceCount: event.attendance_count,
  };
}

function toResourceItem(
  resource: ApiResource | ApiResourceSubmission,
): ResourceItem {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    description: resource.description ?? "",
    categories: resource.categories,
    submittedBy: resource.submitted_by,
    status:
      "status" in resource && resource.status !== "approved"
        ? "pending"
        : "approved",
    createdAt:
      "created_at" in resource ? resource.created_at : resource.published_at,
  };
}

function toCollabProject(
  collab: ApiCollab,
): CollabProject & { memberCount: number } {
  const collabType = normalizeCollabType(collab.type);
  return {
    id: collab.id,
    title: collab.title,
    type: (collabTypes.includes(collabType as (typeof collabTypes)[number])
      ? collabType
      : "project") as CollabProject["type"],
    description: collab.description,
    neededRoles: collab.needed_roles,
    neededSkills: collab.needed_skills,
    deadline: collab.deadline ? collab.deadline.slice(0, 10) : "",
    teamSize: collab.team_size,
    contactLink: collab.contact_link,
    createdBy: collab.created_by,
    status: collab.status === "active" ? "open" : "full",
    members: [],
    memberCount: collab.member_count,
  };
}

function buildProfileQuery(filters: ProfileFilters): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.polytechnic) params.set("polytechnic", filters.polytechnic);
  if (filters.course.trim()) params.set("course", filters.course.trim());
  if (filters.graduationYear.trim())
    params.set("graduation_year", filters.graduationYear.trim());
  if (filters.openToCollab) params.set("open_to_collab", "true");
  if (filters.jobSeeking) params.set("job_seeking", "true");
  if (filters.status) params.append("status_badges", filters.status);
  return params.toString();
}

export const api = {
  async getSession(): Promise<Session | null> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    try {
      const data = await request<ApiMeResponse>("/me");
      return toSession(data.profile);
    } catch (error) {
      // Gracefully reset to anonymous when profile is missing.
      if (error instanceof Error && error.message.includes("API 404 on /me")) {
        return null;
      }
      throw error;
    }
  },

  async submitOnboarding(input: OnboardingInput): Promise<Session> {
    const authUser = await getAuthenticatedUser();
    const payload = {
      user_id: authUser.id,
      username: input.username,
      email: authUser.email,
      google_subject: authUser.id,
      name: null,
      polytechnic: null,
      course: null,
      graduation_year: null,
      linkedin_url: input.linkedinUrl,
      github_url: null,
      portfolio_url: null,
      skills: null,
      hobbies: null,
      open_to_collab: null,
      job_seeking: null,
      manual_verification_notes: null,
      manual_proof_url: null,
    };

    const profile = await request<ApiProfile>("/me/onboarding", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return toSession(profile);
  },

  async getDirectory() {
    /**
     * Fetch all approved members once as lite profiles (card fields only)
     * No filtering applied here - filtering happens entirely client-side
     */
    const page = await request<ApiPage<ApiProfileLite>>("/profiles/directory");
    const allProfiles = page.items.map(toLiteDirectoryProfile);

    // Calculate counts from ALL profiles for reference
    const countedPolytechnics = new Map<string, number>();
    const countedStatuses = new Map<string, number>();

    allProfiles.forEach((profile) => {
      countedPolytechnics.set(
        profile.polytechnic,
        (countedPolytechnics.get(profile.polytechnic) ?? 0) + 1,
      );
      countedStatuses.set(
        profile.statusBadge,
        (countedStatuses.get(profile.statusBadge) ?? 0) + 1,
      );
    });

    return {
      items: allProfiles,
      total: allProfiles.length,
      counts: {
        polytechnics: polytechnics.map((value) => ({
          value,
          count: countedPolytechnics.get(value) ?? 0,
        })),
        statuses: studentStatuses.map((value) => ({
          value,
          count: countedStatuses.get(value) ?? 0,
        })),
      },
    };
  },

  async getProfiles(filters: ProfileFilters) {
    const query = buildProfileQuery(filters);
    const page = await request<ApiPage<ApiProfile>>(
      `/profiles${query ? `?${query}` : ""}`,
    );
    const items = page.items.map(toDirectoryProfile);

    return {
      items,
      total: page.total,
      counts: {
        polytechnics: polytechnics.map((value) => ({
          value,
          count: items.filter((item) => item.polytechnic === value).length,
        })),
        statuses: studentStatuses.map((value) => ({
          value,
          count: items.filter((item) => item.statusBadge === value).length,
        })),
      },
    };
  },

  async getAdminProfiles() {
    const page = await request<ApiPage<ApiProfile>>(
      "/profiles?all=true&include_pending=true",
    );
    return page.items;
  },

  async getProfileById(id: string) {
    try {
      const profile = await request<ApiProfile>(`/profiles/${id}`);
      return toDirectoryProfile(profile);
    } catch {
      return null;
    }
  },

  async getEvents() {
    const page = await request<ApiPage<ApiEvent>>("/events");
    const items = page.items.map(toEventItem);
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
    }

    return {
      items,
      total: page.total,
      kinds: Array.from(counts.entries()).map(([value, count]) => ({
        value,
        count,
      })),
    };
  },

  async setRsvp(eventId: string, status: RsvpStatus) {
    await request(`/events/${eventId}/rsvp`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    RSVP_LOCAL_STATE.set(eventId, status);
    const refreshed = await this.getEvents();
    return refreshed.items.find((item) => item.id === eventId) ?? null;
  },

  async deleteEvent(eventId: string) {
    await request(`/events/${eventId}`, { method: "DELETE" });
  },

  async getResources() {
    const [resourcesPage, submissionsPage] = await Promise.all([
      request<ApiPage<ApiResource>>("/resources"),
      request<ApiPage<ApiResourceSubmission>>("/resources/submissions"),
    ]);
    const items = resourcesPage.items.map(toResourceItem);
    const submissions = submissionsPage.items.map(toResourceItem);
    const categoryCounts = new Map<string, number>();
    for (const item of items) {
      for (const category of item.categories) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }

    return {
      items,
      submissions,
      categories: Array.from(categoryCounts.entries()).map(
        ([value, count]) => ({ value, count }),
      ),
    };
  },

  async submitResource(input: ResourceSubmissionInput) {
    const record = await request<ApiResourceSubmission>(
      "/resources/submissions",
      {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          url: input.url,
          description: input.description,
          categories: input.categories,
        }),
      },
    );
    return toResourceItem(record);
  },

  async deleteResource(resourceId: string) {
    await request(`/resources/${resourceId}`, { method: "DELETE" });
  },

  async deleteResourceSubmission(submissionId: string) {
    await request(`/resources/submissions/${submissionId}`, {
      method: "DELETE",
    });
  },

  async getCollabProjects() {
    const page = await request<ApiPage<ApiCollab>>("/collab");
    const items = page.items.map(toCollabProject);
    const typeCounts = new Map<string, number>();
    for (const item of items) {
      typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
    }

    return {
      items,
      total: page.total,
      types: Array.from(typeCounts.entries()).map(([value, count]) => ({
        value,
        count,
      })),
    };
  },

  async createCollabProject(input: CollabCreateInput) {
    const record = await request<ApiCollab>("/collab", {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        type: denormalizeCollabType(input.type),
        description: input.description,
        needed_roles: input.neededRoles
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
        needed_skills: input.neededSkills
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
        deadline: input.deadline,
        team_size: Number(input.teamSize),
        contact_link: input.contactLink,
      }),
    });
    return toCollabProject(record);
  },

  async joinCollab(id: string) {
    await request(`/collab/${id}/join`, { method: "POST" });
    const refreshed = await this.getCollabProjects();
    return refreshed.items.find((item) => item.id === id) ?? null;
  },

  async leaveCollab(id: string) {
    await request(`/collab/${id}/leave`, { method: "POST" });
    const refreshed = await this.getCollabProjects();
    return refreshed.items.find((item) => item.id === id) ?? null;
  },

  async removeCollab(id: string) {
    await request(`/collab/${id}`, { method: "DELETE" });
  },

  async getPendingApprovals() {
    const page = await request<ApiPage<ApiApproval>>("/admin/approvals");
    return page.items;
  },

  async getPendingResourceSubmissions() {
    const page = await request<ApiPage<ApiResourceSubmission>>(
      "/admin/resources/submissions",
    );
    return page.items;
  },

  async getPendingEventDrafts() {
    const page = await request<ApiPage<ApiEventDraft>>("/admin/event-drafts");
    return page.items;
  },

  async getOpenFlags() {
    const page = await request<ApiPage<ApiFlag>>("/admin/flags");
    return page.items;
  },

  async approveUserApplication(id: string) {
    await request(`/admin/approvals/${id}/approve`, { method: "POST" });
  },

  async rejectUserApplication(id: string) {
    await request(`/admin/approvals/${id}/reject`, { method: "POST" });
  },

  async approveResourceSubmission(id: string) {
    await request(`/admin/resources/submissions/${id}/approve`, {
      method: "POST",
    });
  },

  async rejectResourceSubmission(id: string) {
    await request(`/admin/resources/submissions/${id}/reject`, {
      method: "POST",
    });
  },

  async publishEventDraft(id: string) {
    await request(`/admin/event-drafts/${id}/publish`, { method: "POST" });
  },

  async rejectEventDraft(id: string) {
    await request(`/admin/event-drafts/${id}/reject`, { method: "POST" });
  },

  async dismissFlag(id: string) {
    await request(`/admin/flags/${id}/dismiss`, { method: "POST" });
  },

  async banUser(userId: string) {
    await request(`/admin/users/${userId}/ban`, { method: "POST" });
  },

  async unbanUser(userId: string) {
    await request(`/admin/users/${userId}/unban`, { method: "POST" });
  },

  async getAdminQueue() {
    const [approvals, submissions, drafts, flags] = await Promise.all([
      request<ApiPage<ApiApproval>>("/admin/approvals"),
      request<ApiPage<ApiResourceSubmission>>("/admin/resources/submissions"),
      request<ApiPage<ApiEventDraft>>("/admin/event-drafts"),
      request<ApiPage<ApiFlag>>("/admin/flags"),
    ]);

    const items: AdminQueueItem[] = [
      ...approvals.items.map((item) => ({
        id: item.id,
        type: "user_application" as const,
        title: String(item.submitted_payload.name ?? item.user_id),
        summary: String(
          item.submitted_payload.polytechnic ?? "Pending profile review",
        ),
        submittedBy: String(item.submitted_payload.email ?? item.user_id),
        createdAt: item.created_at,
        actions: ["approve", "reject"] as ModerationAction[],
      })),
      ...submissions.items.map((item) => ({
        id: item.id,
        type: "resource_submission" as const,
        title: item.title,
        summary: item.categories.join(", "),
        submittedBy: item.submitted_by,
        createdAt: item.created_at,
        actions: ["approve", "reject"] as ModerationAction[],
      })),
      ...drafts.items.map((item) => ({
        id: item.id,
        type: "draft_event" as const,
        title: item.title,
        summary: item.description || `Worker source: ${item.source_name}`,
        submittedBy: item.source_name,
        createdAt: item.created_at,
        actions: ["approve", "reject"] as ModerationAction[],
      })),
      ...flags.items.map((item) => ({
        id: item.id,
        type: "collab_flag" as const,
        title:
          item.subject_type === "account_deletion_request"
            ? "Account deletion request"
            : `Flag (${item.severity})`,
        summary: item.reason,
        submittedBy:
          item.subject_type === "account_deletion_request"
            ? item.subject_id
            : "system",
        createdAt: item.created_at,
        actions:
          item.subject_type === "account_deletion_request"
            ? (["dismiss_flag"] as ModerationAction[])
            : (["ban"] as ModerationAction[]),
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    ADMIN_ITEM_TYPES.clear();
    FLAG_SUBJECTS.clear();
    for (const item of items) {
      ADMIN_ITEM_TYPES.set(item.id, item.type);
    }
    for (const flag of flags.items) {
      FLAG_SUBJECTS.set(flag.id, flag.subject_id);
    }

    return {
      items,
      totals: {
        user_application: approvals.total,
        resource_submission: submissions.total,
        draft_event: drafts.total,
        collab_flag: flags.total,
      },
    };
  },

  async reviewQueueItem(id: string, action: ModerationAction) {
    let type = ADMIN_ITEM_TYPES.get(id);
    if (!type) {
      await this.getAdminQueue();
      type = ADMIN_ITEM_TYPES.get(id);
    }
    if (!type) {
      return null;
    }

    if (type === "user_application") {
      const suffix = action === "approve" ? "approve" : "reject";
      return request(`/admin/approvals/${id}/${suffix}`, { method: "POST" });
    }

    if (type === "resource_submission") {
      const suffix = action === "approve" ? "approve" : "reject";
      return request(`/admin/resources/submissions/${id}/${suffix}`, {
        method: "POST",
      });
    }

    if (type === "draft_event") {
      const suffix = action === "approve" ? "publish" : "reject";
      return request(`/admin/event-drafts/${id}/${suffix}`, { method: "POST" });
    }

    if (type === "collab_flag" && action === "dismiss_flag") {
      return request(`/admin/flags/${id}/dismiss`, { method: "POST" });
    }

    if (type === "collab_flag" && action === "ban") {
      const subjectId = FLAG_SUBJECTS.get(id);
      if (!subjectId) {
        return null;
      }
      return request(`/admin/users/${subjectId}/ban`, { method: "POST" });
    }

    return null;
  },

  async getSettings() {
    const session = await this.getSession();
    if (!session) {
      throw new Error("No active session");
    }
    return session;
  },

  async updateSettings(update: Partial<Session>) {
    const payload: Record<string, unknown> = {};
    if (update.name !== undefined) payload.name = update.name;
    if (update.polytechnic !== undefined)
      payload.polytechnic = update.polytechnic;
    if (update.course !== undefined) payload.course = update.course;
    if (update.graduationYear !== undefined)
      payload.graduation_year = update.graduationYear;
    if (update.linkedinUrl !== undefined)
      payload.linkedin_url = update.linkedinUrl;
    if (update.githubUrl !== undefined)
      payload.github_url = update.githubUrl || null;
    if (update.portfolioUrl !== undefined)
      payload.portfolio_url = update.portfolioUrl || null;
    if (update.skills !== undefined) payload.skills = update.skills;
    if (update.hobbies !== undefined) payload.hobbies = update.hobbies;
    if (update.openToCollab !== undefined)
      payload.open_to_collab = update.openToCollab;
    if (update.jobSeeking !== undefined)
      payload.job_seeking = update.jobSeeking;
    if (update.statusBadge !== undefined)
      payload.status_badges = [update.statusBadge];
    if (update.publicFields !== undefined)
      payload.public_preferences = update.publicFields;

    const updated = await request<ApiProfile>("/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return toSession(updated);
  },

  async requestAccountDeletion(requestDetails: string) {
    return request<ApiDeletionRequestResponse>("/me/deletion-request", {
      method: "POST",
      body: JSON.stringify({ request_details: requestDetails }),
    });
  },
};
