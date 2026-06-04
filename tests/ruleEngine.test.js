import { evaluateRules, loadRules } from '../src/ruleEngine.js';

const rules = [
  { id: 'impossible-action', match: { feature: 'hasActionVerb' }, score: 0, reason: 'no exec' },
  { id: 'cost-weather', match: { keywords: ['天气'] }, score: 65, reason: 'use search' },
];

test('matches by feature', () => {
  const r = evaluateRules('帮我订外卖', { hasActionVerb: true }, rules);
  expect(r).toEqual({ score: 0, reason: 'no exec', ruleId: 'impossible-action' });
});

test('matches by keyword', () => {
  const r = evaluateRules('北京今天天气', { hasActionVerb: false }, rules);
  expect(r).toEqual({ score: 65, reason: 'use search', ruleId: 'cost-weather' });
});

test('returns null when no rule matches', () => {
  const r = evaluateRules('帮我写一首诗', { hasActionVerb: false }, rules);
  expect(r).toBeNull();
});

test('first matching rule wins (order priority)', () => {
  const r = evaluateRules('订天气', { hasActionVerb: true }, rules);
  expect(r.ruleId).toBe('impossible-action');
});

test('loadRules returns non-empty array from rules.json', () => {
  const loaded = loadRules();
  expect(Array.isArray(loaded)).toBe(true);
  expect(loaded.length).toBeGreaterThan(0);
});
