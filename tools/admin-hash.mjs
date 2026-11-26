// Creates the ADMIN_PASSWORD_HASH line for .env / /etc/claudeiran.env.
// Usage: node tools/admin-hash.mjs
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../admin.mjs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pw = await rl.question('Admin password (min 12 characters): ');
rl.close();
if (pw.length < 12) {
  console.error('Too short - use at least 12 characters.');
  process.exit(1);
}
console.log('\nAdd this line to your env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(pw)}`);
