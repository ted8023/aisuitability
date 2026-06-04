import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadRules() {
  const raw = readFileSync(join(__dirname, 'rules.json'), 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.rules || !Array.isArray(parsed.rules) || parsed.rules.length === 0) {
    throw new Error('rules.json must contain a non-empty "rules" array');
  }
  return parsed.rules;
}

function matches(rule, cleaned, features) {
  const m = rule.match || {};
  if (m.feature && features[m.feature]) return true;
  if (m.keywords && m.keywords.some((k) => cleaned.includes(k))) {
    if (m.maxLength && cleaned.length > m.maxLength) return false;
    return true;
  }
  return false;
}

export function evaluateRules(cleaned, features, rules) {
  for (const rule of rules) {
    if (matches(rule, cleaned, features)) {
      return { score: rule.score, reason: rule.reason, ruleId: rule.id };
    }
  }
  return null;
}
