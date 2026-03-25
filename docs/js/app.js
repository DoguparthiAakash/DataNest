// DataNest - Dataset Browser
console.log("DataNest Portal v1.0.3 - Automated Dataset Discovery");
let datasets = [], filtered = [];
const PER_PAGE = 20;
let currentPage = 1;
let selectedTag = '';
let isInitialized = false;

async function init() {
  if (isInitialized) return;
  isInitialized = true;
  let fileList = [];
  
  // Try dynamic discovery via GitHub API (for GitHub Pages hosting)
  // This allows the site to pick up new files even before the next deployment
  try {
    const isGitHubPages = window.location.hostname.includes('github.io');
    const repoPath = isGitHubPages ? window.location.pathname.split('/')[1] : 'DataNest'; 
    const owner = isGitHubPages ? window.location.hostname.split('.')[0] : 'DoguparthiAakash';
    
    // Fallback Repo Detection for Custom Domains or Local Dev
    const apiUrl = `https://api.github.com/repos/${owner}/${repoPath}/contents/docs/datas`;
    
    const apiRes = await fetch(apiUrl);
    if (apiRes.ok) {
      const data = await apiRes.json();
      fileList = data
        .filter(item => item.name.endsWith('.json') && item.name !== 'index.json')
        .map(item => item.name);
      console.log(`Auto-discovered ${fileList.length} datasets via GitHub API (${owner}/${repoPath})`);
    }
  } catch (e) {
    console.warn("GitHub API discovery not available or failed. Falling back to index.json.", e);
  }

  // Fallback to manual index.json if API discovery failed or returned no files
  if (fileList.length === 0) {
    try {
      const res = await fetch('./datas/index.json');
      if (res.ok) {
        fileList = await res.json();
        console.log(`Loaded ${fileList.length} datasets via index.json registry`);
      }
    } catch (e) {
      document.getElementById('cards').innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div><h3>Error loading</h3><p>Check your connection.</p></div>';
      return;
    }
  }

  try {
    datasets = await Promise.all(fileList.map(f => fetch(`./datas/${f}`).then(r => r.json())));
  } catch (e) {
    console.error("Error loading individual dataset files:", e);
    document.getElementById('cards').innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div><h3>Error loading data</h3></div>';
    return;
  }

  buildAreaFilter();
  buildTaskFilter();
  buildTypeFilter();
  buildChips();
  buildTagChips();
  filter();
}

function buildAreaFilter() {
  const sel = document.getElementById('areaFilter');
  if (!sel) return;
  const areas = ['All', ...new Set(datasets.map(d => d.area || 'Other'))];
  sel.innerHTML = areas.map(a => `<option value="${a === 'All' ? '' : a}">${a === 'All' ? 'All Areas' : a}</option>`).join('');
}

function buildTaskFilter() {
  const sel = document.getElementById('taskFilter');
  if (!sel) return;
  const tasks = ['All', ...new Set(datasets.map(d => d.task || 'Other'))];
  sel.innerHTML = tasks.map(t => `<option value="${t === 'All' ? '' : t}">${t === 'All' ? 'All Tasks' : t}</option>`).join('');
}

function buildTypeFilter() {
  const sel = document.getElementById('typeFilter');
  if (!sel) return;
  const types = ['All', ...new Set(datasets.map(d => d.data_type || 'Other'))];
  sel.innerHTML = types.map(t => `<option value="${t === 'All' ? '' : t}">${t === 'All' ? 'All Types' : t}</option>`).join('');
}

function buildChips() {
  const con = document.getElementById('topicChips');
  if (!con) return;
  const areas = ['All', ...new Set(datasets.map(d => d.area || 'Other'))];
  con.innerHTML = areas.map(a => `<button class="chip${a === 'All' ? ' active' : ''}" data-area="${a}">${a}</button>`).join('');
  con.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => setArea(c.dataset.area, c)));
}

function setArea(area, el) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const sel = document.getElementById('areaFilter');
  if (sel) sel.value = area === 'All' ? '' : area;
  selectedTag = '';
  document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
  currentPage = 1;
  filter();
}

