import { Navigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'

const content = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Legal',
    description: 'Full policy text synced from docs/privacy.md.',
    body: `# Privacy Policy

Last updated: March 24, 2026

Poly Myanmar GC is a private, approved-member community platform. This policy explains what data we collect and how we use it.

## Data we collect

We may collect:

- Google account information used for sign-in
- Email address
- Name
- Polytechnic, course, and graduation year
- LinkedIn URL
- Optional GitHub or portfolio URL
- Skills, hobbies, and collaboration preferences
- Event RSVPs
- Resource submissions and collaboration listings
- Admin moderation actions and audit logs
- Optional manual verification notes or proof metadata if approval needs review

We do not need profile photos or file uploads for the MVP. Where possible, we use LinkedIn profile links and public information already supplied by the user.

## How we use data

We use the data to:

- verify that a user is eligible to join
- maintain the private member directory
- show events, resources, and collaboration listings to approved members
- let admins review approvals and moderation cases
- protect the platform from abuse and spam

## Sharing and visibility

Your profile and activity are visible only to approved logged-in members. Admins and reviewers can access additional data needed for moderation. We do not sell personal data.

We may use Telegram to send moderation alerts and review actions to admins. Those messages can include limited account or submission details needed to make a decision.

## Retention

We keep account and moderation records only as long as needed to run the community, enforce policy, and handle safety issues. If you are removed or banned, we may retain a minimal audit trail for security and abuse prevention.

## Security

We take reasonable technical and operational steps to protect member data, including access controls and approval-based restrictions. No system is perfectly secure, so you should avoid posting unnecessary sensitive information.

## Your choices

You may request correction or deletion of your account data by contacting the admins. If you stop using the platform, your data may still be retained in a limited form for audit and moderation purposes.

## Changes

We may update this policy as the platform changes. The latest version will be posted in the app.`,
  },
  terms: {
    title: 'Terms of Use',
    eyebrow: 'Legal',
    description: 'Full policy text synced from docs/terms.md.',
    body: `# Terms of Use

Last updated: March 24, 2026

Poly Myanmar GC is a private, members-only community platform for Myanmar polytechnic students, recent graduates, alumni, and approved mentors in Singapore.

## Eligibility

You may use the platform only if you are approved by the admins. Approval may be based on LinkedIn, graduation details, or manual review of supporting proof. We may suspend, reject, or remove access at any time if eligibility cannot be verified or if the account violates these terms.

## Account responsibility

You are responsible for the accuracy of the information you submit, including your name, polytechnic, course, graduation year, LinkedIn profile, and any links you share. You must not impersonate another person or misrepresent your student, graduate, or mentor status.

## Acceptable use

You may use the platform to view members, attend events, share relevant resources, and join collaboration opportunities. You must not upload malicious links, spam the platform, abuse review flows, scrape private data, or use the service for harassment or unlawful activity.

## Content and links

Any event, resource, or collaboration listing is user-submitted or admin-approved. We do not guarantee the accuracy, safety, or availability of any third-party link, event, job, or opportunity. You access external sites at your own risk.

## Moderation

Admins may approve, reject, remove, ban, or otherwise restrict accounts, resources, events, or collaboration listings to protect the community. Review decisions may be made in Telegram or in the admin dashboard.

## Privacy

The platform is private to approved members. We collect only the data needed to verify membership, run the service, and moderate abuse. See the Privacy Policy for details.

## Changes and termination

We may update these terms from time to time. Continued use after an update means you accept the revised terms. We may terminate access immediately for abuse, security risk, or repeated policy violations.

## Contact

For access, removal, or policy questions, contact the site admins through the community channels or the account/data deletion process described in the Privacy Policy.`,
  },
  guidelines: {
    title: 'Community Guidelines',
    eyebrow: 'Legal',
    description: 'Full policy text synced from docs/guidelines.md.',
    body: `# Community Guidelines

Last updated: March 24, 2026

Poly Myanmar GC is a private graduate club for approved members. These guidelines exist to keep the platform useful, respectful, and low-noise.

## Be genuine

- Use your real identity and accurate student, graduate, or mentor status.
- Do not impersonate another person or create duplicate accounts to bypass review.
- Keep profile details, project descriptions, and resource links truthful.

## Keep it relevant

- Use the platform for job search, networking, events, resources, and collaboration.
- Keep submissions relevant to Myanmar polytechnic students, graduates, alumni, or approved mentors.
- Do not post unrelated promotions, spam, gambling, crypto schemes, or low-value link dumps.

## Respect other members

- Do not harass, threaten, discriminate, or shame other members.
- Do not share private member data outside the platform without permission.
- Do not abuse reviewer or admin workflows.

## Share safely

- Submit links that are safe, relevant, and accurate.
- Do not share malware, phishing pages, credential-harvesting forms, or deceptive redirects.
- If you create a collab project, keep the title, scope, and contact details clear.

## Moderation

- Admins may remove content, reject submissions, restrict access, or ban accounts that violate these guidelines.
- Repeated low-quality or suspicious submissions may be flagged even if no immediate ban is applied.
- Telegram review actions and dashboard actions are equally valid moderation channels.

## Reporting

- If you see abuse, suspicious links, or impersonation, report it to the admins.
- Do not start public disputes inside the platform. Use the admin review process instead.`,
  },
  deletion: {
    title: 'Account & Data Deletion',
    eyebrow: 'Legal',
    description: 'Full policy text synced from docs/deletion.md.',
    body: `# Account and Data Deletion Requests

Last updated: March 24, 2026

You can request deletion of your account or associated personal data by contacting the admins through the community support channel or the designated Telegram admin contact.

## What you can request

- Account removal
- Deletion of profile data
- Removal of optional public links or collaboration listings
- Clarification on what moderation records remain after removal

## What may be retained

We may keep a limited record of:

- approval decisions
- bans or moderation actions
- audit logs needed for security and abuse prevention
- minimal records required by law or to protect the community

These records are kept only as long as needed for operational safety and legitimate admin duties.

## What to include

Please include:

- your full name
- the email used for Google sign-in
- your LinkedIn URL
- a clear description of the request

If we cannot verify the request from the information provided, we may ask for additional proof before taking action.

## Processing

We aim to review deletion requests promptly. If the account is still under review or involved in a moderation case, we may delay deletion until the case is resolved or preserve a minimal audit trail.

## Contact

Send deletion requests through the community admin channel or the Telegram review contact used by the site admins.`,
  },
} as const

export function LegalPage() {
  const params = useParams()
  const slug = params.slug ?? ''
  const page = content[slug as keyof typeof content]

  if (!page) {
    return <Navigate to="/profiles" replace />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        actions={<Badge variant="outline">Private member platform</Badge>}
      />

      <div className="surface-panel bg-card/88 p-8">
        <ReactMarkdown
          components={{
            h1: (props) => <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]" {...props} />,
            h2: (props) => <h2 className="section-title mt-6" {...props} />,
            p: (props) => <p className="body-copy !text-sm" {...props} />,
            ul: (props) => <ul className="body-copy !text-sm list-disc pl-5 space-y-1" {...props} />,
            code: (props) => <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props} />,
          }}
        >
          {page.body}
        </ReactMarkdown>
      </div>
    </div>
  )
}
