# AI 适合度判断器（AI-Fit-Judge）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Web 应用，用户输入问题/项目描述，返回 0-100 的「AI 适合度」评分加一句理由；先用零成本规则引擎判断，规则未命中才调用 Haiku。

**Architecture:** 两层判断架构。`evaluator` 编排器先调 `preprocess` 提取特征，再调 `ruleEngine`（基于 JSON 规则库）；规则命中直接返回评分+理由（零 token），未命中才调 `aiJudge`（Haiku）。Express 暴露单一 `/api/evaluate` 端点，原生 HTML/JS 前端渲染结果。

**Tech Stack:** Node.js + Express、@anthropic-ai/sdk（Haiku）、Jest（测试）、原生 HTML + JS 前端。

---

## File Structure

```
ai-fit-judge/
├── package.json                    # 依赖与脚本
├── .env.example                    # ANTHROPIC_API_KEY 模板
├── .gitignore                      # 忽略 node_modules / .env
├── src/
│   ├── preprocess.js               # 文本清洗 + 特征提取
│   ├── rules.json                  # 规则库（数据，与代码解耦）
│   ├── ruleEngine.js               # 加载规则库，匹配特征 → 评分或 null
│   ├── aiJudge.js                  # 调 Haiku，解析 JSON，降级处理
│   ├── evaluator.js                # 编排 preprocess → ruleEngine → aiJudge
│   └── server.js                   # Express，/api/evaluate，静态托管 public/
├── public/
│   ├── index.html                  # 输入框 + 结果卡片
│   └── app.js                      # 前端逻辑：POST /api/evaluate，渲染
└── tests/
    ├── preprocess.test.js
    ├── ruleEngine.test.js
    ├── aiJudge.test.js
    └── evaluator.test.js
```

每个模块单一职责，契约见设计文档第 4 节。

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: 创建 package.json**

Create `package.json`:

```json
{
  "name": "ai-fit-judge",
  "version": "0.1.0",
  "description": "判断一个问题/项目是否适合用 AI 解决",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.1",
    "dotenv": "^16.4.5",
    "express": "^4.21.1"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "jest": {
    "testEnvironment": "node",
    "transform": {}
  }
}
```

- [ ] **Step 2: 创建 .gitignore**

Create `.gitignore`:

```
node_modules/
.env
```

- [ ] **Step 3: 创建 .env.example**

Create `.env.example`:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
PORT=3000
```

- [ ] **Step 4: 安装依赖**

Run: `npm install`
Expected: `node_modules/` 生成，无报错。

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore .env.example
git commit -m "chore: project scaffold"
```

---

## Task 2: preprocess 模块

**Files:**
- Create: `src/preprocess.js`
- Test: `tests/preprocess.test.js`

`preprocess(text)` 输入原始文本，输出 `{ cleaned, features }`。
`cleaned`：去首尾空白、压缩连续空白的文本。
`features`：`{ length, hasMath, hasActionVerb }`。
- `length`：cleaned 的字符数。
- `hasMath`：是否含算式（数字-运算符-数字，如 `1234×5678`、`12+3`）。运算符集合：`+ - * / × ÷` 以及全角。
- `hasActionVerb`：是否含真实世界执行类动词。关键词：`订` `预订` `购买` `打开` `关闭` `取钱` `转账` `寄` `送` `打电话`。

- [ ] **Step 1: 写失败测试**

Create `tests/preprocess.test.js`:

```javascript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- preprocess`
Expected: FAIL，`Cannot find module '../src/preprocess.js'`。

- [ ] **Step 3: 写实现**

Create `src/preprocess.js`:

```javascript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- preprocess`
Expected: PASS，4 个测试全绿。

- [ ] **Step 5: Commit**

```bash
git add src/preprocess.js tests/preprocess.test.js
git commit -m "feat: add preprocess module"
```

---

## Task 3: 规则库 rules.json

**Files:**
- Create: `src/rules.json`

规则库是纯数据。每条规则有：`id`、`category`（cost / risk / impossible）、`match`（匹配条件）、`score`、`reason`。
`match` 支持三种字段（任一满足即命中，按数组顺序优先匹配）：
- `keywords`：cleaned 文本包含任一关键词即命中。
- `feature`：cleaned 特征名（`hasMath` / `hasActionVerb`）为 true 即命中。
- `maxLength` + `keywords`：长度 ≤ maxLength 且含关键词。

- [ ] **Step 1: 创建 rules.json**

Create `src/rules.json`:

