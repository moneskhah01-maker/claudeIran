// API gateway: POST /v1/messages, the same request and response shape as the Messages API,
// authenticated with a ClaudeIran API key and billed from the account's credit.
//
// Flow for every request:
//   1. find the key (by hash) -> account          4. call the upstream adapter
//   2. validate body, price the worst case         5. settle: release hold, charge real cost (never more than the hold)
//   3. reserve that much credit + log "pending"    6. return the upstream answer
import { readFileSync } from 'node:fs';
import { sha256, rateLimiter } from './security.mjs';
import { hold, settle, InsufficientFunds } from './ledger.mjs';

const PRICING = JSON.parse(readFileSync(new URL('./pricing.json', import.meta.url), 'utf8'));
if (PRICING.placeholder) console.warn('[gateway] saas/pricing.json has placeholder prices');

export const pricing = PRICING;
export const cost = (p, input, output) => Math.ceil((input * p.input + output * p.output) / 1e6);
// Persian text often needs more tokens per character than English, so estimate high: the hold must cover the real cost.
const estimateInput = body => Math.ceil(JSON.stringify([body.system ?? '', body.messages, body.tools ?? []]).length / 2) + 50;

const err = (type, message) => ({ type: 'error', error: { type, message } });

function apiKeyFrom(req) {
  const h = req.headers['x-api-key'] || '';
  if (h) return String(h).trim();
  const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export function validateBody(b) {
  const p = PRICING.models[b.model];
  if (!p) return { error: `unknown model; available: ${Object.keys(PRICING.models).join(', ')}` };
  if (!Number.isInteger(b.max_tokens) || b.max_tokens < 1 || b.max_tokens > p.maxOutput) return { error: `max_tokens must be an integer from 1 to ${p.maxOutput}` };
  if (!Array.isArray(b.messages) || !b.messages.length) return { error: 'messages must be a non-empty array' };
  if (b.messages.some(m => !m || !['user', 'assistant'].includes(m.role) || m.content == null)) return { error: 'each message needs role user|assistant and content' };
  if (b.stream) return { error: 'stream: true is not supported yet' };
  return { price: p };
}

export function createGateway({ db, upstream, send, readJson }) {
  const perKey = rateLimiter({ max: 60, windowMs: 60_000 });

  async function messages(req, res) {
    const key = apiKeyFrom(req);
    if (!key) return send(req, res, 401, err('authentication_error', 'missing x-api-key header'));
    const [k] = await db.query(
      `SELECT k.id, k.account_id FROM api_keys k
         JOIN accounts a ON a.id = k.account_id JOIN users u ON u.id = a.owner_id
        WHERE k.key_hash = $1 AND k.revoked_at IS NULL AND u.status = 'active'`, [sha256(key)]);
    if (!k) return send(req, res, 401, err('authentication_error', 'invalid API key'));
    if (perKey.over(k.id)) return send(req, res, 429, err('rate_limit_error', 'too many requests for this key'), undefined, { 'Retry-After': '60' });

    let body;
    try { body = await readJson(req, 2 * 1024 * 1024); }
    catch { return send(req, res, 400, err('invalid_request_error', 'body must be a JSON object up to 2 MB')); }
    const v = validateBody(body);
    if (v.error) return send(req, res, 400, err('invalid_request_error', v.error));

    const maxCost = cost(v.price, estimateInput(body), body.max_tokens);
    let usageId;
    try {
      usageId = await db.tx(async t => {
        await hold(t, k.account_id, maxCost);
        const [u] = await t.query(
          `INSERT INTO usage_events (account_id, api_key_id, model, hold, upstream) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [k.account_id, k.id, body.model, maxCost, upstream.name]);
        return u.id;
      });
    } catch (e) {
      if (e instanceof InsufficientFunds) return send(req, res, 402, err('insufficient_credit', 'not enough credit for this request; top up at /app'));
      throw e;
    }

    const started = Date.now();
    let out, failure = null;
    try { out = await upstream.messages(body); }
    catch (e) { failure = e; }
    const latency = Date.now() - started;

    // Settle in every case. If the upstream reports more tokens than we reserved for, we absorb the
    // difference (charge = the hold): the customer is never charged more than the reservation they saw.
    const ok = !failure && out.status === 200;
    const input = ok ? out.usage.input_tokens : 0, output = ok ? out.usage.output_tokens : 0;
    const charge = ok ? Math.min(cost(v.price, input, output), maxCost) : 0;
    await db.tx(async t => {
      await settle(t, { accountId: k.account_id, held: maxCost, cost: charge, ref: `usage:${usageId}` });
      await t.query(
        `UPDATE usage_events SET status = $2, input_tokens = $3, output_tokens = $4, cost = $5, latency_ms = $6, error = $7, settled_at = now() WHERE id = $1`,
        [usageId, ok ? 'ok' : 'error', input, output, charge, latency, ok ? null : String(failure?.message || `upstream ${out?.status}`).slice(0, 300)]);
      await t.query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [k.id]);
    });

    const extra = { 'x-ci-cost-rial': String(charge), 'x-ci-upstream': upstream.name, 'x-ci-request-id': String(usageId) };
    if (failure) {
      console.error('[gateway] upstream failed:', failure.message);
      return send(req, res, 502, err('api_error', 'upstream unavailable; you were not charged'), undefined, extra);
    }
    return send(req, res, out.status, out.json, undefined, extra);
  }

  // If the process dies mid-request, its hold would stay reserved forever. On start-up and every few
  // minutes, release holds older than 15 minutes (no charge) and mark them as errors.
  async function releaseStaleHolds() {
    const stale = await db.query(`SELECT id, account_id, hold FROM usage_events WHERE status = 'pending' AND created_at < now() - interval '15 minutes'`);
    for (const u of stale) {
      await db.tx(async t => {
        const [still] = await t.query(`UPDATE usage_events SET status = 'error', error = 'abandoned', settled_at = now() WHERE id = $1 AND status = 'pending' RETURNING id`, [u.id]);
        if (still) await settle(t, { accountId: u.account_id, held: u.hold, cost: 0 });
      });
    }
    if (stale.length) console.warn(`[gateway] released ${stale.length} stale hold(s)`);
  }

  return {
    releaseStaleHolds,
    routes: {
      'POST /v1/messages': messages,
      'GET /v1/models': (req, res) => send(req, res, 200, {
        data: Object.entries(PRICING.models).map(([id, p]) => ({ type: 'model', id, display_name: p.label })),
      }),
    },
  };
}
