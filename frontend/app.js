const form = document.getElementById('genForm');
const topicEl = document.getElementById('topic');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnSpinner = submitBtn.querySelector('.btn-spinner');
const outputEl = document.getElementById('output');
const placeholderEl = document.getElementById('placeholder');
const errorEl = document.getElementById('error');
const copyBtn = document.getElementById('copyBtn');
const healthPill = document.getElementById('healthPill');
const modelLabel = document.getElementById('modelLabel');

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnSpinner.hidden = !loading;
  btnText.textContent = loading ? 'Generating…' : 'Generate';
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = '';
}

function setOutput(text) {
  if (!text) {
    outputEl.hidden = true;
    placeholderEl.hidden = false;
    copyBtn.disabled = true;
    outputEl.textContent = '';
    return;
  }
  placeholderEl.hidden = true;
  outputEl.hidden = false;
  outputEl.textContent = text;
  copyBtn.disabled = false;
}

async function checkHealth() {
  try {
    const r = await fetch('/api/health');
    const data = await r.json();
    if (data.ok) {
      healthPill.textContent = 'API ready';
      healthPill.classList.add('ok');
      healthPill.classList.remove('bad');
      modelLabel.textContent = data.model || '—';
    } else {
      throw new Error('Bad health response');
    }
  } catch {
    healthPill.textContent = 'API unreachable';
    healthPill.classList.add('bad');
    healthPill.classList.remove('ok');
    modelLabel.textContent = '—';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  setOutput('');

  const payload = {
    topic: topicEl.value.trim(),
    type: document.getElementById('type').value,
    length: document.getElementById('length').value,
    tone: document.getElementById('tone').value,
    audience: document.getElementById('audience').value.trim() || 'general readers',
    extra: document.getElementById('extra').value.trim(),
  };

  setLoading(true);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showError(data.error || `Request failed (${res.status})`);
      return;
    }
    if (data.model) modelLabel.textContent = data.model;
    setOutput(data.text || '');
  } catch {
    showError('Network error. Is the server running?');
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener('click', async () => {
  const text = outputEl.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    setTimeout(() => {
      copyBtn.textContent = prev;
    }, 1500);
  } catch {
    showError('Could not copy to clipboard.');
  }
});

checkHealth();