```json
{
  "rules": [
    {
      "id": "impossible-action",
      "category": "impossible",
      "match": { "feature": "hasActionVerb" },
      "score": 0,
      "reason": "AI 无法执行真实世界操作（如订餐、开关设备、转账）"
    },
    {
      "id": "cost-math",
      "category": "cost",
      "match": { "feature": "hasMath" },
      "score": 60,
      "reason": "AI 能算，但计算器更准更省"
    },
    {
      "id": "cost-weather-stock",
      "category": "cost",
      "match": { "keywords": ["天气", "股价", "汇率", "几点", "路况"] },
      "score": 65,
      "reason": "AI 能回答，但搜索引擎更快更省，性价比不高"
    },
    {
      "id": "cost-data-processing",
      "category": "cost",
      "match": { "keywords": ["排序", "去重", "求和", "数据透视", "整理表格"] },
      "score": 55,
      "reason": "AI 能处理，但 Excel / 表格工具更高效"
    },
    {
      "id": "cost-survey",
      "category": "cost",
      "match": { "keywords": ["问卷", "满意度调查", "收集反馈", "投票"] },
      "score": 55,
      "reason": "AI 能帮忙，但问卷工具更合适"
    },
    {
      "id": "risk-medical",
      "category": "risk",
      "match": { "keywords": ["吃什么药", "诊断", "病情", "症状", "剂量"] },
      "score": 45,
      "reason": "AI 可给参考，但医疗有风险，建议结合就医"
    },
    {
      "id": "risk-legal",
      "category": "risk",
      "match": { "keywords": ["法律漏洞", "合同效力", "起诉", "违法吗", "判几年"] },
      "score": 45,
      "reason": "AI 可给参考，但法律判断有风险，建议咨询律师"
    },
    {
      "id": "risk-finance",
      "category": "risk",
      "match": { "keywords": ["报税", "应缴税", "退税", "财务报表"] },
      "score": 45,
      "reason": "AI 可给参考，但精确财务计算建议用专业软件或会计"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/rules.json
git commit -m "feat: add rules library"
```

---

## Task 4: ruleEngine 模块

**Files:**
- Create: `src/ruleEngine.js`
- Test: `tests/ruleEngine.test.js`

`evaluateRules(cleaned, features, rules)` 按 `rules` 数组顺序匹配，第一条命中返回 `{ score, reason, ruleId }`，全不命中返回 `null`。
另导出 `loadRules()`：从 `src/rules.json` 读取并返回 rules 数组；文件缺失/解析失败时抛错（fail fast）。

- [ ] **Step 1: 写失败测试**

Create `tests/ruleEngine.test.js`:

```javascript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- ruleEngine`
Expected: FAIL，`Cannot find module '../src/ruleEngine.js'`。

- [ ] **Step 3: 写实现**

Create `src/ruleEngine.js`:

```javascript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- ruleEngine`
Expected: PASS，5 个测试全绿。

- [ ] **Step 5: Commit**

```bash
git add src/ruleEngine.js tests/ruleEngine.test.js
git commit -m "feat: add rule engine"
```

---

## Task 5: aiJudge 模块

**Files:**
- Create: `src/aiJudge.js`
- Test: `tests/aiJudge.test.js`

`aiJudge(cleaned, client)` 调用 Haiku，要求其返回 `{"score": <0-100>, "reason": "<一句话>"}`。
`client` 参数注入便于测试（默认用真实 Anthropic 客户端）。
解析失败重试一次；仍失败则降级返回 `{ score: 50, reason: 'AI 判断暂不可用，以下为粗略估计', degraded: true }`。
成功返回 `{ score, reason, degraded: false }`。

- [ ] **Step 1: 写失败测试**

Create `tests/aiJudge.test.js`:

```javascript
import { aiJudge, SYSTEM_PROMPT } from '../src/aiJudge.js';

function mockClient(responses) {
  let i = 0;
  return {
    messages: {
      create: async () => {
        const text = responses[i++];
        return { content: [{ type: 'text', text }] };
      },
    },
  };
}

test('parses valid JSON response', async () => {
  const client = mockClient(['{"score": 95, "reason": "写作是 AI 强项"}']);
  const r = await aiJudge('帮我写道歉邮件', client);
  expect(r).toEqual({ score: 95, reason: '写作是 AI 强项', degraded: false });
});

test('retries once on bad JSON then succeeds', async () => {
  const client = mockClient(['not json', '{"score": 80, "reason": "ok"}']);
  const r = await aiJudge('问题', client);
  expect(r).toEqual({ score: 80, reason: 'ok', degraded: false });
});

test('degrades after two failures', async () => {
  const client = mockClient(['nope', 'still nope']);
  const r = await aiJudge('问题', client);
  expect(r.degraded).toBe(true);
  expect(r.score).toBe(50);
});

test('system prompt mentions score and reason', () => {
  expect(SYSTEM_PROMPT).toMatch(/score/);
  expect(SYSTEM_PROMPT).toMatch(/reason/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- aiJudge`
