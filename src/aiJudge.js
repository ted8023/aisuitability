export const SYSTEM_PROMPT = `你是「AI 适合度」评估器。给用户输入的问题/项目打一个 0-100 的分数，表示用 AI 解决它有多合适（分越高越合适、越推荐）。

评分原则：
- 0 分：仅当 AI 根本做不了（需要物理动作或真实世界执行，如订餐、开关设备、转账）。
- 只要 AI 有能力解决，分数就大于 0。
- 性价比低（有更简单的工具如搜索/计算器/Excel 能做到）拉低分数，但不归零。
- 有风险（医疗、法律、实时数据、精确财务）拉低分数，但不归零。
- AI 强项（写作、总结、头脑风暴、翻译、代码、解释概念）给高分。

只输出一个 JSON 对象，不要任何额外文字、不要 markdown 代码块：
{"score": <0到100的整数>, "reason": "<一句话理由>"}`;

function tryParse(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.score !== 'number' || typeof obj.reason !== 'string') return null;
    return { score: Math.round(obj.score), reason: obj.reason };
  } catch {
    return null;
  }
}

async function callOnce(cleaned, client) {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: cleaned }],
  });
  const text = res.content?.find((b) => b.type === 'text')?.text ?? '';
  return tryParse(text);
}

export async function aiJudge(cleaned, client) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = await callOnce(cleaned, client);
      if (parsed) return { ...parsed, degraded: false };
    } catch {
      // fall through to retry / degrade
    }
  }
  return { score: 50, reason: 'AI 判断暂不可用，以下为粗略估计', degraded: true };
}
