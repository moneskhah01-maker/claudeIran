# ClaudeIran SaaS: customer panel, owner panel, API gateway

Branch `feature/admin-panel`. Everything lives in `saas/`; `server.mjs` hands each request to `saas.handle()` first.

| URL | What | Who |
|---|---|---|
| `/app/` | customer panel: sign-up/login (SMS code or email+password), API keys, credit, top-ups, usage, quick start | customers |
| `/admin/` | owner panel: overview, top-up review, customers (credit adjust, suspend), early-access list, audit log | owner |
| `/v1/messages`, `/v1/models` | API gateway, same request/response shape as the Messages API, billed from credit | customers' code |
| `/pay/zarinpal/callback` | Zarinpal return URL | Zarinpal |

**Gate G0.** The gateway's upstream is `mock`: it answers locally and calls no model. A real upstream adapter is added in `saas/upstream.mjs` only after G0 is cleared (written confirmation from a licensed supplier of the right to offer the service in this market; see the main README). Until then, sign-ups, keys, top-ups and billing all work for real, but responses are simulated and the panel says so.

## How it fits together

```
server.mjs ── saas/index.mjs ── admin.mjs        owner API (/api/admin/*)
                             ├─ auth.mjs         customer sessions, signup, login, SMS codes ── sms.mjs (console | kavenegar)
                             ├─ app-api.mjs      customer API (/api/app/*)
                             ├─ gateway.mjs      /v1: key -> hold credit -> upstream -> settle ── upstream.mjs (mock)
                             ├─ payments.mjs     top-ups (manual | zarinpal)
                             ├─ ledger.mjs       the only code that changes balances
                             ├─ security.mjs     hashing, tokens, cookies, rate limits, input normalisation
                             └─ db.mjs           Postgres (pg) or PGlite, migrations in saas/migrations/
```

Rules the design relies on:
- **Money** is integer Rial (`BIGINT`). Every balance change is a `ledger` row written in the same transaction; `CHECK (balance >= 0)` and `CHECK (held <= balance)` are enforced by Postgres. The admin overview reconciles ledger sums against balances and warns on any mismatch.
- **API calls reserve, then settle.** Before a request goes upstream, its worst-case cost (estimated input + `max_tokens`) is held with one atomic `UPDATE … WHERE balance - held >= cost`; afterwards the hold is released and the real cost charged, never more than the hold. Holds left by a crash are released after 15 minutes.
- **Secrets are stored as hashes**: passwords (scrypt), API keys, session tokens and SMS codes (SHA-256). A full API key is shown once, at creation.
- **Every customer query is scoped** by the `account_id` from the session, never from the request body.
- **CSRF**: cookie-authenticated POSTs must be same-origin and `application/json`. Sessions are `HttpOnly`, `Secure` (outside localhost), `SameSite=Lax` (customer) / `Strict` (admin).
- **XSS**: panel pages run only same-origin scripts (CSP without `unsafe-inline`), and the UI builds DOM with `textContent`, never `innerHTML` with data.
- Private pages send `X-Robots-Tag: noindex, nofollow` and `X-Frame-Options: DENY`.

## Settings (environment variables)

Without `DATABASE_URL` the SaaS is off and the site runs as before (the `/admin` early-access list still works).

| Variable | Needed for | Example / note |
|---|---|---|
| `DATABASE_URL` | everything except the waitlist | prod `postgres://claudeiran:<SECRET: db password>@127.0.0.1:5432/claudeiran`; dev `pglite:./data/pgdata` |
| `ADMIN_PASSWORD_HASH` | `/admin` login | `node tools/admin-hash.mjs` prints it |
| `PUBLIC_URL` | payment return URL | `https://claudeiran.com` |
| `SMS_PROVIDER` | SMS login | `console` (default: code printed to the server log, dev only) or `kavenegar` |
| `KAVENEGAR_API_KEY`, `KAVENEGAR_TEMPLATE` | `SMS_PROVIDER=kavenegar` | a *verify* template containing `%token%` |
| `MANUAL_PAY_INFO` | manual top-up | the card/account text shown to the customer |
| `ZARINPAL_MERCHANT_ID` | online payment | turns the Zarinpal option on |
| `ZARINPAL_SANDBOX` | testing | `1` = Zarinpal's sandbox gateway |
| `TOPUP_MIN_RIAL`, `TOPUP_MAX_RIAL` | limits | defaults 1,000,000 and 1,000,000,000 Rial |
| `UPSTREAM` | gateway | `mock` (only option until G0) |

Prices are in `saas/pricing.json` (Rial per million tokens). **They are placeholders**; the server logs a warning while `"placeholder": true`.

## Run locally

```powershell
npm install
npm test                                   # 12 tests on an in-memory database
npm run build                              # the landing (dist/) is still served by the same server
# add to .env:  DATABASE_URL=pglite:./data/pgdata   and   ADMIN_PASSWORD_HASH=...   (node tools/admin-hash.mjs)
node server.mjs 5230                       # http://localhost:5230/app/  and  /admin/
```

With `SMS_PROVIDER` unset, the SMS code appears in the server console. PGlite (Postgres compiled to WebAssembly) keeps the dev database in `data/pgdata` (git-ignored); delete the folder to start over.

## Production set-up (one time, on the VPS)

Not done yet. Steps, in order:

1. Install PostgreSQL and create the database (as root):
   ```bash
   apt-get update && apt-get install -y postgresql
   sudo -u postgres psql -c "CREATE ROLE claudeiran LOGIN PASSWORD '<SECRET: db password>';"
   sudo -u postgres psql -c "CREATE DATABASE claudeiran OWNER claudeiran;"
   ```
   Postgres listens on localhost only by default; keep it that way.
2. Check `npm` exists next to Node (`npm -v`); the deploy runs `npm ci --omit=dev` in each new release.
3. Add the settings above to `/etc/claudeiran.env` (already loaded by `claudeiran.service`), at least `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `PUBLIC_URL`. Keep the file `chmod 600`.
4. Deploy as usual: `npm run build && bash tools/deploy-vps.sh`. Migrations run automatically at start-up.
5. Backups: nightly `pg_dump` to a file outside the releases, plus an off-server copy:
   ```bash
   echo '15 3 * * * postgres pg_dump -Fc claudeiran > /var/backups/claudeiran-$(date +\%u).dump' > /etc/cron.d/claudeiran-backup
   ```
   Restore test: `pg_restore -d claudeiran_test /var/backups/claudeiran-1.dump`.
6. Smoke test: sign up at `/app/`, create a key, ask the admin to credit it, call `/v1/messages`, confirm the balance dropped and `/admin/` shows "ledger ok".

## Changing the schema

Never edit a migration that has run in production. Add `saas/migrations/002_<what>.sql`; it runs once, in a transaction, at the next start.

## Not built yet (next steps, roughly in order)

- **Password reset** for email accounts (needs an email provider), and linking a mobile number to an email account.
- Streaming (`stream: true`) in the gateway.
- Invoices / receipts (PDF) for top-ups; Zarinpal re-verify button for payments left `pending`.
- Admin two-factor login; admin sessions in the database so a restart does not log out.
- Teams: several users per account, roles, invites (the schema already puts keys and credit on `accounts`).
- Per-key spending limits and alerts (the console mock-up's budget slider).
- The real upstream adapter, after G0.