function buildTagChips() {
  const con = document.getElementById('tagChips');
  if (!con) return;
  
  const topics = new Set(datasets.map(d => (d.area || d.topic || '').toLowerCase().trim()));
  const tagCounts = {};
  
  datasets.forEach(d => {
    (d.tags || []).forEach(t => {
      const cleanTag = t.trim();
      const lowerTag = cleanTag.toLowerCase();
      if (!topics.has(lowerTag)) {
        // Keep original case but group by lowercase
        // For simplicity, we'll just use the first version we encounter or 
        // a consistent case. Let's use the lowercase version for the key
        // to ensure we don't have both "NLP" and "nlp"
        tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1;
      }
    });
  });
  
  const sortedTags = Object.keys(tagCounts)
    .sort((a, b) => tagCounts[b] - tagCounts[a])
    .slice(0, 15);
  
  if (sortedTags.length === 0) {
    con.style.display = 'none';
    return;
  }
  
  con.style.display = 'flex';
  con.innerHTML = sortedTags.map(t => `<button class="tag-chip${t === selectedTag ? ' active' : ''}" data-tag="${t}">#${t}</button>`).join('');
  con.querySelectorAll('.tag-chip').forEach(c => c.addEventListener('click', () => setTag(c.dataset.tag, c)));
}

function setTag(tag, el) {
  const isActive = el.classList.contains('active');
  document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
  
  if (isActive) {
    selectedTag = '';
  } else {
    el.classList.add('active');
    selectedTag = tag;
  }
  
  currentPage = 1;
  filter();
}

