# Changelog

## 4.2.0 — Speed
- **Website loads less up front:** pages other than the homepage now load when first opened (main download 104 KB → 67 KB gzipped), and Search, listing and login pages are fetched in the background once the homepage is idle.
- **Right-sized images:** listing photos are requested at the size they're shown (cards ~480px instead of 1200px) in WebP/AVIF where the image host supports it (Cloudinary, Pexels), with sharp 2× versions for high-density screens. Images below the fold load lazily; the main listing photo loads first.
- **Smaller API responses:** gzip compression on the server (new `compression` dependency — run `npm install` in `server/`).
- **Browser caching:** when the server hosts the website, built files are cached for a year (their names change on every release) and `index.html` is always re-checked.
- **Database indexes** for visits, messages and the default search sort; homepage stats are recounted at most once a minute.
- The notification badge no longer polls while the tab is in the background.
- City cards without a photo now show a styled navy/teal card instead of a single letter.

## 4.1.1
- Fixed: the server crashed on start with `querySrv ECONNREFUSED` on Windows and some home networks when using a `mongodb+srv://` Atlas address. It now retries once with public DNS (8.8.8.8, 1.1.1.1), and `npm run seed` / `npm run make-admin` do the same. Connection failures print a plain-language hint (DNS, wrong password, or IP not allowed in Atlas).

## 4.1.0 — Deep Navy + White + Teal redesign
- **Design tokens:** all colours now live as CSS variables in `client/src/index.css` (navy `#102A43`, teal `#14B8A6` / hover `#0F9488`, pale teal `#E6F7F5`, page `#F4F7FA`, body text `#243447`, muted `#64748B`, borders `#E2E8F0`, success, warning, error). `tailwind.config.js` reads them; the old coral palette is gone (`coral-*` → `brand-*`), with no hex codes left in components.
- **Shared styles:** teal primary buttons, white secondary buttons with navy text, inputs with a teal focus ring, pale-teal selected filters (`.chip-active`), consistent 12–16px corners, navy-tinted shadows, visible keyboard focus everywhere.
- **Navbar:** white, navy logo, animated teal underline on the active link.
- **Hero:** light background with navy heading, a single search panel, and stat tiles that count up.
- **Listing cards:** white cards with equal heights, hover lift and image zoom, room type, gender and amenity tags, rating, "rooms free" or Instant Book, and **View details** / **Book now** buttons. Book now jumps to the booking box and highlights it.
- **Listing page:** white content panels on the light background; date and time pickers use the selected-chip style; amber rating stars.
- **Footer:** deep navy with white headings and teal links.
- **Motion:** sections fade in on scroll, dialogs scale in, toasts slide up, and the wishlist heart pops. All motion is switched off when the OS "reduce motion" setting is on.
- **Status colours:** confirmed/accepted = success green, pending = warning amber, declined = error red.
- Dark mode retuned to the navy palette.
- Fixed: the host dashboard now follows `?tab=` links (e.g. from notifications) while already open.

## 4.0.0 — Launch readiness

### Bugs fixed
- **Edit Profile wiped data:** city, bio and college started blank and were overwritten with empty values on save.
- **Owner contact leak:** listing pages sent the owner's email and phone to everyone. Email is now never public; phone only after a confirmed visit or accepted booking.
- **Private listings were public:** paused, pending and rejected listings could be opened by anyone with the link.
- **Fake reviews possible:** anyone could review any listing, including their own. Reviews now need a completed visit or a stay, and ratings are recomputed from real reviews.
- **Old sessions stayed valid after a password change**; suspended users kept access. Tokens now carry a version that is bumped on password change, reset, suspension or role change.
- **Sign-up threw data away:** owner onboarding collected bank, IFSC and GST details and discarded them (removed). Tenant onboarding now really saves. Fake ID "upload" buttons removed.
- **Fake "Protected by 2FA" claim** on the login page removed.
- **Search:** "Verified" and "Instant Book" filters were ignored by the server; results stopped at 20 with no way to see more; the "budget" control set the wrong filter; "Newest" sorted by move-in date; location couldn't be typed. All fixed, with server-side sorting and "Show more".
- **Wishlist:** the Saved tab only found favourites among the first 20 listings.
- **Dates:** visit dates were computed in UTC (wrong day in India between midnight and 5:30 AM).
- **Listing page:** house rules were never shown; review dates showed raw timestamps; the host's review count was always 0; the Call/Email buttons exposed contact details.
- **Messages:** dead Phone/More buttons, no auto-refresh, a "verified" shield on every owner, no notification to the recipient.
- **Price on listing cards** was missing the ₹ sign.
- **Header:** "Switch to Owner" sent tenants to a dashboard they couldn't use.
- **Mobile:** the login screen stayed open after logging in; hosts had no way to edit their profile or log out (the Profile tab was replaced by the listings screen); register used the old 6-character password rule.
- **Server:** NoSQL operator injection (e.g. `{"$gt":""}`) caused crashes or bypassed checks; malformed JSON returned 500; CORS rejections returned 500; favourite double-clicks caused duplicate-key errors; new-listing notifications were sent to every tenant with no limit; conversation loading had no cap.

### Removed misleading content
- Made-up testimonials, invented stats ("10+ verified PGs", "4.9 rating", "50+ tenants"), "every property physically inspected", "instant booking with secure online payments", and Trust & Safety claims about processes that didn't exist.
- Paid pricing tiers with no payment system (pricing is now honestly free during launch).
- Fake verification statuses and notification-settings toggles on the dashboards; the fake "Earnings" tab.
- The Expert form, which discarded submissions (now saved and visible to admins).
- Simulated Aadhaar verification: now off by default and never grants the Verified badge.

### New features (Airbnb-inspired)
- Request to book and Instant Book, with room availability, cancellations with reasons, a move-in cost breakdown, and booking emails.
- Listing moderation: new listings go to an admin queue; rejection with feedback; resubmission on edit; "Verified" = inspected by admin.
- Admin panel: moderation, reports with takedown, user search, ID verification, suspension, Expert requests, stats.
- Reviews: category ratings, "Stayed here" label, host public replies, review prompts after stays.
- Reporting of listings, profiles, reviews and users.
- Public host profiles.
- Map search with price pins, and an approximate-area map on listings.
- Accounts: email confirmation, forgot/reset/change password, data export, account deletion, "become a host".
- Live homepage stats from real data.
- Privacy Policy, Terms, Help centre, honest Trust & Safety page.
- Notifications for messages, bookings, visits, reviews and moderation, with links to the right screen.
- Mobile: inbox and chat, visit booking, request to book, trips, host requests, reviews, reports, account settings with deletion, forgot password, terms consent; upgraded to Expo SDK 57 (targets Android 16, as Google Play requires).

### Engineering
- API split into `app.js` (testable) and `server.js`; config validation; graceful shutdown; health check reports database status; optional serving of the website from the API; Dockerfile; CI workflow.
- Tests: 123 server tests (unit + integration on a real MongoDB), 34 web unit tests, 16 browser end-to-end tests, 18 mobile tests.
- Upgraded Vite 5 → 8 and Vitest → 5; nodemailer 10 (patched). Production dependencies audit clean.

## 3.x — earlier hardening passes
Central error handling, rate limiting, CORS allowlist, Aadhaar hashing, property field whitelist, atomic view counter, upload type checks, Verhoeff check, visit validation and transitions, soft delete and pause, mobile API URL fix, removal of an unused vulnerable dependency.
