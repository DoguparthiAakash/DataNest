// DataNest - Dataset Browser
let datasets = [], filtered = [];

async function init() {
  try {
    const res = await fetch('./datas/index.json');
    datasets = await Promise.all((await res.json()).map(f => fetch(`./datas/${f}`).then(r => r.json())));
  } catch (e) {
    document.getElementById('cards').innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div><h3>Error loading</h3><p>Check your connection.</p></div>';
    return;
  }
  buildTopicFilter();
  buildChips();
  filter();
}

function buildTopicFilter() {
  const sel = document.getElementById('topicFilter');
  if (!sel) return;
  const topics = ['All', ...new Set(datasets.map(d => d.topic))];
  sel.innerHTML = topics.map(t => `<option value="${t === 'All' ? '' : t}">${t === 'All' ? 'All Topics' : t}</option>`).join('');
}

function buildChips() {
  const con = document.getElementById('topicChips');
  if (!con) return;
  const topics = ['All', ...new Set(datasets.map(d => d.topic))];
  con.innerHTML = topics.map(t => `<button class="chip${t === 'All' ? ' active' : ''}" data-topic="${t}">${t}</button>`).join('');
  con.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => setTopic(c.dataset.topic, c)));
}

function setTopic(topic, el) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const sel = document.getElementById('topicFilter');
  if (sel) sel.value = topic === 'All' ? '' : topic;
  filter();
}

function filter() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const topic = document.getElementById('topicFilter')?.value || '';
  const fmt = document.getElementById('formatFilter')?.value || '';
  const sort = document.getElementById('sortBy')?.value || 'newest';

  filtered = datasets.filter(d => {
    const tm = !topic || d.topic === topic;
    const fm = !fmt || d.format === fmt;
    const sm = !q || d.title.toLowerCase().includes(q) || d.topic.toLowerCase().includes(q) || d.overview.toLowerCase().includes(q) || (d.tags?.some(t => t.toLowerCase().includes(q)));
    return tm && fm && sm;
  });

  switch (sort) {
    case 'az': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'za': filtered.sort((a, b) => b.title.localeCompare(a.title)); break;
    case 'oldest': filtered.sort((a, b) => new Date(a.added) - new Date(b.added)); break;
    default: filtered.sort((a, b) => new Date(b.added) - new Date(a.added));
  }

  const cnt = document.getElementById('countDisplay');
  if (cnt) cnt.textContent = filtered.length;
  renderCards();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtNum(n) { if (!n) return '—'; const v = parseInt(n.toString().replace(/,/g, '')); return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v.toLocaleString(); }

function getBadge(d) {
  if (d.access_type === 'api') return `<span class="access-badge api"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>Code</span>`;
  return `<span class="access-badge download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</span>`;
}

function getCardAction(d) {
  if (d.access_type === 'api') {
    const source = d.source?.toLowerCase() || '';
    let primaryBtn = '';
    if (source.includes('huggingface')) primaryBtn = `<a href="${esc(d.visit_url)}" class="btn btn-primary btn-flex" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>HuggingFace</a>`;
    else if (source.includes('kaggle')) primaryBtn = `<a href="${esc(d.visit_url)}" class="btn btn-primary btn-flex" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Kaggle</a>`;
    else primaryBtn = `<a href="#" class="btn btn-primary btn-flex" onclick="event.stopPropagation();openModal('${d.id}');return false;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>View Code</a>`;
    return primaryBtn;
  }
  return `<a href="${esc(d.download_url)}" class="btn btn-primary btn-flex" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</a>`;
}

function renderCards() {
  const con = document.getElementById('cards'), es = document.getElementById('emptyState');
  if (!con) return;
  if (!filtered.length) { con.innerHTML = ''; if (es) es.style.display = 'block'; return; }
  if (es) es.style.display = 'none';
  con.innerHTML = filtered.map((d, i) => `<div class="card" style="animation-delay:${i * 30}ms" onclick="openModal('${d.id}')"><div class="card-header"><span class="topic-badge ${(d.topic || 'other').toLowerCase().replace(/\s+/g, '-')}">${esc(d.topic)}</span>${getBadge(d)}</div><div class="card-title">${esc(d.title)}</div><p class="card-overview">${esc(d.overview)}</p><div class="card-meta">${d.size ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/></svg>${esc(d.size)}</span>` : ''}${d.rows ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>${fmtNum(d.rows)}</span>` : ''}${d.source ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>${esc(d.source)}</span>` : ''}</div><div class="card-footer">${getCardAction(d)}${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-outline" target="_blank" rel="noopener" onclick="event.stopPropagation()">Source</a>` : ''}</div></div>`).join('');
}

function openModal(id) {
  const d = datasets.find(x => x.id === id);
  if (!d) return;
  const tags = d.tags?.length ? `<div class="modal-tags">${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '';
  const code = d.access_type === 'api' && d.usage_code ? `<h4 style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:16px 0 8px">How to Use</h4><div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(d.usage_code)}</code></pre></div>` : '';
  
  let action = '';
  if (d.access_type === 'api') {
    const source = d.source?.toLowerCase() || '';
    if (source.includes('huggingface')) action = `<div class="modal-actions"><a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View on HuggingFace</a><a href="${esc(d.download_url)}" class="btn btn-outline" target="_blank" rel="noopener">Documentation</a></div>`;
    else if (source.includes('kaggle')) action = `<div class="modal-actions"><a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View on Kaggle</a></div>`;
    else action = `<div class="modal-actions">${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Visit Site</a>` : ''}</div>`;
  } else {
    action = `<div class="modal-actions"><a href="${esc(d.download_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</a>${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-outline" target="_blank" rel="noopener">Source</a>` : ''}</div>`;
  }

  document.getElementById('modalContent').innerHTML = `<div class="modal-title">${esc(d.title)}</div><p class="modal-overview">${esc(d.overview)}</p>${d.access_type === 'api' ? '<div class="api-badge-large"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>API / Code Required</div>' : ''}<div class="modal-meta"><div class="modal-meta-item"><div class="modal-meta-val">${esc(d.topic)}</div><div class="modal-meta-label">Topic</div></div><div class="modal-meta-item"><div class="modal-meta-val">${esc(d.format || '—')}</div><div class="modal-meta-label">Format</div></div><div class="modal-meta-item"><div class="modal-meta-val">${esc(d.size || '—')}</div><div class="modal-meta-label">Size</div></div><div class="modal-meta-item"><div class="modal-meta-val">${fmtNum(d.rows)}</div><div class="modal-meta-label">Rows</div></div><div class="modal-meta-item"><div class="modal-meta-val">${esc(d.source || '—')}</div><div class="modal-meta-label">Source</div></div><div class="modal-meta-item"><div class="modal-meta-val">${new Date(d.added).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div><div class="modal-meta-label">Added</div></div></div>${tags}${code}${action}`;
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); document.body.style.overflow = ''; }
function copyCode(btn) { navigator.clipboard.writeText(btn.parentElement.querySelector('code').textContent).then(() => { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }); }

document.addEventListener('DOMContentLoaded', init);
document.getElementById('searchInput')?.addEventListener('input', e => { clearTimeout(window.searchTimeout); window.searchTimeout = setTimeout(filter, 150); });
document.getElementById('topicFilter')?.addEventListener('change', filter);
document.getElementById('formatFilter')?.addEventListener('change', filter);
document.getElementById('sortBy')?.addEventListener('change', filter);
document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
