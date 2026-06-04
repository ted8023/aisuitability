import { preprocess } from '../src/preprocess.js';

test('trims and collapses whitespace', () => {
  const { cleaned } = preprocess('  你好   世界  ');
  expect(cleaned).toBe('你好 世界');
});

test('length reflects cleaned text', () => {
  const { features } = preprocess('水的沸点');
  expect(features.length).toBe(4);
});

test('detects math expression', () => {
  expect(preprocess('1234×5678=?').features.hasMath).toBe(true);
  expect(preprocess('12+3 等于多少').features.hasMath).toBe(true);
  expect(preprocess('帮我写邮件').features.hasMath).toBe(false);
});

test('detects real-world action verb', () => {
  expect(preprocess('帮我订外卖').features.hasActionVerb).toBe(true);
  expect(preprocess('帮我寄快递').features.hasActionVerb).toBe(true);
  expect(preprocess('帮我转账给房东').features.hasActionVerb).toBe(true);
  expect(preprocess('解释什么是量子力学').features.hasActionVerb).toBe(false);
});

test('does NOT false-positive action verb on ordinary words', () => {
  // 送 inside 输送 — an explanation task, must not be flagged as a real-world action
  expect(preprocess('解释一下血液输送氧气的原理').features.hasActionVerb).toBe(false);
  // 打开 inside 打开思路 — a writing task, must not be flagged
  expect(preprocess('帮我打开思路写一篇文章').features.hasActionVerb).toBe(false);
});
