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
  expect(preprocess('帮我订一份外卖').features.hasActionVerb).toBe(true);
  expect(preprocess('帮我把空调打开').features.hasActionVerb).toBe(true);
  expect(preprocess('解释什么是量子力学').features.hasActionVerb).toBe(false);
});
