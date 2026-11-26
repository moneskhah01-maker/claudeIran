// SMS "port": the app calls sms.sendOtp(mobile, code) and does not know which provider is behind it.
//   SMS_PROVIDER=console   (default) prints the code to the server log: development only
//   SMS_PROVIDER=kavenegar KAVENEGAR_API_KEY=..., KAVENEGAR_TEMPLATE=... (a "verify" template with %token%)
// Adding another provider (SMS.ir, Melipayamak...) = one more object with the same sendOtp shape.

export function createSms(env = process.env, { fetch = globalThis.fetch } = {}) {
  const provider = env.SMS_PROVIDER || 'console';

  if (provider === 'console') {
    if (env.NODE_ENV === 'production') console.warn('[sms] SMS_PROVIDER=console in production: codes are only logged, not sent');
    return {
      name: 'console',
      async sendOtp(mobile, code) { console.log(`[sms:console] code for ${mobile}: ${code}`); },
    };
  }

  if (provider === 'kavenegar') {
    const key = env.KAVENEGAR_API_KEY, template = env.KAVENEGAR_TEMPLATE;
    if (!key || !template) throw new Error('SMS_PROVIDER=kavenegar needs KAVENEGAR_API_KEY and KAVENEGAR_TEMPLATE');
    return {
      name: 'kavenegar',
      async sendOtp(mobile, code) {
        // Kavenegar "verify/lookup" sends a pre-approved template, which is faster and not filtered like free text.
        const receptor = '0' + mobile.slice(3); // +989121234567 -> 09121234567
        const url = `https://api.kavenegar.com/v1/${encodeURIComponent(key)}/verify/lookup.json?` +
          new URLSearchParams({ receptor, token: code, template });
        const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.return?.status !== 200) throw new Error(`kavenegar ${r.status} ${j?.return?.status ?? ''}`);
      },
    };
  }

  throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
}