Expected: FAIL，`Cannot find module '../src/aiJudge.js'`。

- [ ] **Step 3: 写实现**

Create `src/aiJudge.js`:

```javascript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- aiJudge`
Expected: PASS，4 个测试全绿。

- [ ] **Step 5: Commit**

```bash
git add src/aiJudge.js tests/aiJudge.test.js
git commit -m "feat: add Haiku-based AI judge with retry and degrade"
```

---

## Task 6: evaluator 编排器

**Files:**
- Create: `src/evaluator.js`
- Test: `tests/evaluator.test.js`

`createEvaluator({ rules, aiClient })` 返回一个 `evaluate(text)` 函数。
流程：`preprocess` → `evaluateRules`；命中返回 `{ score, reason, source: 'rule' }`；未命中调 `aiJudge` 返回 `{ score, reason, source: 'ai' }`。
依赖注入 `rules` 和 `aiClient` 便于测试「规则命中不调 AI」。

- [ ] **Step 1: 写失败测试**

Create `tests/evaluator.test.js`:

```javascript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- evaluator`
Expected: FAIL，`Cannot find module '../src/evaluator.js'`。

- [ ] **Step 3: 写实现**

Create `src/evaluator.js`:

```javascript
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- evaluator`
Expected: PASS，2 个测试全绿。

- [ ] **Step 5: Commit**

```bash
git add src/evaluator.js tests/evaluator.test.js
git commit -m "feat: add evaluator orchestrator"
```

---

## Task 7: Express server 与 API

**Files:**
- Create: `src/server.js`

`/api/evaluate` 接收 `{ text }`，校验非空与长度（上限 2000 字），返回 evaluator 结果。
启动时 `loadRules()`（失败则进程崩溃，fail fast）并创建 Anthropic 客户端。
静态托管 `public/`。

- [ ] **Step 1: 写实现**

Create `src/server.js`:

```javascript
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
```

- [ ] **Step 2: 手动冒烟测试（规则命中路径，无需 API key）**

Run:
```bash
node -e "import('./src/evaluator.js').then(async ({createEvaluator})=>{const {loadRules}=await import('./src/ruleEngine.js');const ev=createEvaluator({rules:loadRules(),aiClient:null});console.log(await ev('帮我订外卖'));console.log(await ev('北京今天天气'));})"
```
Expected: 打印 `{ score: 0, reason: ..., source: 'rule' }` 和 `{ score: 65, ..., source: 'rule' }`，不报错（规则命中不触碰 aiClient）。

- [ ] **Step 3: Commit**

```bash
git add src/server.js
git commit -m "feat: add Express server and /api/evaluate endpoint"
```

---

## Task 8: 前端页面

**Files:**
- Create: `public/index.html`
- Create: `public/app.js`

一个输入框 + 提交按钮 + 结果卡片（评分大数字 + 理由 + source 标注）。

