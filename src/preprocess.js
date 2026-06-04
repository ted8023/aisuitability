const ACTION_VERBS = ['订', '预订', '购买', '打开', '关闭', '取钱', '转账', '寄', '送', '打电话'];
const MATH_RE = /\d+\s*[+\-*/×÷]\s*\d+/;

export function preprocess(text) {
  const cleaned = String(text ?? '').trim().replace(/\s+/g, ' ');
  const features = {
    length: cleaned.length,
    hasMath: MATH_RE.test(cleaned),
    hasActionVerb: ACTION_VERBS.some((v) => cleaned.includes(v)),
  };
  return { cleaned, features };
}
