/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LEGAL_NAME?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_PHONE?: string;
  readonly VITE_SUPPORT_CITY?: string;
  readonly VITE_GRIEVANCE_OFFICER?: string;
  readonly VITE_SOCIAL_TWITTER?: string;
  readonly VITE_SOCIAL_INSTAGRAM?: string;
  readonly VITE_SOCIAL_LINKEDIN?: string;
  readonly VITE_SOCIAL_FACEBOOK?: string;
  readonly VITE_AADHAAR_SIMULATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
