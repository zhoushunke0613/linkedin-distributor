# LinkedIn Distributor

Standalone tool for scheduling and publishing LinkedIn posts (organic + ads) from a content library. Built as a sibling to the `growth-system` repo — runs on your personal Vercel + GitHub, no org approvals needed.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Postgres (Neon serverless)
- Vercel Cron (token refresh, metrics) + GitHub Actions Cron (publish queue)
- LinkedIn OAuth 2.0 (person + organization scopes)

## First-time local setup

### 1. Provision Neon Postgres

1. Sign up at https://neon.tech
2. Create a project, any region
3. Copy the connection string shown in the dashboard

### 2. Create a LinkedIn Developer App

See the LinkedIn app setup guide in the project discussion thread. You need:
- `CLIENT_ID` and `CLIENT_SECRET` from the Auth tab
- `Share on LinkedIn` + `Sign In with LinkedIn using OpenID Connect` products approved
- Redirect URL `http://localhost:3000/auth/linkedin/callback` added

### 3. Configure env

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — from Neon
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — from LinkedIn Developer Portal
- `LINKEDIN_TOKEN_ENC_KEY` — generate a fresh key:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `APP_ACCESS_PASSWORD` — any string; the app will require HTTP Basic Auth with this password

### 4. Run migrations

```bash
npm run migrate
```

Expected output:
```
+ 001_linkedin_tokens.sql
migrations done
```

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000 — browser will prompt for Basic Auth. Username can be anything, password is `APP_ACCESS_PASSWORD`.

### 6. Connect a LinkedIn identity

Click **Connect as Person** → redirected to LinkedIn → authorize → back at home page with the identity listed.

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # home: connect buttons + identity list
│   ├── auth/linkedin/login/        # OAuth entry (?as=person|organization)
│   └── auth/linkedin/callback/     # OAuth callback → token exchange + upsert
├── lib/
│   ├── env.ts                      # zod-validated env
│   ├── db.ts                       # Neon serverless client
│   ├── crypto.ts                   # AES-256-GCM for token-at-rest
│   └── linkedin/
│       ├── oauth.ts                # authorize URL + code exchange + refresh
│       └── token_store.ts          # DB CRUD, getFreshAccessToken()
├── proxy.ts                        # Basic Auth gate (Next 16 replaces middleware)
scripts/
├── migrate.mjs                     # applies migrations in order
└── migrations/
    └── 001_linkedin_tokens.sql
```

## Deployment (later)

This README will be updated with Vercel + GitHub Actions setup once PR 1 is verified locally.

## Roadmap

- [x] PR 1: OAuth + token store + local dev
- [ ] PR 2: DB schema for `linkedin_publication` + manual scheduling API
- [ ] PR 3: Organic publisher (text / image / multi-image)
- [ ] PR 4: Scheduler + rate limiter + fuzzy time + publish UI
- [ ] PR 5: Organic analytics pull
- [ ] PR 6: Ads publisher (gated on Community Management API approval)
- [ ] PR 7: Learnings sync
- [ ] PR 8: Auto-publish mode
