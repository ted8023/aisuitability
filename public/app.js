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
