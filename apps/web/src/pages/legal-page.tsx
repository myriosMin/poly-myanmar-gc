import { useParams, Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'

const content = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'legal / privacy',
    description:
      'Minimal-data privacy handling for a private approved-member platform.',
    sections: [
      'We collect Google account identity, LinkedIn URL, profile fields, and the minimum review metadata needed to approve or reject access.',
      'Profiles, events, resources, and collab listings remain private to approved members.',
      'Reviewer and superadmin actions can generate audit records for trust and safety purposes.',
    ],
  },
  terms: {
    title: 'Terms of Use',
    eyebrow: 'legal / terms',
    description:
      'Private membership rules for Myanmar polytechnic students, graduates, and mentors.',
    sections: [
      'Membership is restricted to approved current or former Myanmar polytechnic students and designated mentors.',
      'Admins can suspend, remove, or ban accounts that break community rules or misrepresent identity.',
      'The platform does not guarantee jobs, events, or collaboration outcomes.',
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    eyebrow: 'legal / guidelines',
    description: 'A compact rule set focused on trust, identity, and respectful sharing.',
    sections: [
      'Use accurate profile information and keep the LinkedIn profile consistent with the application.',
      'Do not spam, harass, impersonate, or submit malicious links.',
      'Keep resources and collab listings relevant to careers, study, hackathons, and open source work.',
    ],
  },
}

export function LegalPage() {
  const params = useParams()
  const slug = params.slug ?? ''
  const page = content[slug as keyof typeof content]

  if (!page) {
    return <Navigate to="/profiles" replace />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        actions={<Badge variant="outline">minimal legal baseline</Badge>}
      />

      <Card className="border-border/70 bg-white/90">
        <CardHeader>
          <CardTitle className="text-xl">{page.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          {page.sections.map((section) => (
            <p key={section}>{section}</p>
          ))}
          <p>
            Data deletion or access requests are handled through the admin contact path in the
            full implementation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
