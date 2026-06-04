import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadRules } from './ruleEngine.js';
import { createEvaluator } from './evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_LEN = 2000;

const rules = loadRules(); // fail fast if rules.json invalid
const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const evaluate = createEvaluator({ rules, aiClient });

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.post('/api/evaluate', async (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: '请输入一个问题或项目描述' });
  }
  if (text.length > MAX_LEN) {
    return res.status(400).json({ error: `输入过长，请控制在 ${MAX_LEN} 字以内` });
  }
  try {
    const result = await evaluate(text);
    res.json(result);
  } catch (err) {
    console.error('evaluate failed:', err);
    res.status(500).json({ error: '评估失败，请稍后重试' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI-Fit-Judge running on http://localhost:${port}`));
