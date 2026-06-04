import { createEvaluator } from '../src/evaluator.js';

const rules = [
  { id: 'impossible-action', match: { feature: 'hasActionVerb' }, score: 0, reason: 'no exec' },
];

test('rule hit returns source=rule and does NOT call AI', async () => {
  let aiCalled = false;
  const aiClient = { messages: { create: async () => { aiCalled = true; return {}; } } };
  const evaluate = createEvaluator({ rules, aiClient });
  const r = await evaluate('帮我订外卖');
  expect(r).toEqual({ score: 0, reason: 'no exec', source: 'rule' });
  expect(aiCalled).toBe(false);
});

test('rule miss calls AI and returns source=ai', async () => {
  const aiClient = {
    messages: {
      create: async () => ({ content: [{ type: 'text', text: '{"score": 95, "reason": "强项"}' }] }),
    },
  };
  const evaluate = createEvaluator({ rules, aiClient });
  const r = await evaluate('帮我写一首诗');
  expect(r.source).toBe('ai');
  expect(r.score).toBe(95);
  expect(r.reason).toBe('强项');
});
