# WAROM API structure

This API is structured for:

- **users app** — consumers who buy coins and spend
- **chatters app** — hosts/creators who earn and withdraw
- **warom_admin** — catalogue, users, withdrawals, reports, policies
- **Tuvibe-public** — policies + inquiry only (`/api/site`)

Legacy TuVibe models/controllers remain on disk under `src/models/*.js` (root) but are **not loaded**. Active domain lives under `src/**/warom/`.

## Auth

| Method | Path | Who |
|--------|------|-----|
| POST | /api/auth/register | user or chatter (`account_type`) |
| POST | /api/auth/login | user or chatter |
| GET | /api/auth/me | authenticated app user |

JWT `type`: `warom_user` or `warom_admin`.

## Apps (users + chatters)

| Area | Base path |
|------|-----------|
| Profiles | /api/profiles |
| Home / Discover | /api/feed/home, /api/feed/discover |
| Social | /api/social |
| Chats | /api/chats |
| Calls | /api/calls |
| Wallet (coins) | /api/wallet |
| Chatter income | /api/income (chatter only) |
| VIP | /api/vip |
| Notifications | /api/notifications |
| Reports | /api/reports |

## Admin

Base: `/api/admin`

- bootstrap / login / dashboard
- users (+ terminate chatters/users)
- coin packages, VIP plans, gift catalogue
- earnings configs (share % per transaction type)
- payments, withdrawals review
- reports, live streams, notifications
- inquiries + policies

## Public site

| Method | Path |
|--------|------|
| GET | /api/site/policies |
| GET | /api/site/policies/:slug |
| POST | /api/site/inquiries |

## Money model (architecture-aligned)

- Ledger accounts: `wallet_spendable`, `pending_earnings`, `available_earnings`, `platform_revenue`, `escrow_holding`
- Balanced journal entries via `services/warom/ledgerService.js`
- Gifts / VIP / withdrawals post ledger lines; admin configures chatter/platform split in `warom_earnings_configs`
