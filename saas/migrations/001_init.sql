-- ClaudeIran SaaS: first schema.
-- Rules this schema enforces (so a bug in app code cannot break them):
--   * money is an integer number of Rial (BIGINT), never a float
--   * accounts.balance can never go below zero (CHECK)
--   * every change to a balance has a row in ledger (app code does both in one transaction)
--   * secrets (passwords, API keys, session tokens, OTP codes) are stored only as hashes

CREATE TABLE users (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  email              TEXT UNIQUE,
  mobile             TEXT UNIQUE,                 -- E.164, e.g. +989121234567
  password_hash      TEXT,                        -- NULL for users who only log in by SMS code
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  mobile_verified_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);

-- Credit belongs to an account, not a user, so teams can be added later
-- (several users -> one account) without moving any money or keys.
CREATE TABLE accounts (
  id         BIGSERIAL PRIMARY KEY,
  owner_id   BIGINT NOT NULL UNIQUE REFERENCES users(id),
  balance    BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  held       BIGINT NOT NULL DEFAULT 0 CHECK (held >= 0),   -- reserved by API calls in progress
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (held <= balance)
);

-- Append-only record of every real money movement. Never UPDATE or DELETE rows here.
CREATE TABLE ledger (
  id         BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id),
  amount     BIGINT NOT NULL CHECK (amount <> 0),           -- + credit, - debit (Rial)
  kind       TEXT NOT NULL CHECK (kind IN ('topup', 'usage', 'adjustment', 'refund')),
  ref        TEXT,                                          -- payment:12, usage:345 ...
  note       TEXT,
  actor      TEXT NOT NULL DEFAULT 'system',                -- 'system', 'admin', 'user:7'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ledger_account_idx ON ledger (account_id, created_at DESC);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE otp_codes (
  id         BIGSERIAL PRIMARY KEY,
  mobile     TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  attempts   INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX otp_mobile_idx ON otp_codes (mobile, created_at DESC);

CREATE TABLE api_keys (
  id           BIGSERIAL PRIMARY KEY,
  account_id   BIGINT NOT NULL REFERENCES accounts(id),
  name         TEXT NOT NULL,
  prefix       TEXT NOT NULL,                 -- first characters, shown so users can tell keys apart
  key_hash     TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_account_idx ON api_keys (account_id);

-- One row per gateway request. 'pending' rows hold credit until settled.
CREATE TABLE usage_events (
  id            BIGSERIAL PRIMARY KEY,
  account_id    BIGINT NOT NULL REFERENCES accounts(id),
  api_key_id    BIGINT REFERENCES api_keys(id),
  model         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'error')),
  hold          BIGINT NOT NULL DEFAULT 0,
  input_tokens  INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cost          BIGINT NOT NULL DEFAULT 0,
  upstream      TEXT NOT NULL,
  error         TEXT,
  latency_ms    INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at    TIMESTAMPTZ
);
CREATE INDEX usage_account_idx ON usage_events (account_id, created_at DESC);
CREATE INDEX usage_pending_idx ON usage_events (created_at) WHERE status = 'pending';

CREATE TABLE payments (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES accounts(id),
  provider    TEXT NOT NULL CHECK (provider IN ('manual', 'zarinpal')),
  amount      BIGINT NOT NULL CHECK (amount > 0),               -- Rial
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected', 'failed')),
  authority   TEXT UNIQUE,                                      -- Zarinpal payment id
  ref_id      TEXT,                                             -- bank / gateway reference
  receipt     TEXT,                                             -- manual: tracking number the customer typed
  card_pan    TEXT,                                             -- masked card number from the gateway
  note        TEXT,                                             -- admin note on review
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX payments_account_idx ON payments (account_id, created_at DESC);
CREATE INDEX payments_pending_idx ON payments (created_at) WHERE status = 'pending';

-- Who did what, for admin actions and money changes.
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     JSONB,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
