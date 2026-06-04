import { preprocess } from './preprocess.js';
import { evaluateRules } from './ruleEngine.js';
import { aiJudge } from './aiJudge.js';

export function createEvaluator({ rules, aiClient }) {
  return async function evaluate(text) {
    const { cleaned, features } = preprocess(text);
    const ruleResult = evaluateRules(cleaned, features, rules);
    if (ruleResult) {
      return { score: ruleResult.score, reason: ruleResult.reason, source: 'rule' };
    }
    const ai = await aiJudge(cleaned, aiClient);
    return { score: ai.score, reason: ai.reason, source: 'ai' };
  };
}
