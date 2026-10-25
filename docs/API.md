# PG Drisya API contract

The website (`client/`) and the mobile app (`mobile/`) talk to the same Express API (`server/`) and the same MongoDB database. There is no separate mobile backend. The response types are mirrored in `client/src/types.ts` and `mobile/src/types/index.ts`; change both when a response shape changes.

## Conventions

- **Base URL:** `/api` (the website uses the same origin by default; the app uses `EXPO_PUBLIC_API_URL`).
- **Auth:** send `Authorization: Bearer <token>` with the token from login or registration. The website keeps it in `localStorage`; the app keeps it in the device's secure storage (`expo-secure-store`).
- **Errors:** every error is JSON in the form `{ "message": "…" }`, sometimes with a `code`.
  - `400` invalid input
  - `401` not signed in, or the session expired (both apps sign the user out)
  - `403` not allowed
  - `404` not found, also used for "exists but isn't yours"
  - `409` conflict
  - `429` rate limited
  - `503` feature not configured
- **Pagination:** search uses `page` and `limit` (at most 50 per page, at most 100 pages). Message history uses `before`/`after` timestamps instead.

## Privacy rules enforced by the server

| Data | Who can see it |
|---|---|
| Host phone number | Never sent to tenants, before or after a booking. Tenants contact hosts only through in-app messages. (The host sees their own number in their profile; admins see it in moderation.) |
| Tenant phone number (on a host's request list) | The host, once that visit is confirmed or that booking accepted |
| Email addresses | Only the account owner (and admins) |
| Exact map position (`lat`/`lng`) | The listing's owner, admins, and tenants with a confirmed visit or accepted booking at that listing. Everyone else gets it rounded to roughly 1 km; `exactLocation` says which one you got. |
| Moderation notes | The listing's owner and admins |
| Identity verification | The account owner sees their own status. The public sees only `identityVerified: true/false`. Only admins see attempt history. No Aadhaar number, OTP or document is ever stored. |
| Conversations | Only the two participants. Every message query is scoped to the signed-in user. |

## Endpoints added or changed in this release

### Identity verification: `/api/identity`

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /status` | user | `{ status: 'unverified' \| 'pending' \| 'verified' \| 'rejected', verifiedAt, available, latestAttempt }`. `available: false` means no provider is configured. |
| `POST /start` | user | Creates a provider session and returns `{ redirectUrl }` (open it in the browser). Returns `503 { code: 'IDV_UNAVAILABLE' }` when no provider is configured. |
| `POST /cancel` | user | Cancels a pending attempt. |
| `POST /webhook` | provider signature | Outcome from the provider. See the signing details below. |
| `GET /admin/:userId` | admin | Attempt history (no identity data). |
| `POST /admin/:userId/review` | admin | `{ decision: 'verified' \| 'rejected' \| 'revoked', reason }` for a manual review. Admins cannot review their own account. |

**Webhook signing:** the provider sends the header `x-idv-timestamp` (Unix time in milliseconds) and the header `x-idv-signature: sha256=<hex>`. The signature is HMAC-SHA256, keyed with `IDV_WEBHOOK_SECRET`, over the string `` `${timestamp}.${rawBody}` ``. Requests older than 5 minutes are rejected. The body is `{ sessionId, status: 'verified' | 'rejected' | 'failed' | 'cancelled' | 'expired', reason? }`. Any other fields are ignored and never stored. Repeat deliveries are acknowledged with `{ duplicate: true }` and not applied twice.

### Messaging: `/api/messages`

| Method & path | Purpose |
|---|---|
| `GET /conversations` | Conversation list (the latest 100 messages each). Each item now includes `blockedByMe` and `blockedMe`. |
| `GET /thread?with=<userId>&propertyId=<id\|none>` | One conversation, newest page first: `{ messages, hasMore, participant, property, blockedByMe, blockedMe }`. |
| `…&before=<ISO>` | The previous page (older messages). |
| `…&after=<ISO>` | New messages since a time, oldest first. Both apps poll this every 5 seconds while a chat is open. |
| `POST /` | `{ receiverId, text, propertyId?, clientId? }`. `clientId` (8–64 characters, `[A-Za-z0-9_-]`) makes retries safe: the same `clientId` returns the original message with `{ duplicate: true }`. The response includes `warning: 'contact_info'` when the text looks like a phone number, email address or off-platform app; the message is still delivered. |
| `PUT /read` | `{ propertyId, senderId }`: marks a conversation as read. |
| `GET /unread-count` | `{ count }` |
| `GET /blocks`, `POST /block {userId}`, `DELETE /block/:userId` | Blocking. A block in either direction stops new messages in both directions. |

**Real-time updates:** the apps poll for new messages; there are no websockets. A message sent on the website shows up on the phone within about 5 seconds while that chat is open (about 15 seconds in the inbox list), and the other way round.

## Rate limits (production)

All limits are per IP address unless they say "per account".

| Area | Limit |
|---|---|
| Login and registration | 20 per 15 minutes |
| Search | 60 per minute |
| Listing pages | 300 per 10 minutes |
| Public profiles | 150 per 10 minutes |
| Sending messages | 30 per minute, per account |
| Reading messages | 120 per minute, per account |
| Identity verification starts | 5 per hour, per account |
| Uploads | 30 per 15 minutes |

Requests over a limit get HTTP `429`. Each time a limit trips, the server logs the route and a hashed IP address.
