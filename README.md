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