function filter() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const area = document.getElementById('areaFilter')?.value || '';
  const task = document.getElementById('taskFilter')?.value || '';
  const type = document.getElementById('typeFilter')?.value || '';
  const fmt = document.getElementById('formatFilter')?.value || '';
  const sort = document.getElementById('sortBy')?.value || 'newest';

  filtered = datasets.filter(d => {
    const am = !area || d.area === area;
    const tm = !task || d.task === task;
    const ty = !type || d.data_type === type;
    const fm = !fmt || d.format === fmt;
    const tg = !selectedTag || (d.tags && d.tags.some(t => t.toLowerCase().trim() === selectedTag));
    const sm = !q || d.title.toLowerCase().includes(q) || (d.area || '').toLowerCase().includes(q) || (d.task || '').toLowerCase().includes(q) || d.overview.toLowerCase().includes(q) || (d.tags?.some(t => t.toLowerCase().includes(q)));
    return am && tm && ty && fm && tg && sm;
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
  renderPagination();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtNum(n) { if (!n) return '—'; const v = parseInt(n.toString().replace(/,/g, '')); return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v.toLocaleString(); }

function getBadge(d) {
  if (d.access_type === 'api') return `<span class="access-badge api"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>Code</span>`;
  return `<span class="access-badge download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</span>`;
}

function getCardAction(d) {
  if (d.access_type === 'api') {
    const source = d.source?.toLowerCase() || '';
    let primaryBtn = '';
    const icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 0 01-2 2H5a2 0 01-2-2V8a2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
    const codeIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`;
    
    if (source.includes('huggingface')) primaryBtn = `<a href="${esc(d.visit_url)}" class="btn btn-primary btn-sm btn-flex" target="_blank" rel="noopener" onclick="event.stopPropagation()">${icon}HuggingFace</a>`;
    else if (source.includes('kaggle')) primaryBtn = `<a href="${esc(d.visit_url)}" class="btn btn-primary btn-sm btn-flex" target="_blank" rel="noopener" onclick="event.stopPropagation()">${icon}Kaggle</a>`;
    else primaryBtn = `<a href="#" class="btn btn-primary btn-sm btn-flex" onclick="event.stopPropagation();openModal('${d.id}');return false;">${codeIcon}View Code</a>`;
    return primaryBtn;
  }
  const filename = d.download_url ? (d.download_url.split('/').pop().split('?')[0].split('#')[0] || 'data.dat') : `${d.id}.${d.format?.toLowerCase() || 'dat'}`;
  const sourceLabel = d.visit_url?.includes('github.com') ? 'GitHub' : 'Source';
  const downloadBtn = `<button class="btn btn-primary btn-sm btn-flex" onclick="event.stopPropagation();downloadFile('${esc(d.download_url)}', '${esc(filename)}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</button>`;
  const sourceBtn = d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-outline btn-sm btn-flex" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 0 0 1-2 2H5a2 0 0 1-2-2V8a2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>${sourceLabel}</a>` : '';
  return downloadBtn + sourceBtn;
}

function renderCards() {
  const con = document.getElementById('cards'), es = document.getElementById('emptyState');
  if (!con) return;
  if (!filtered.length) { con.innerHTML = ''; if (es) es.style.display = 'block'; return; }
  if (es) es.style.display = 'none';
  
  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);
  
  con.innerHTML = pageItems.map((d, i) => {
    const area = d.area || 'Other';
    const task = d.task || 'Other';
    return `<div class="card" style="animation-delay:${i * 30}ms" onclick="openModal('${d.id}', event)">
      <div class="card-header">
        <span class="topic-badge ${area.toLowerCase().replace(/\s+/g, '-')}">${esc(area)}</span>
        <span class="task-badge">${esc(task)}</span>
        ${getBadge(d)}
      </div>
      <div class="card-title">${esc(d.title)}</div>
      <p class="card-overview">${esc(d.overview)}</p>
      <div class="card-meta">
        ${d.size ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/></svg>${esc(d.size)}</span>` : ''}
        ${d.rows ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>${fmtNum(d.rows)}</span>` : ''}
        ${d.features ? `<span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>${esc(d.features)} Features</span>` : ''}
      </div>
      <div class="card-footer">${getCardAction(d)}</div>
    </div>`;
  }).join('');
}

function renderPagination() {
  const con = document.getElementById('pagination');
  if (!con) return;
  
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  if (totalPages <= 1) { con.innerHTML = ''; return; }
  
  let html = '';
  
  html += `<button class="page-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
  </button>`;
  
  html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;
  
  const maxVisible = 10;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="page-num" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-num${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
    html += `<button class="page-num" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }
  
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;
  
  html += `<button class="page-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
  </button>`;
  
  con.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderCards();
  renderPagination();
  document.querySelector('.cards-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openModal(id, event) {
  if (event && (event.target.closest('button') || event.target.closest('a'))) return;
  const d = datasets.find(x => x.id === id);
  if (!d) return;
  const tags = d.tags?.length ? `<div class="modal-tags">${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '';
  const code = d.access_type === 'api' && d.usage_code ? `<h4 style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:16px 0 8px">How to Use (Python)</h4><div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(d.usage_code)}</code></pre></div>` : '';
  
  const filename = d.download_url ? (d.download_url.split('/').pop().split('?')[0].split('#')[0] || 'data.dat') : `${d.id}.${d.format?.toLowerCase() || 'dat'}`;
  
  // CLI Command Generation
  const curlCmd = `curl -L -o ${filename} "${d.download_url}"`;
  const wgetCmd = `wget -O ${filename} "${d.download_url}"`;
  const psCmd = `Invoke-WebRequest -Uri "${d.download_url}" -OutFile "${filename}"`;
  const pySnippet = `import requests\nurl = "${d.download_url}"\nr = requests.get(url, allow_redirects=True)\nopen("${filename}", "wb").write(r.content)`;
  const nodeSnippet = `const https = require('https');\nconst fs = require('fs');\nconst file = fs.createWriteStream("${filename}");\nhttps.get("${d.download_url}", (res) => { res.pipe(file); });`;

  const cliSection = d.access_type !== 'api' && d.download_url ? `
    <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:16px 0 0">CLI Download Methodology</h4>
    <div class="cli-tabs">
      <button class="tab-btn active" onclick="switchTab(this, 'bash')">Bash</button>
      <button class="tab-btn" onclick="switchTab(this, 'ps')">PowerShell</button>
      <button class="tab-btn" onclick="switchTab(this, 'py')">Python</button>
      <button class="tab-btn" onclick="switchTab(this, 'node')">Node.js</button>
    </div>
    <div class="tab-content" id="cliContents">
      <div id="bash" class="tab-pane active">
        <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(curlCmd)}</code></pre></div>
        <div class="code-block" style="margin-top:8px"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(wgetCmd)}</code></pre></div>
      </div>
      <div id="ps" class="tab-pane">
        <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(psCmd)}</code></pre></div>
      </div>
      <div id="py" class="tab-pane">
        <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(pySnippet)}</code></pre></div>
      </div>
      <div id="node" class="tab-pane">
        <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(nodeSnippet)}</code></pre></div>
      </div>
    </div>
  ` : '';
  
  const sourceCodeInfo = d.visit_url?.includes('github.com') ? 
    `<div class="code-note" style="display:flex;align-items:center;gap:6px;margin:0 0 12px;color:#10b981;font-size:12px;font-weight:500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Original source code available</div>` : '';

  let action = '';
  if (d.access_type === 'api') {
    const source = d.source?.toLowerCase() || '';
    if (source.includes('huggingface')) action = `<div class="modal-actions"><a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 0 01-2 2H5a2 0 01-2-2V8a2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View on HuggingFace</a><a href="${esc(d.download_url)}" class="btn btn-outline" target="_blank" rel="noopener">Documentation</a></div>`;
    else if (source.includes('kaggle')) action = `<div class="modal-actions"><a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 0 01-2 2H5a2 0 01-2-2V8a2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View on Kaggle</a></div>`;
    else {
      const label = d.visit_url?.includes('github.com') ? 'View on GitHub' : 'Visit Source Site';
      action = `<div class="modal-actions">${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 0 01-2 2H5a2 0 01-2-2V8a2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>${label}</a>` : ''}</div>`;
    }
  } else {
    const sourceLabel = d.visit_url?.includes('github.com') ? 'View Source Repo' : 'Original Source Portal';
    action = `<div class="modal-actions"><button class="btn btn-primary" onclick="downloadFile('${esc(d.download_url)}', '${esc(filename)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download Now</button>${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-outline" target="_blank" rel="noopener">${sourceLabel}</a>` : ''}</div>`;
  }

  const area = d.area || d.topic || 'Other';
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-title">${esc(d.title)}</div>
    <p class="modal-overview">${esc(d.overview)}</p>
    ${sourceCodeInfo}
    ${d.access_type === 'api' ? '<div class="api-badge-large"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>API / Code Required</div>' : ''}
    <div class="modal-meta">
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(area)}</div><div class="modal-meta-label">Area</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.format || '—')}</div><div class="modal-meta-label">Format</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.size || '—')}</div><div class="modal-meta-label">Size</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${fmtNum(d.rows)}</div><div class="modal-meta-label">Rows</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.features || '0')}</div><div class="modal-meta-label">Features</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.source || '—')}</div><div class="modal-meta-label">Source</div></div>
    </div>
    ${tags}${code}${cliSection}${action}
    <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:20px;padding-top:16px;border-top:1px dashed var(--border)">Need help? <a href="documentation/manual-download.html" target="_blank">View Platform Methodology</a></p>`;
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); document.body.style.overflow = ''; }
function copyCode(btn) { navigator.clipboard.writeText(btn.parentElement.querySelector('code').textContent).then(() => { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }); }
function switchTab(btn, tabId) {
  const modal = document.getElementById('modalContent');
  modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  modal.querySelector(`#${tabId}`).classList.add('active');
}

