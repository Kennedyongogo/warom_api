# WAROM API — complete product surface

Base: `/api` · Health: `GET /api/health` · Realtime: Socket.IO `/socket.io`  
Auth header: `Authorization: Bearer <token>`  
JWT types: `warom_user` (apps) · `warom_admin` (portal)

This Node/Express API captures **all App_Dev product behaviors** for Users app, Chatters app, Admin portal, and public site.  
It is **not** the full Technical Architecture stack (Rust / NATS / Scylla / Valkey / SFU / vector DB).

---

## Auth — `/api/auth`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/register` | — | Email/Google/Apple fields; `account_type`: `user`\|`chatter` |
| POST | `/login` | — | Email + password (+ optional `account_type`) |
| POST | `/social` | — | `{ provider: google\|apple, provider_id, email?, username?, account_type? }` |
| GET | `/me` | user | Current profile |
| POST | `/logout` | user | Marks offline; optional `device_token` removal |
| POST | `/device-token` | user | Push token `{ token, platform }` |
| DELETE | `/device-token` | user | Body `{ token }` |

---

## Profiles — `/api/profiles`

| Method | Path | Auth |
|--------|------|------|
| PATCH | `/me` | user — onboarding + profile fields |
| GET/PATCH | `/me/privacy` | user — `profile_visibility`, `privacy_settings` |
| POST | `/me/password` | user |
| DELETE | `/me` | user — soft delete |
| GET | `/me/social` | counts + wallet summary |
| GET | `/me/visitors` | |
| GET | `/me/followers` · `/me/following` · `/me/matches` · `/me/gifts` | |
| GET | `/:id` | optional — respects privacy; records visit |

---

## Social — `/api/social`

| Method | Path |
|--------|------|
| POST/DELETE | `/follow/:userId` |
| POST/DELETE | `/block/:userId` |
| GET | `/blocks` |
| POST | `/swipe` `{ target_id, action: like\|pass }` |
| GET | `/matches` |

---

## Feed — `/api/feed`

| Method | Path |
|--------|------|
| GET | `/home` — `{ online, offline, trending }` (VIP boosted) |
| GET | `/discover?country=&city=` |

---

## Media — `/api/media`

| Method | Path |
|--------|------|
| POST | `/:kind` form-data `file` |
| POST | `/:kind/batch` form-data `files` |

Kinds: `profile` · `cover` · `chat` · `verification` · `locked` · `gift` · `report` · `misc`

---

## Verification / KYC — `/api/verification`

| Method | Path |
|--------|------|
| POST | `/` `{ kind: age\|identity\|chatter_kyc, document_urls[] }` |
| GET | `/me` |

---

## Locked photos — `/api/locked-photos`

| Method | Path |
|--------|------|
| POST | `/` chatter create |
| GET | `/mine` |
| GET | `/owner/:userId` |
| POST | `/:id/unlock` |
| DELETE | `/:id` |

---

## Chats — `/api/chats`

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/open` `{ user_id }` |
| GET | `/:id/messages` |
| POST | `/:id/messages` — types: text, voice, photo, video, sticker, gif (+ gift via wallet) |
| POST | `/:id/read` |

User→chatter messaging is monetized when configured.

---

## Calls — `/api/calls`

| Method | Path |
|--------|------|
| POST | `/start` `{ callee_id, call_type: voice\|video }` |
| PATCH | `/:id` status / signalling |
| GET | `/history?status=&call_type=` |
| GET | `/missed` |

Realtime: `call:incoming` · `call:signal` · `call:status`

---

## Live streams — `/api/live-streams`

| Method | Path |
|--------|------|
| GET | `/` live list |
| GET | `/mine` |
| GET | `/:id` |
| POST | `/` chatter start |
| POST | `/schedule` |
| POST | `/:id/end` · `/:id/join` · `/:id/leave` |

---

## Wallet — `/api/wallet`

| Method | Path |
|--------|------|
| GET | `/catalogue` — coins, gifts, VIP, stickers, gifs |
| GET | `/` balance |
| GET | `/history` ledger entries |
| POST | `/coins/purchase` `{ package_id, simulate_success? }` |
| POST | `/gifts/send` `{ receiver_id, gift_id, conversation_id? }` |

---

## Income (chatters) — `/api/income`

| Method | Path |
|--------|------|
| GET | `/` pending + available + holds |
| GET | `/holds` |
| GET | `/transactions` holds + ledger + withdrawals |
| GET/POST | `/withdrawals` — **requires approved KYC** |
| POST | `/release-due` |

Pending → available hold (default 7 days) + cron every 15m.

---

## VIP — `/api/vip`

| Method | Path |
|--------|------|
| GET | `/plans` |
| GET | `/me` status + perks |
| POST | `/subscribe` `{ vip_plan_id }` |

---

## Notifications — `/api/notifications`

| Method | Path |
|--------|------|
| GET | `/` · `/unread-count` |
| POST | `/read-all` · `/:id/read` |

Types include: system, new_match, message, call, coin_purchase, vip_expiry, gift, follow, visit, withdrawal, report.

---

## Reports — `/api/reports`

| Method | Path |
|--------|------|
| POST | `/` |
| GET | `/mine` |

---

## Presence — `/api/presence`

| Method | Path |
|--------|------|
| POST | `/heartbeat` |
| GET | `/:userId` |

---

## Public site — `/api/site`

| Method | Path |
|--------|------|
| GET | `/policies` · `/policies/:slug` |
| POST | `/inquiries` |

---

## Admin — `/api/admin`

### Identity / ops
bootstrap · login · me · dashboard · directory-stats  
users CRUD-ish · suspend · restore · terminate · balances · adjust-balance  
admins CRUD

### Money
coin-packages · vip-plans · gifts · earnings-configs  
payments · withdrawals review · ledger entries/accounts · earning-holds (+ release-due)

### Safety / reach
verifications (KYC) · reports · content moderation (messages + locked photos)  
live-streams list + end/ban · hosts · notifications broadcast (`audience`: user\|users\|chatters\|all)

### Site
inquiries · policies

---

## Realtime (Socket.IO)

Auth: `handshake.auth.token = <user JWT>`

| Event | Direction |
|-------|-----------|
| `presence:update` / `presence:heartbeat` | both |
| `chat:join` · `chat:typing` · `chat:message` | both |
| `call:incoming` · `call:signal` · `call:status` | both |
| `live:started` · `live:ended` · `live:viewer` | server→client |

---

## Money model

Ledger accounts: `wallet_spendable` · `pending_earnings` · `available_earnings` · `platform_revenue` (+ escrow when used).  
Every spend is a balanced journal entry. Chatter share % is admin-configurable per transaction type (messaging, gift, photo unlock, voice, video, VIP share).