- [ ] **Step 1: 创建 index.html**

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI 适合度判断器</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #1a1a1a; }
    h1 { font-size: 1.5rem; }
    textarea { width: 100%; min-height: 80px; padding: 10px; font-size: 1rem; box-sizing: border-box; }
    button { margin-top: 12px; padding: 10px 20px; font-size: 1rem; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: default; }
    .card { margin-top: 24px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; display: none; }
    .score { font-size: 3rem; font-weight: bold; }
    .reason { margin-top: 8px; font-size: 1.1rem; }
    .source { margin-top: 12px; font-size: 0.85rem; color: #888; }
    .error { color: #c00; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>AI 适合度判断器</h1>
  <p>输入一个问题或项目，看看它有多适合用 AI 来解决。</p>
  <textarea id="input" placeholder="例如：帮我写一封道歉邮件"></textarea>
  <button id="submit">判断</button>
  <div id="error" class="error"></div>
  <div id="card" class="card">
    <div class="score"><span id="score"></span><span style="font-size:1.5rem;color:#888">/100</span></div>
    <div class="reason" id="reason"></div>
    <div class="source" id="source"></div>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 app.js**

Create `public/app.js`:

```javascript
const input = document.getElementById('input');
const submit = document.getElementById('submit');
const card = document.getElementById('card');
const scoreEl = document.getElementById('score');
const reasonEl = document.getElementById('reason');
const sourceEl = document.getElementById('source');
const errorEl = document.getElementById('error');

async function evaluate() {
  const text = input.value.trim();
  errorEl.textContent = '';
  card.style.display = 'none';
  if (!text) {
    errorEl.textContent = '请输入一个问题或项目描述';
    return;
  }
  submit.disabled = true;
  submit.textContent = '判断中…';
  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '评估失败';
      return;
    }
    scoreEl.textContent = data.score;
    reasonEl.textContent = data.reason;
    sourceEl.textContent = data.source === 'rule' ? '✓ 规则判断（未消耗 token）' : '⚡ AI 判断';
    card.style.display = 'block';
  } catch {
    errorEl.textContent = '网络错误，请重试';
  } finally {
    submit.disabled = false;
    submit.textContent = '判断';
  }
}

submit.addEventListener('click', evaluate);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) evaluate();
});
```

- [ ] **Step 3: 端到端手动验证**

设置 `.env`（复制 `.env.example` 填入真实 `ANTHROPIC_API_KEY`），然后：

Run: `npm start`
打开 `http://localhost:3000`，依次输入并验证：
- 「帮我订外卖」→ 0 分，标注「规则判断」
- 「北京今天天气」→ 65 分，标注「规则判断」
- 「帮我写一首关于秋天的诗」→ 高分，标注「AI 判断」
- 「我头痛吃什么药」→ 45 分，标注「规则判断」

Expected: 每个输入都返回评分+理由，source 标注正确。

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/app.js
git commit -m "feat: add web frontend"
```

---

## Task 9: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建 README**

Create `README.md`:

```markdown
# AI 适合度判断器（AI-Fit-Judge）

输入一个问题或项目描述，得到 0-100 的「AI 适合度」评分加一句理由。
分越高越适合用 AI 解决。先用零成本规则引擎判断，规则未命中才调用 Haiku，最大化省 token。

## 运行

1. `npm install`
2. `cp .env.example .env`，填入你的 `ANTHROPIC_API_KEY`
3. `npm start`
4. 打开 http://localhost:3000

## 测试

`npm test`

## 架构

详见 `docs/superpowers/specs/2026-06-05-ai-fit-judge-design.md`。
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review

**Spec coverage（设计文档逐节核对）：**
- §1 产品概述 / 目标用户 → README + 整体实现 ✓
- §2 单轴评分（0 分 / 非 0 / 性价比 / 风险 / 性质）→ rules.json（Task 3）+ aiJudge SYSTEM_PROMPT（Task 5）✓
- §3 两层架构 → evaluator（Task 6）✓
- §4 模块契约（preprocess / ruleEngine / aiJudge / evaluator + source 字段）→ Tasks 2/4/5/6 ✓
- §5 规则库（性价比 / 风险 / 不可解 / 模糊区）→ rules.json + evaluateRules 返回 null 走 AI ✓
- §6 技术选型（Node+Express / 原生前端 / JSON 规则库 / Haiku）→ Tasks 1/3/5/7/8 ✓
- §7 错误处理（空/超长 / Haiku 失败降级 / 解析失败重试 / 规则库 fail fast）→ Task 7 校验 + Task 5 重试降级 + Task 4 loadRules 抛错 ✓
- §8 测试策略（四个模块单测 + evaluator 集成 + 端到端）→ Tasks 2/4/5/6 单测 + Task 8 端到端 ✓
- §9 范围与非目标 → 未实现账号/插件/API（符合 YAGNI）✓

**Placeholder scan：** 无 TBD/TODO，每个代码步骤含完整代码。

**Type consistency：**
- `preprocess` → `{ cleaned, features }`，features 含 `length/hasMath/hasActionVerb`，全程一致 ✓
- `evaluateRules(cleaned, features, rules)` → `{ score, reason, ruleId }` 或 null，调用方一致 ✓
- `aiJudge(cleaned, client)` → `{ score, reason, degraded }`，evaluator 取 score/reason ✓
- `createEvaluator({ rules, aiClient })` → `evaluate(text)` → `{ score, reason, source }`，server 与前端字段一致（score/reason/source）✓
- rules.json 中 `match.feature` 值 `hasActionVerb`/`hasMath` 与 preprocess features 名一致 ✓
```
