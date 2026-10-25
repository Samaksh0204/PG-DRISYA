// Ambient types for EXPO_PUBLIC_* environment variables used in this app.
// Expo inlines these at build time from mobile/.env — see .env.example.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
  }
}
