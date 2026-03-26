import { Navigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'

const content = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Legal',
    description: 'A light-touch summary of how member data is handled inside the club.',
    sections: [
      'We collect Google account identity, LinkedIn URL, profile details, and review metadata needed to approve or reject membership.',
      'Profiles, events, resources, and collaboration listings remain visible only to approved members.',
      'Reviewer and superadmin actions may generate audit records for trust and safety.',
    ],
  },
  terms: {
    title: 'Terms of Use',
    eyebrow: 'Legal',
    description: 'Membership rules for a private network built around trust and usefulness.',
    sections: [
      'Membership is restricted to approved current or former Myanmar polytechnic students and designated mentors.',
      'Admins may suspend, remove, or ban accounts that break community rules or misrepresent identity.',
      'The platform does not guarantee jobs, event outcomes, or collaboration results.',
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    eyebrow: 'Legal',
    description: 'A compact code of conduct for respectful, credible participation.',
    sections: [
      'Keep your identity and LinkedIn information accurate.',
      'Do not spam, harass, impersonate, or share malicious links.',
      'Keep resources and collaborations relevant to study, careers, hackathons, and open source work.',
    ],
  },
  deletion: {
    title: 'Account & Data Deletion',
    eyebrow: 'Legal',
    description: 'How members can request account and personal data deletion.',
    sections: [
      'You can request account removal, profile data deletion, and removal of optional links or collaboration listings through the admin support path.',
      'We may retain minimal moderation and security audit records needed for abuse prevention and platform safety.',
      'Requests should include your full name, Google sign-in email, and LinkedIn URL so admins can verify identity before action.',
    ],
  },
  contracts: {
    title: 'Shared Contracts',
    eyebrow: 'Policy',
    description: 'Platform constants and operational rules used across the product.',
    sections: [
      'Defines role, approval, moderation, and RSVP states used by the product and backend workflows.',
      'Confirms core route and approval behavior for private member access and moderation consistency across admin channels.',
      'Documents core product constraints, including no social feed, post comments, or in-app messaging in this release.',
    ],
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
        <div className="space-y-5">
          {page.sections.map((section) => (
            <p key={section} className="body-copy !text-sm">
              {section}
            </p>
          ))}
          <p className="body-copy !text-sm">
            Data access and deletion requests are handled through the club admin contact path in
            the full implementation.
          </p>
        </div>
      </div>
    </div>
  )
}
