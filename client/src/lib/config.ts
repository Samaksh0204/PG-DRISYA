// Site-wide settings come from client/.env so contact details and social links
// can change without code edits. Anything left empty is simply hidden.
const env = import.meta.env;

export const siteConfig = {
  name: 'PG Drisya',
  legalName: env.VITE_LEGAL_NAME || 'PG Drisya',
  supportEmail: env.VITE_SUPPORT_EMAIL || '',
  supportPhone: env.VITE_SUPPORT_PHONE || '',
  city: env.VITE_SUPPORT_CITY || 'Indore, Madhya Pradesh, India',
  grievanceOfficer: env.VITE_GRIEVANCE_OFFICER || '',
  social: {
    twitter: env.VITE_SOCIAL_TWITTER || '',
    instagram: env.VITE_SOCIAL_INSTAGRAM || '',
    linkedin: env.VITE_SOCIAL_LINKEDIN || '',
    facebook: env.VITE_SOCIAL_FACEBOOK || '',
  },
  aadhaarSimulation: env.VITE_AADHAAR_SIMULATION === 'true',
};
