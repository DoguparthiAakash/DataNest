// DataNest - Dataset Browser
console.log("DataNest Portal v1.0.3 - Automated Dataset Discovery");
let datasets = [], filtered = [];
const PER_PAGE = 20;
let currentPage = 1;
let exchangeRates = {}, userCurrency = 'USD';

async function init() {
  await fetchExchangeRates();
  let fileList = [];
  
  // Try dynamic discovery via GitHub API (for GitHub Pages hosting)
  try {
    let repoPath = 'DoguparthiAakash/DataNest'; // Default
    const host = window.location.hostname;
    const path = window.location.pathname;
    
    if (host.includes('github.io')) {
      const owner = host.split('.')[0];
      const repo = path.split('/')[1] || 'DataNest';
      repoPath = `${owner}/${repo}`;
    }
    
    const apiRes = await fetch(`https://api.github.com/repos/${repoPath}/contents/docs/datas`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      fileList = data
        .filter(item => item.name.endsWith('.json') && item.name !== 'index.json')
        .map(item => item.name);
      console.log(`Auto-discovered ${fileList.length} datasets via GitHub API`);
    } else {
      console.warn(`GitHub API returned status ${apiRes.status}. Fallback to index.json.`);
    }
  } catch (e) {
    console.warn("GitHub API discovery failed. Falling back to index.json.", e);
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

  const results = await Promise.allSettled(fileList.map(f => fetch(`./datas/${f}?v=${Date.now()}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })));
  
  datasets = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  
  if (datasets.length === 0) {
    console.error("No datasets could be loaded.");
    document.getElementById('cards').innerHTML = '<div class="empty-state"><h3>No data available</h3><p>Could not load any dataset files.</p></div>';
    return;
  }

  renderSkeletons();
  buildTopicFilter();
  buildChips();
  filter();
}

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD');
    const data = await res.json();
    exchangeRates = data.rates;
    
    // Detect Currency
    const locale = navigator.language || 'en-US';
    const region = locale.split('-')[1] || 'US';
    // Simple mapping (could be expanded)
    const currencyMap = { IN: 'INR', GB: 'GBP', FR: 'EUR', DE: 'EUR', JP: 'JPY', CN: 'CNY', US: 'USD' };
    userCurrency = currencyMap[region] || 'USD';
  } catch (e) {
    console.error("Currency API failure, using fallbacks");
  }
}

function formatPrice(usdPrice) {
  if (!usdPrice) return null;
  const rate = userCurrency === 'USD' ? 1 : (exchangeRates[userCurrency] || 1);
  const localPrice = usdPrice * rate;
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: userCurrency
  }).format(localPrice);
}

function renderSkeletons() {
  const con = document.getElementById('cards');
  if (!con) return;
  const skel = `<div class="card skeleton-card">
    <div class="card-header"><div class="skeleton skeleton-badge"></div></div>
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text short"></div>
    <div class="skeleton-footer"><div class="skeleton skeleton-btn"></div><div class="skeleton skeleton-btn"></div></div>
  </div>`;
  con.innerHTML = Array(8).fill(skel).join('');
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
  currentPage = 1;
  filter();
}

function filter() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const topic = document.getElementById('topicFilter')?.value || '';
  const fmt = document.getElementById('formatFilter')?.value || '';
  const price = document.getElementById('pricingFilter')?.value || '';
  const access = document.getElementById('accessFilter')?.value || '';
  const sort = document.getElementById('sortBy')?.value || 'newest';

  const terms = query.split(/\s+/).filter(t => t.length > 0);

  filtered = datasets.filter(d => {
    const matchSearch = terms.length === 0 || terms.every(t => 
      d.title.toLowerCase().includes(t) || 
      d.topic.toLowerCase().includes(t) || 
      (d.tags && d.tags.some(tag => tag.toLowerCase().includes(t))) ||
      d.overview.toLowerCase().includes(t)
    );
    const matchTopic = !topic || d.topic === topic;
    const matchFormat = !fmt || d.format === fmt;
    
    let matchPrice = true;
    if (price === 'Free') matchPrice = !d.price || d.price === 0;
    if (price === 'Paid') matchPrice = d.price > 0;

    const matchAccess = !access || d.access_type === access;

    return matchSearch && matchTopic && matchFormat && matchPrice && matchAccess;
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
  
  if (!filtered.length) {
    con.innerHTML = '';
    if (es) es.style.display = 'block';
    return;
  }
  if (es) es.style.display = 'none';

  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = filtered.slice(start, end);

  con.innerHTML = pageItems.map(d => {
    const isPaid = d.price && d.price > 0;
    const priceBadge = isPaid 
      ? `<span class="badge badge-paid"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>${formatPrice(d.price)}</span>`
      : `<span class="badge badge-free">FREE</span>`;
    
    const accessBadge = d.access_type === 'api'
      ? `<span class="badge badge-format" style="background:#f3e8ff;color:#9333ea">API / CODE</span>`
      : `<span class="badge badge-format">DOWNLOAD</span>`;

    const loginBadge = d.restricted ? `<span class="badge" style="background:#fee2e2;color:#991b1b">LOGIN REQ.</span>` : '';

    return `
      <div class="card" onclick="openModal('${d.id}', event)">
        <div class="card-header">
          <div class="card-badges">
            ${priceBadge}
            ${accessBadge}
            ${loginBadge}
          </div>
        </div>
        <h3 class="card-title">${esc(d.title)}</h3>
        <p class="card-overview">${esc(d.overview)}</p>
        <div class="card-footer">
          <div class="meta-group">
            <span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>${esc(d.size)}</span>
            <span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16 4h4a2 0 0 1 2 2v12a2 0 0 1-2 2h-4"/><path d="M4 8v8"/><path d="M4 4h4a2 2 0 0 1 2 2v12a2 0 0 1-2 2H4a2 0 0 1-2-2V6a2 0 0 1 2-2z"/></svg>${fmtNum(d.rows)}</span>
          </div>
          <span class="badge badge-topic">${esc(d.topic)}</span>
        </div>
      </div>
    `;
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

  // Handle Usage Methods
  const usageMethods = d.usage_methods || (d.usage_code ? [{ name: 'python', label: 'Python', code: d.usage_code }] : []);
  const usageDropdown = usageMethods.length ? `
    <div class="usage-dropdown">
      <button class="usage-btn" onclick="toggleUsageMenu(event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
        Use this dataset
        <svg style="width:12px;margin-left:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="usage-menu" id="usageMenu">
        ${usageMethods.map(m => `
          <div class="usage-item" onclick="showUsageCode('${esc(m.name)}', \`${esc(m.code)}\`)">
            ${getUsageIcon(m.name)}
            <span>${esc(m.label)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div id="usageCodeContainer" style="display:none;margin-bottom:16px"></div>
  ` : '';

  // Handle Previews & Splits
  let previewHtml = '';
  if (d.preview) {
    const hasSplits = !!d.preview.splits;
    const initialSplit = d.preview.currentSplit || (hasSplits ? Object.keys(d.preview.splits)[0] : null);
    const renderSplit = (splitName) => {
      const split = hasSplits ? d.preview.splits[splitName] : d.preview;
      if (!split) return '';
      return `
        <div class="preview-container">
          <table id="previewTable">
            <thead>
              <tr>${split.cols.map((c, i) => `<th><div>${esc(c)}</div><input type="text" placeholder="Filter..." oninput="filterPreviewTable(${i}, this.value)"></th>`).join('')}</tr>
            </thead>
            <tbody>
              ${split.rows.map(r => `<tr class="preview-row">${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    previewHtml = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:20px">
        <h4 style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Dataset Preview</h4>
        ${hasSplits ? `<div class="split-tabs">${Object.keys(d.preview.splits).map(s => `<button class="split-tab ${s === initialSplit ? 'active' : ''}" onclick="switchPreviewSplit('${id}', '${s}', this)">${esc(s)}</button>`).join('')}</div>` : ''}
      </div>
      <div id="previewWrapper">${renderSplit(initialSplit)}</div>
    `;
  }

  const tags = d.tags?.length ? `<div class="modal-tags">${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '';
  const filename = d.download_url ? (d.download_url.split('/').pop().split('?')[0].split('#')[0] || 'data.dat') : `${d.id}.${d.format?.toLowerCase() || 'dat'}`;
  
  // CLI Command Generation
  const curlCmd = `curl -L -o ${filename} "${d.download_url}"`;
  const wgetCmd = `wget -O ${filename} "${d.download_url}"`;
  const psCmd = `Invoke-WebRequest -Uri "${d.download_url}" -OutFile "${filename}"`;
  const pySnippet = `import requests\nurl = "${d.download_url}"\nr = requests.get(url, allow_redirects=True)\nopen("${filename}", "wb").write(r.content)`;

  const cliSection = d.access_type !== 'api' && d.download_url ? `
    <h4 style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin:16px 0 8px">CLI Methodology</h4>
    <div class="cli-tabs" style="margin-top:0">
      <button class="tab-btn active" onclick="switchTab(this, 'bash')">Bash</button>
      <button class="tab-btn" onclick="switchTab(this, 'ps')">PowerShell</button>
      <button class="tab-btn" onclick="switchTab(this, 'py')">Python</button>
    </div>
    <div class="tab-content" id="cliContents">
      <div id="bash" class="tab-pane active"><div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(curlCmd)}</code></pre></div></div>
      <div id="ps" class="tab-pane"><div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(psCmd)}</code></pre></div></div>
      <div id="py" class="tab-pane"><div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(pySnippet)}</code></pre></div></div>
    </div>
  ` : '';

  let action = '';
  if (d.access_type === 'api') {
    const label = d.source?.includes('Kaggle') ? 'Go to Kaggle' : d.source?.includes('HuggingFace') ? 'Go to HuggingFace' : 'Go to Source';
    action = `<div class="modal-actions">${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-primary" target="_blank" rel="noopener">${label}</a>` : ''}</div>`;
  } else {
    action = `<div class="modal-actions"><button class="btn btn-primary" onclick="downloadFile('${esc(d.download_url)}', '${esc(filename)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</button>${d.visit_url ? `<a href="${esc(d.visit_url)}" class="btn btn-outline" target="_blank" rel="noopener">Source Portal</a>` : ''}</div>`;
  }

  const priceInfo = d.price ? `<div class="modal-price">${formatPrice(d.price)} <span>(Excl. taxes)</span></div>` : '';

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-title">${esc(d.title)}</div>
    <p class="modal-overview">${esc(d.overview)}</p>
    ${priceInfo}
    <div class="modal-meta">
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.topic)}</div><div class="modal-meta-label">Topic</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.format || '—')}</div><div class="modal-meta-label">Format</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.size || '—')}</div><div class="modal-meta-label">Size</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${fmtNum(d.rows)}</div><div class="modal-meta-label">Rows</div></div>
    </div>
    ${usageDropdown}
    ${previewHtml}
    ${cliSection}
    ${action}
  `;
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function getUsageIcon(name) {
  if (name === 'datasets') return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
  if (name === 'pandas') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`;
}

function toggleUsageMenu(e) {
  e.stopPropagation();
  document.getElementById('usageMenu').classList.toggle('show');
}

function showUsageCode(name, code) {
  const container = document.getElementById('usageCodeContainer');
  container.innerHTML = `<div class="code-block" style="margin-top:12px"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(code)}</code></pre></div>`;
  container.style.display = 'block';
  document.getElementById('usageMenu').classList.remove('show');
}

function switchPreviewSplit(id, splitName, btn) {
  const d = datasets.find(x => x.id === id);
  const split = d.preview.splits[splitName];
  const wrapper = document.getElementById('previewWrapper');
  wrapper.innerHTML = `
    <div class="preview-container">
      <table id="previewTable">
        <thead>
          <tr>${split.cols.map((c, i) => `<th><div>${esc(c)}</div><input type="text" placeholder="Filter..." oninput="filterPreviewTable(${i}, this.value)"></th>`).join('')}</tr>
        </thead>
        <tbody>
          ${split.rows.map(r => `<tr class="preview-row">${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  btn.parentElement.querySelectorAll('.split-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

window.onclick = function(event) {
  if (!event.target.closest('.usage-dropdown')) {
    document.getElementById('usageMenu')?.classList.remove('show');
  }
}

function filterPreviewTable(colIdx, val) {
  const table = document.getElementById('previewTable');
  const rows = table.querySelectorAll('.preview-row');
  const filters = Array.from(table.querySelectorAll('thead input')).map(i => i.value.toLowerCase());
  
  rows.forEach(row => {
    let show = true;
    filters.forEach((f, i) => {
      if (f && !row.cells[i].textContent.toLowerCase().includes(f)) show = false;
    });
    row.style.display = show ? '' : 'none';
  });
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
document.getElementById('topicFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('formatFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('pricingFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
document.getElementById('accessFilter')?.addEventListener('change', () => { currentPage = 1; filter(); });
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
