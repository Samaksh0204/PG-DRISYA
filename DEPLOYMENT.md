# Going live

Work through this in order. Items marked **⚠ you** need an account, a decision or a legal check that code can't do for you.

## 1. Before anything else

- [ ] **⚠ you — Rotate every credential that was ever in a zip you shared** (MongoDB Atlas password, old JWT secret, Cloudinary API secret). Treat them as public.
- [ ] **⚠ you — Have a lawyer review** `client/src/pages/LegalPages.tsx` (Privacy Policy and Terms). They are written for India's DPDP Act 2023 and IT Rules 2021, but they make commitments on your behalf.
- [ ] **⚠ you — Appoint a Grievance Officer** (required for intermediaries in India) and put their name in `VITE_GRIEVANCE_OFFICER`.
- [ ] **⚠ you — Decide the public contact details.** `client/.env` currently has the personal email and phone that were in the old footer. Use business contacts if you'd rather not publish those.
- [ ] Keep `AADHAAR_SIMULATION=false`. Collecting Aadhaar numbers needs UIDAI authorisation (AUA/KUA) or a DigiLocker / licensed-KYC integration. Until then hosts are verified manually by your admin team (Admin → Users → Verify ID).

## 2. Services to sign up for

| Service | Why | Free tier |
|---|---|---|
| MongoDB Atlas | Database | M0 is fine to start |
| Cloudinary | Listing and profile photos | Yes |
| An SMTP email provider (Brevo, Amazon SES, SendGrid, Zoho, …) | Password reset, email confirmation, booking emails | Brevo: 300/day |
| A host for the app (Render, Railway, Fly.io, a VPS…) | Runs the API and website | Varies |
| A domain name | e.g. `pgdrisya.com` | — |

In Atlas, add your host's outbound IP to **Network Access** (or `0.0.0.0/0` together with a strong password).

## 3. Deploy the API + website (simplest: one service)

The server can serve the built website itself, so you only deploy one thing and don't need CORS.

**With Docker** (Render, Railway, Fly, Cloud Run, any VPS): use the `Dockerfile` in the project root. It builds the website and starts the API.

**Without Docker:**
```bash
cd client && npm ci && npm run build
cd ../server && npm ci --omit=dev
NODE_ENV=production CLIENT_DIST=../client/dist node src/server.js
```

Set these environment variables on the host (see `server/.env.example` for all of them):

```
NODE_ENV=production
MONGO_URI=...                 # new, rotated
JWT_SECRET=...                # openssl rand -hex 32
APP_URL=https://yourdomain.com
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... MAIL_FROM="PG Drisya <no-reply@yourdomain.com>"
CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
CLIENT_DIST=../client/dist    # (already set inside the Docker image)
```

The server refuses to start in production if `JWT_SECRET` is short or `APP_URL` is missing, and it warns at startup if email or uploads aren't configured.

The website's `VITE_*` settings (contact details, Grievance Officer, social links) are baked in at build time. Set them in `client/.env` before `npm run build`, or as build-time variables on your host.

**Separate hosting instead** (e.g. website on Vercel/Netlify, API elsewhere): build the client with `VITE_API_URL=https://api.yourdomain.com/api`, and set `CORS_ORIGINS=https://yourdomain.com` on the API. Links use `#/` routes, so no rewrite rules are needed.

## 4. After the first deploy

- [ ] Open `https://yourdomain.com/api/health` and check it shows `"db":"up"`.
- [ ] Sign up with your own email, confirm it via the email you receive, then run `npm run make-admin -- you@yourdomain.com` (from `server/`, pointing at the production database) to make yourself admin.
- [ ] **Don't run `npm run seed` in production** (it wipes data; it's blocked unless `ALLOW_SEED=true`).
- [ ] Do a full test pass: create a listing as a host → approve it in Admin → book a visit and request a booking from another account → accept → leave a review → reply.
- [ ] Set up uptime monitoring on `/api/health` (UptimeRobot, Better Stack — free tiers exist) and turn on your host's log retention.
- [ ] Turn on daily backups in Atlas (needs a paid tier) or schedule `mongodump`.
- [ ] Map tiles come from OpenStreetMap's free servers, which are fine for small traffic. Switch `TILE_URL` in `client/src/components/MapView.tsx` to a paid provider (MapTiler, Stadia) if traffic grows.

## 5. Mobile app (Google Play / App Store)

1. Replace the placeholder `mobile/assets/icon.png`, `adaptive-icon.png` and `splash.png` with real artwork.
2. In `mobile/eas.json`, set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` for `production` to your **https** addresses. Release builds warn if the API isn't https, and Android blocks plain http.
3. `npm i -g eas-cli && eas login && eas build:configure`, then `eas build -p android --profile production` (and `-p ios`).
4. **Test on real phones** (`eas build --profile preview` makes an installable APK). The app was upgraded to Expo SDK 57 so it targets Android 16 (API 36), which Google Play now requires. It type-checks, passes its tests and bundles for both platforms, but hasn't been run on a physical device yet.
5. Store listings: privacy policy URL = `https://yourdomain.com/#/privacy`; account-deletion URL = `https://yourdomain.com/#/profile/edit` (deletion is also in the app under Profile → Account settings). Fill in Play's Data Safety form and Apple's privacy labels using section 1 of the Privacy Policy.
6. Accounts: Google Play Console (one-time US$25) and Apple Developer Program (US$99/year).

## 6. Known limitations (decide later)

- **No online payments.** Rent and deposit are paid to the host at move-in. To take payments, integrate Razorpay/Cashfree (needs a business account and KYC) and add a payment step to bookings.
- **No real ID/KYC integration** (see section 1).
- **Messages refresh every 15 seconds** instead of instantly (no websockets), and there are no push notifications yet. In-app and email notifications work.
- Login tokens are stored in the browser's local storage. This is standard for single-page apps, but it means a script-injection bug could steal sessions. The strict Content Security Policy applied when the server hosts the site reduces this risk.
- Dependency advisories: `server` and `client` production dependencies audit clean. `client` has 3 moderate dev-only advisories in Tailwind 3's build-time CSS parser (fix = migrate to Tailwind 4). `mobile` reports 5 in Expo's command-line tool (`@expo/cli` → `node-forge`, `zod`). That tool is installed with the `expo` package but runs only on your computer and isn't part of the built app; there's no upstream fix yet, so re-check with `npm audit` when upgrading Expo.
