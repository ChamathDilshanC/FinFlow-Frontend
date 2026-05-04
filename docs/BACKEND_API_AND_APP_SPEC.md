# FinFlow mobile client — backend alignment & UI specification

This document maps the **FinFlow FastAPI backend** (`/api/v1`) to the **Expo + React Native + NativeWind** client. Use it as the single source for screens, features, and API contracts while you build navigation and data layers.

**සිංහල සාරාංශය:** Backend එකේ endpoints හා data fields මෙහි සඳහන්ය. Production API: `https://fin-flow-backend-theta.vercel.app/api/v1` ([live service](https://fin-flow-backend-theta.vercel.app/)). Local dev වෙනුවට PC එකේ API එක run කරනවා නම්, phone එකෙන් `localhost` වැඩ නොකරන නිසා **LAN IP** භාවිතා කරන්න.

---

## Tech stack (this folder)

| Layer | Choice |
|--------|--------|
| Runtime | Expo SDK 54 (Expo Go on a normal iPhone) |
| UI | React Native 0.81 + React 19 |
| Styling | NativeWind v4 + Tailwind CSS 3.x |
| Safe areas | `react-native-safe-area-context` |
| Motion | `react-native-reanimated` (required by NativeWind) |

**Run (Windows dev machine, test on iPhone):**

1. `cd frontend` → `npm install` (already done after scaffold).
2. Copy `.env.example` → `.env`. Default targets production: `https://fin-flow-backend-theta.vercel.app/api/v1`. For a **local** API from a physical device, use `http://<your-pc-lan-ip>:8000/api/v1` (not `localhost` from the phone’s point of view).
3. Backend: `CORS_ORIGINS` must allow Expo if you hit web; for native fetch, CORS does not apply the same way — still use a reachable URL.
4. `npx expo start` → open **Expo Go** on the iPhone → scan the QR code (tunnel mode if LAN is blocked).

---

## Authentication model

- **Public:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login` (email + password; server talks to Supabase when `SUPABASE_ANON_KEY` is set).
- **Protected:** all other `/api/v1/*` routes expect  
  `Authorization: Bearer <Supabase access_token>`  
  (same JWT the backend verifies via Supabase JWKS).

**Client responsibilities**

- Store `access_token` (and optionally `refresh_token`, `expires_in`) securely (e.g. `expo-secure-store` — add when you wire auth).
- On 401, clear session and return user to login (refresh flow can use Supabase client later if you add it).
- **Register edge case:** response may include `requires_email_confirmation: true` and omit tokens until the user confirms email — show a “check your inbox” screen.

**Auth DTOs (JSON keys)**

| Endpoint | Method | Body / notes |
|----------|--------|----------------|
| `/auth/register` | POST | `{ "email", "password" }` (password 6–256 chars) |
| `/auth/login` | POST | `{ "email", "password" }` |
| `/auth/me` | GET | — returns profile |
| `/auth/me` | PATCH | optional: `monthly_budget`, `default_currency` (ISO 4217, 3 letters) |
| `/auth/me/budget` | PATCH | `{ "monthly_budget" }` (number or null to clear) |

**`AuthSessionResponse`:** `access_token`, `refresh_token`, `expires_in`, `token_type`, `requires_email_confirmation`, `user_id`, `email`.

**`UserResponse`:** `id`, `email`, `monthly_budget`, `default_currency`, `created_at`, `updated_at`.

---

## Error shape

Structured errors use the app’s `AppHTTPException` format (see backend `exception_handlers`). Clients should read `detail` and optional `code` for mapping to toasts / inline validation.

---

## API surface by area

Base path: `{EXPO_PUBLIC_API_BASE_URL}` — production example: `https://fin-flow-backend-theta.vercel.app/api/v1`; local LAN example: `http://192.168.1.10:8000/api/v1`.

**Pagination:** list endpoints support `skip`, `limit` (defaults often 0 and 50; max 200). Total count is in response header **`X-Total-Count`** where documented below.

### Dashboard

| Method | Path | Auth | Response highlights |
|--------|------|------|------------------------|
| GET | `/dashboard/summary` | Bearer | `active_subscription_count`, `monthly_equivalent_total`, `monthly_budget`, `remaining_budget`, `over_budget`, `limit_warnings[]`, `spend_by_category[]` (`category`, `monthly_equivalent_total`), `expense_total_mtd`, `payment_records_total`, `default_currency` |

**UI ideas:** home dashboard cards, “over budget” banner, category breakdown chart/list, pull-to-refresh.

---

### Subscriptions

| Method | Path | Query / body | Headers |
|--------|------|----------------|---------|
| GET | `/subscriptions` | `skip`, `limit`, `active_only` (optional bool) | `X-Total-Count` |
| POST | `/subscriptions` | create body | — |
| GET | `/subscriptions/{id}` | — | — |
| PUT | `/subscriptions/{id}` | full replacement body | — |
| DELETE | `/subscriptions/{id}` | — | — |

**`billing_cycle` enum:** `weekly` | `monthly` | `quarterly` | `yearly`.

**Create / update fields:** `name`, `amount` (>0), `currency` (3 chars), `billing_cycle`, optional `category`, optional `monthly_limit` (≥0), `start_date`, optional `next_renewal_date`, `is_active`, optional `notes`.

**Response:** includes read-only **`monthly_equivalent`** (derived).

**UI ideas:** list + filters (active/all), detail, create/edit form with date pickers, delete confirm, show next renewal.

---

### Categories

| Method | Path | Headers |
|--------|------|---------|
| GET | `/categories` | `X-Total-Count` |
| POST | `/categories` | — |
| GET | `/categories/{id}` | — |
| PUT | `/categories/{id}` | — |
| DELETE | `/categories/{id}` | — |

**`kind` enum:** `subscription` | `expense` | `both`.

**Fields:** `name`, optional `icon`, optional `color`, `kind`.

**UI ideas:** picker when creating transactions/subscriptions; color dot + name in lists.

---

### Transactions (expenses)

| Method | Path | Query / notes |
|--------|------|----------------|
| GET | `/transactions` | `skip`, `limit`, optional `category_id`, `from_occurred`, `to_occurred` (ISO datetimes) |
| POST | `/transactions` | body |
| GET/PUT/DELETE | `/transactions/{id}` | PUT is full replacement |

**Body:** optional `category_id`, `amount`, `currency`, `occurred_at`, optional `merchant`, optional `notes`.

**UI ideas:** month-scoped list, filters, add expense FAB, link to category.

---

### Payments (payment records)

| Method | Path | Query |
|--------|------|-------|
| GET | `/payments` | `skip`, `limit`, optional `subscription_id` |
| POST | `/payments` | — |
| GET/PUT/DELETE | `/payments/{id}` | — |

**`status`:** `paid` | `pending` | `failed` | `cancelled`.

**`source`:** `manual` | `import` | `system`.

**Body:** optional `subscription_id`, `amount`, `currency`, `paid_at`, optional `period_start` / `period_end`, `status`, `source`, optional `notes`.

**UI ideas:** timeline per subscription, mark paid, edit status.

---

### Budget allocations

| Method | Path | Headers |
|--------|------|---------|
| GET | `/budgets` | `X-Total-Count` |
| POST | `/budgets` | — |
| GET/PUT/DELETE | `/budgets/{id}` | — |

**Body:** `category_id`, `budget_month` (any date in the month — API normalizes), `limit_amount`, `currency`.

**UI ideas:** monthly budget planner grid, per-category cap vs spend (combine with dashboard summary).

---

### Notifications (preferences only)

| Method | Path | Body |
|--------|------|------|
| GET | `/notifications/preferences` | — |
| PUT | `/notifications/preferences` | `email_enabled`, `days_before_renewal` (0–90), `timezone` |

**UI ideas:** settings screen toggles, numeric stepper for days, timezone selector/search.

---

### Exchange rates

| Method | Path | Notes |
|--------|------|-------|
| GET | `/exchange-rates` | **Required query:** `from_date`, `to_date` (dates); optional `base_currency` (3 letters) |
| POST | `/exchange-rates` | upsert: `rate_date`, `base_currency`, `quote_currency`, `rate` |
| DELETE | `/exchange-rates/{rate_id}` | — |

**UI ideas:** simple admin/import tools or read-only FX display for power users; most users may never edit.

---

## Suggested app information architecture (screens)

Build these as stack / tab flows (Expo Router optional — not required for v1).

1. **Auth:** Login, Register, Email confirmation pending.
2. **Home (Dashboard):** summary metrics, warnings, category spend, link to subscriptions/transactions.
3. **Subscriptions:** list, detail, create/edit, payments linked to subscription.
4. **Transactions:** list with filters, create/edit expense.
5. **Categories:** manage categories used by transactions/subscriptions.
6. **Payments:** global payment log or filtered by subscription.
7. **Budgets:** monthly allocations by category.
8. **Settings:** profile (`PATCH /auth/me`), monthly budget, notification preferences, sign out.
9. **Exchange rates (optional):** browse or admin upsert if you expose it to all logged-in users (backend currently requires Bearer for POST/DELETE — align with your product decision).

**Navigation pattern:** bottom tabs for *Home*, *Subscriptions*, *Transactions*, *More* (categories, budgets, settings).

---

## Data & UX conventions

- **Money:** API uses decimals as JSON numbers/strings per FastAPI — parse carefully in JS; consider a small money helper and fixed display rounding.
- **Dates:** ISO 8601 strings; respect user `default_currency` from profile/dashboard when formatting.
- **Offline / errors:** show retry on network failure; don’t cache sensitive tokens in plain AsyncStorage without encryption — prefer secure storage for tokens.

---

## OpenAPI

Live contract: `{origin}/openapi.json` and human docs at `/docs` on the backend host. Regenerate client types from OpenAPI when the API stabilizes (optional `openapi-typescript` workflow).

---

## File checklist in this repo

| File | Role |
|------|------|
| `App.tsx` | Entry UI (NativeWind) + area checklist |
| `global.css` | Tailwind directives |
| `tailwind.config.js` | Tailwind + NativeWind preset |
| `babel.config.js` | Expo + NativeWind + Reanimated |
| `metro.config.js` | `withNativeWind` for CSS |
| `nativewind-env.d.ts` | TS `className` types |
| `.env.example` | `EXPO_PUBLIC_API_BASE_URL` template |

When you add screens under `src/`, they are already included in `tailwind.config.js` `content` paths.
