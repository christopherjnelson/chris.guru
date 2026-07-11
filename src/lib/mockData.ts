export interface Achievement {
  id: number;
  title: string;
  content: string;
  date: string;
}

export interface Skill {
  name: string;
  category: string;
}

export const achievements: Achievement[] = [
  {
    id: 1,
    title: 'Google Workspace Administrator Certification',
    content:
      'Chris earned the Google Workspace Administrator certification today, demonstrating proficiency in managing users, groups, and organizational units across enterprise environments.',
    date: '2025-04-12',
  },
  {
    id: 2,
    title: 'Migrated 200 Mailboxes to Microsoft 365',
    content:
      'Chris successfully completed a cross-tenant migration of 200 mailboxes from on-premises Exchange to Microsoft 365 with zero data loss and minimal downtime.',
    date: '2025-02-28',
  },
  {
    id: 3,
    title: 'Deployed Zero-Touch Enrollment for 500 Devices',
    content:
      'Chris rolled out a zero-touch enrollment pipeline using Android Enterprise and Apple Business Manager, provisioning 500 endpoint devices across three regional offices.',
    date: '2024-11-15',
  },
  {
    id: 4,
    title: 'Spoke at Regional IT Admin Meetup',
    content:
      'Chris delivered a talk on hardening remote access infrastructure at the regional IT administrators meetup, covering VPN gateway tuning and MFA enforcement strategies.',
    date: '2024-09-03',
  },
];

export const skills: Skill[] = [
  { name: 'Google Workspace Admin', category: 'Cloud' },
  { name: 'Microsoft 365 Administration', category: 'Cloud' },
  { name: 'AWS IAM & S3', category: 'Cloud' },
  { name: 'Okta Identity Management', category: 'Identity' },
  { name: 'Azure AD / Entra ID', category: 'Identity' },
  { name: 'SAML & OIDC SSO', category: 'Identity' },
  { name: 'Nginx Reverse Proxy', category: 'Networking' },
  { name: 'VPN & Zero Trust Access', category: 'Networking' },
  { name: 'DNS & DHCP Management', category: 'Networking' },
  { name: 'PowerShell Automation', category: 'Automation' },
  { name: 'Python Scripting', category: 'Automation' },
  { name: 'MDM Profile Deployment', category: 'Automation' },
];