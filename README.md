# PG Drisya

A marketplace for PGs and hostels in India: tenants search, visit, message and request to book; hosts list and manage their PGs; an admin team moderates listings and handles reports.

| Folder | What it is | Stack |
|---|---|---|
| `server/` | REST API | Node 20+, Express 4, MongoDB (Mongoose 8), Cloudinary, SMTP email |
| `client/` | Website | React 18, Vite 8, Tailwind 3 (colours as design tokens in `src/index.css`), Leaflet maps |
| `mobile/` | Android & iOS app | Expo SDK 58 (React Native 0.88) |

See **[DEPLOYMENT.md](DEPLOYMENT.md)** to go live, **[docs/API.md](docs/API.md)** for the API both apps share, and **[CHANGELOG.md](CHANGELOG.md)** for what changed.

## Features

**Tenants:** free-text and map search, filters (rent, gender, room type, amenities, Verified, Instant Book), wishlist, listing pages with house rules, approximate-location map and price breakdown, visit booking, request-to-book / Instant Book, cancellations, in-app messaging, notifications, reviews with category ratings (only after a completed visit or stay), host profiles, reporting.

**Hosts:** "become a host" from any account, 4-step listing form (photos, rules, rooms, map pin, Instant Book), moderation status and feedback, pause/resume/delete, booking-request inbox (accept/decline with reason, mark moved in), visit requests, public replies to reviews. Phone numbers are exchanged only after a confirmed visit or accepted booking.

**Identity verification:** Aadhaar verification through an authorised provider's own pages (server-side session plus a signed webhook), with an "ID verified" badge once the provider confirms it. Shows "unavailable" until a provider is configured (see `IDV_*` in `server/.env.example`). Aadhaar numbers, OTPs and documents are never collected or stored.

**Messaging:** private host–tenant chat on the website and in the app, with paginated history, safe retries, blocking, reporting and a safety tip when contact details are shared. Phone numbers and emails are never shown on public pages.

**Accounts:** sign-up with terms consent, email confirmation (required before booking), forgot/reset/change password (changing it signs out other devices), profile photo, data download, permanent account deletion.

**Admin (`/#/admin`):** moderation queue (approve / reject with reason / mark inspected = Verified badge / feature / pause), reports (take down & resolve), users (search, verify ID, suspend), Drisya Expert requests.

**Platform:** Privacy Policy, Terms, Help centre, Trust & Safety, error screens, toasts, dark mode, mobile layout, security headers, rate limiting, NoSQL-injection filtering, graceful shutdown, health check.

## Run it locally

You need Node 20+ and a MongoDB connection string (a free MongoDB Atlas cluster works).

```bash
# 1. API
cd server
cp .env.example .env        # fill in MONGO_URI and JWT_SECRET at minimum
npm install
npm run seed                # demo data — WIPES the database
npm run dev                 # http://localhost:5000

# 2. Website (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173

# 3. Mobile app (optional, new terminal)
cd mobile
cp .env.example .env        # use your computer's LAN IP, not localhost
npm install
npx expo start
```

Demo accounts after seeding (password `password123`): tenants `priya@example.com`, `rohit@example.com` · hosts `anjali@example.com`, `vikram@example.com` · admin `admin@example.com`.

If the server stops with `querySrv ECONNREFUSED` (common on Windows), it now retries with public DNS automatically; if it still fails, add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env` and check Atlas → Network Access allows your IP.

Without SMTP settings, emails (confirmation, password reset) are printed in the server console in development, so you can copy the links from there.

To make a real account an admin: `cd server && npm run make-admin -- you@example.com`

## Tests

| Command | What it covers |
|---|---|
| `cd server && npm test` | 142 unit + integration tests against a real in-memory MongoDB (every API route, permissions, edge cases) |
| `cd server && npm run test:coverage` | Same, with a coverage report (~94% of lines) |
| `cd client && npm test` | 41 unit/component tests (Vitest + Testing Library) |
| `cd client && npm run build && npm run test:e2e` | 18 browser tests (Playwright): the full tenant → host → admin flows on desktop and phone, plus the map/dialog overlap check, against the real API and database |
| `cd mobile && npm test` | 24 unit/screen tests (Jest + React Native Testing Library) |

The server and browser tests download a MongoDB binary on first run (cached afterwards). To use one you already have: `MONGOMS_SYSTEM_BINARY=/path/to/mongod`.

CI runs all of this on every push (`.github/workflows/ci.yml`).
