# WAROM Chatter + Users mobile API

Companion to `WAROM_API.md`. Same base `/api`, Bearer user JWT, Socket.IO `/socket.io`.

## Auth
- `POST /auth/register` — set `account_type: "chatter"` or `"user"`
- `POST /auth/login`
- `POST /auth/social` — Google / Apple
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/device-token` · `DELETE /auth/device-token`

## Profile / privacy / social
- `PATCH /profiles/me` — username, DOB, gender, hobbies, country, city, bio, photos, covers, onboarding
- `GET|PATCH /profiles/me/privacy`
- `POST /profiles/me/password` · `DELETE /profiles/me`
- `GET /profiles/me/social` · `/visitors` · `/followers` · `/following` · `/matches` · `/gifts`
- `GET /profiles/:id` — visit + privacy rules
- `POST|DELETE /social/follow/:userId`
- `POST|DELETE /social/block/:userId` · `GET /social/blocks`
- `POST /social/swipe` · `GET /social/matches`

## Home / Discover
- `GET /feed/home` — `{ online, offline, trending }`
- `GET /feed/discover?country=&city=`

## Media
- `POST /media/:kind` · `POST /media/:kind/batch`  
  kinds: `profile | cover | chat | verification | locked | gift | report | misc`

## KYC
- `POST /verification` `{ kind: "age"|"identity"|"chatter_kyc", document_urls: [] }`
- `GET /verification/me`

## Locked photos
- `POST /locked-photos` · `GET /locked-photos/mine`
- `GET /locked-photos/owner/:userId`
- `POST /locked-photos/:id/unlock` · `DELETE /locked-photos/:id`

## Chats
- `GET /chats` · `POST /chats/open`
- `GET|POST /chats/:id/messages` — text / voice / photo / video / sticker / gif
- `POST /chats/:id/read`

## Calls
- `POST /calls/start` · `PATCH /calls/:id`
- `GET /calls/history` · `GET /calls/missed`

## Live streams
- `GET /live-streams` · `GET /live-streams/mine` · `GET /live-streams/:id`
- `POST /live-streams` · `POST /live-streams/schedule`
- `POST /live-streams/:id/end|join|leave`

## Wallet / gifts / stickers
- `GET /wallet/catalogue` — coin packages, gifts, VIP, stickers, gifs
- `GET /wallet` · `GET /wallet/history`
- `POST /wallet/coins/purchase`
- `POST /wallet/gifts/send`

## Income (chatters)
- `GET /income` · `GET /income/holds` · `GET /income/transactions`
- `GET|POST /income/withdrawals` — requires approved KYC
- `POST /income/release-due`

## VIP / notifications / reports / presence
- `GET /vip/plans` · `GET /vip/me` · `POST /vip/subscribe`
- `GET /notifications` · `GET /notifications/unread-count`
- `POST /notifications/read-all` · `POST /notifications/:id/read`
- `POST /reports` · `GET /reports/mine`
- `POST /presence/heartbeat` · `GET /presence/:userId`

## Realtime
`handshake.auth.token = <JWT>`  
Events: presence, chat join/typing/message, call incoming/signal/status, live started/ended/viewer

## Earnings model
Eligible spend → chatter **pending_earnings** + `warom_earning_holds` → after hold days → **available_earnings** → withdraw (KYC required).

## Admin portal ops
See `WAROM_API.md` Admin section and `/api/admin/*` (KYC, ledger, hosts, live mod, content mod, broadcast, suspend/restore/terminate).
