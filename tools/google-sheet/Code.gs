/**
 * ClaudeIran early-access → Google Sheet (in the owner's Google Drive).
 *
 * server.mjs posts every new or changed sign-up here:
 *   POST { secret, rows: [{ email, name, mobile, role, usecase, source, page, createdAt, updatedAt, consentAt }] }
 * Rows are upserted by email, so retries never create duplicates.
 *
 * Setup (once): see tools/google-sheet/README.md
 *   1. Run setup() from the editor → creates/formats the sheet and the shared secret.
 *   2. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone.
 *   3. Put the /exec URL and the secret in /etc/claudeiran.env on the server.
 */
const SHEET_NAME = 'Early access';
const HEADERS = ['ایمیل', 'نام و نام خانوادگی', 'موبایل', 'نقش', 'کاربرد مورد نظر', 'منبع فرم', 'صفحه', 'زمان ثبت', 'آخرین تغییر', 'زمان رضایت'];
const MOBILE_COL = 3;

function doPost(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || typeof body.secret !== 'string' || body.secret !== secret) return json_({ ok: false, error: 'forbidden' });
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sh = sheet_();
    const last = sh.getLastRow();
    const emails = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).trim().toLowerCase()) : [];
    let added = 0, updated = 0;
    rows.forEach(r => {
      const email = String(r.email || '').trim().toLowerCase();
      if (!email) return;
      const vals = [email, safe_(r.name), String(r.mobile || ''), safe_(r.role), safe_(r.usecase), safe_(r.source), safe_(r.page), date_(r.createdAt), date_(r.updatedAt), date_(r.consentAt)];
      let row = emails.indexOf(email) + 2;
      if (row >= 2) updated++; else { row = emails.length + 2; emails.push(email); added++; }
      sh.getRange(row, MOBILE_COL).setNumberFormat('@'); // keep +98… as text
      sh.getRange(row, 1, 1, vals.length).setValues([vals]);
    });
    return json_({ ok: true, added: added, updated: updated });
  } finally {
    lock.releaseLock();
  }
}

// Health check without data: GET …/exec → {"ok":true}
function doGet() { return json_({ ok: true, service: 'claudeiran-waitlist' }); }

/** Run once from the editor. Creates the sheet and the secret, and logs the secret for the server. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SECRET');
  if (!secret) { secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); props.setProperty('SECRET', secret); }
  sheet_();
  Logger.log('SHEETS_WEBHOOK_SECRET=' + secret);
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0].setName(SHEET_NAME) : ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#181C25').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.getRange('C:C').setNumberFormat('@');
    sh.getRange('H:J').setNumberFormat('yyyy-mm-dd hh:mm');
    sh.setColumnWidths(1, 1, 230); sh.setColumnWidths(2, 1, 180); sh.setColumnWidths(3, 1, 140); sh.setColumnWidths(5, 1, 320);
  }
  return sh;
}

// Values that start with = + - @ would be read as formulas; store them as text.
function safe_(v) { const s = String(v == null ? '' : v); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function date_(v) { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
