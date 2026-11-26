// Upstream "port": where the gateway sends a validated request after credit is reserved.
// Every adapter has the same shape:
//   async messages(body) -> { status, json, usage: { input_tokens, output_tokens } }
//
//   UPSTREAM=mock (default, and the only adapter included): answers locally with an Anthropic-shaped
//   message, so accounts, keys, holds, billing and usage history can be built and tested end to end.
//
// A real adapter is added only after gate G0 (README): written confirmation from a licensed supplier of
// the right to offer the service in the target market. It goes here as one more branch in createUpstream,
// using that supplier's endpoint and credentials, and nothing else in the app changes.

const estimateTokens = text => Math.ceil(String(text).length / 3);

export function createUpstream(env = process.env) {
  const name = env.UPSTREAM || 'mock';
  if (name === 'mock') {
    return {
      name: 'mock',
      async messages(body) {
        const prompt = JSON.stringify([body.system ?? '', body.messages]);
        const last = [...body.messages].reverse().find(m => m.role === 'user');
        const said = typeof last?.content === 'string' ? last.content : (last?.content || []).map(c => c.text || '').join(' ');
        const text = `[mock] این پاسخ آزمایشی است و هیچ مدلی فراخوانی نشده. پیام شما: «${said.slice(0, 200)}»`;
        const usage = { input_tokens: estimateTokens(prompt), output_tokens: Math.min(estimateTokens(text), body.max_tokens) };
        return {
          status: 200,
          usage,
          json: {
            id: 'msg_mock_' + Date.now().toString(36), type: 'message', role: 'assistant', model: body.model,
            content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage,
          },
        };
      },
    };
  }
  throw new Error(`UPSTREAM=${name} is not available. Only "mock" is included until gate G0 is cleared (see saas/upstream.mjs).`);
}