async function downloadFile(url, filename) {
  const statusEl = document.createElement('div');
  statusEl.className = 'download-status';
  statusEl.innerHTML = `<div class="status-spinner"></div><p>Starting Download...</p>`;
  document.body.appendChild(statusEl);
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('CORS or Network error');
    const blob = await res.blob();

    if ('showSaveFilePicker' in window) {
      statusEl.innerHTML = `<p>Please select a location...</p>`;
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Dataset File', accept: { '*/*': ['.csv', '.json', '.zip', '.txt'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        statusEl.remove();
        return;
      } catch (pickerErr) {
        if (pickerErr.name === 'AbortError') { statusEl.remove(); return; }
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); statusEl.remove(); }, 100);
  } catch (e) {
    statusEl.innerHTML = `<p>Host restricted direct download.<br>Opening in new tab...</p><p style="font-size:12px;margin-top:8px;color:rgba(255,255,255,0.7)">Tip: To always see the "Save As" popup, enable <b>'Ask where to save each file'</b> in browser settings.</p>`;
    
    // Trigger download immediately without setTimeout to avoid popup blockers
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); statusEl.remove(); }, 4000);
  }
}

document.addEventListener('DOMContentLoaded', init);
document.getElementById('searchInput')?.addEventListener('input', e => { clearTimeout(window.searchTimeout); window.searchTimeout = setTimeout(() => { currentPage = 1; filter(); }, 150); });
document.getElementById('areaFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('taskFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('typeFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('formatFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('sortBy')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });
document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    // If modal is open, trigger download for that dataset
    const modal = document.getElementById('modalOverlay');
    if (modal && modal.classList.contains('show')) {
      const btn = modal.querySelector('.modal-actions .btn-primary');
      if (btn && btn.onclick) {
        e.preventDefault();
        btn.click();
      }
    }
  }
});
