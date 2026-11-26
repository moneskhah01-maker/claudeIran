// The only code that changes an account's money. Every function takes a transaction handle `t`,
// so the balance change and its ledger row are committed together or not at all.
//
//   balance  = money the customer has (sum of their ledger rows; kept here as a cached column)
//   held     = part of balance reserved by API calls still running
//   available = balance - held  (what a new API call may reserve)

export class InsufficientFunds extends Error { constructor() { super('insufficient_funds'); this.code = 'insufficient_funds'; } }

// Credit (+) or debit (-) with a ledger row. A debit that would make balance < held, or < 0,
// is refused by the CHECK constraints in the schema, and we turn that into InsufficientFunds.
export async function post(t, { accountId, amount, kind, ref = null, note = null, actor = 'system' }) {
  if (!Number.isSafeInteger(amount) || amount === 0) throw new Error('amount must be a non-zero integer (Rial)');
  let row;
  try {
    [row] = await t.query('UPDATE accounts SET balance = balance + $2 WHERE id = $1 RETURNING balance, held', [accountId, amount]);
  } catch (e) {
    if (e.code === '23514') throw new InsufficientFunds(); // check_violation
    throw e;
  }
  if (!row) throw new Error(`account ${accountId} not found`);
  await t.query('INSERT INTO ledger (account_id, amount, kind, ref, note, actor) VALUES ($1, $2, $3, $4, $5, $6)',
    [accountId, amount, kind, ref, note, actor]);
  return row;
}

// Reserve credit for an API call before sending it upstream. One UPDATE with the condition inside it
// is atomic: two parallel calls cannot both reserve the same last Rial.
export async function hold(t, accountId, amount) {
  const [row] = await t.query(
    'UPDATE accounts SET held = held + $2 WHERE id = $1 AND balance - held >= $2 RETURNING balance, held',
    [accountId, amount]);
  if (!row) throw new InsufficientFunds();
  return row;
}

// Finish an API call: drop the reservation and charge what it really cost (cost <= hold).
export async function settle(t, { accountId, held, cost, ref }) {
  await t.query('UPDATE accounts SET held = held - $2 WHERE id = $1', [accountId, held]);
  if (cost > 0) await post(t, { accountId, amount: -cost, kind: 'usage', ref });
}

// Ledger total must always equal the cached balance; used by tests and the admin health check.
export async function reconcile(db) {
  return db.query(
    `SELECT a.id, a.balance, COALESCE(sum(l.amount), 0) AS ledger_sum
       FROM accounts a LEFT JOIN ledger l ON l.account_id = a.id
      GROUP BY a.id HAVING a.balance <> COALESCE(sum(l.amount), 0)`);
}
