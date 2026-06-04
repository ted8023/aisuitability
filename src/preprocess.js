// Multi-character phrases that unambiguously imply real-world execution.
// Bare single chars (订/送/寄/打开) caused false positives inside ordinary
// words (输送, 打开思路), wrongly forcing a 0 score on AI-suitable tasks.
const ACTION_VERBS = [
  '订外卖', '点外卖', '叫外卖', '订餐', '订座', '订票', '订酒店', '预订',
  '送外卖', '送货', '寄快递', '寄包裹', '取快递', '取钱', '转账', '汇款',
  '打电话', '叫车', '打车', '下单', '充值',
];
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
