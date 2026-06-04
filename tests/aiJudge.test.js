import { aiJudge, SYSTEM_PROMPT } from '../src/aiJudge.js';

function mockClient(responses) {
  let i = 0;
  return {
    messages: {
      create: async () => {
        const text = responses[i++];
        return { content: [{ type: 'text', text }] };
      },
    },
  };
}

test('parses valid JSON response', async () => {
  const client = mockClient(['{"score": 95, "reason": "写作是 AI 强项"}']);
  const r = await aiJudge('帮我写道歉邮件', client);
  expect(r).toEqual({ score: 95, reason: '写作是 AI 强项', degraded: false });
});

test('retries once on bad JSON then succeeds', async () => {
  const client = mockClient(['not json', '{"score": 80, "reason": "ok"}']);
  const r = await aiJudge('问题', client);
  expect(r).toEqual({ score: 80, reason: 'ok', degraded: false });
});

test('degrades after two failures', async () => {
  const client = mockClient(['nope', 'still nope']);
  const r = await aiJudge('问题', client);
  expect(r.degraded).toBe(true);
  expect(r.score).toBe(50);
});

test('system prompt mentions score and reason', () => {
  expect(SYSTEM_PROMPT).toMatch(/score/);
  expect(SYSTEM_PROMPT).toMatch(/reason/);
});
