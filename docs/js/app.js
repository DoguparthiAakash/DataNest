// DataNest - Dataset Browser
console.log("DataNest Portal v1.0.4 - Premium Metadata Resolve");
let datasets = [], filtered = [];
const PER_PAGE = 20;
let currentPage = 1;
let selectedTag = '';
let exchangeRates = {}, userCurrency = 'USD';

async function init() {
  await fetchExchangeRates();
  let fileList = [];
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Try dynamic discovery via GitHub API (for GitHub Pages hosting)
  if (!isLocal) {
    try {
      let repoPath = 'DoguparthiAakash/DataNest';
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
      }
    } catch (e) {
      console.warn("GitHub API discovery failed. Falling back to index.json.", e);
    }
  }

  // Fallback to manual index.json
  if (fileList.length === 0) {
    try {
      const res = await fetch('./datas/index.json');
      if (res.ok) {
        fileList = await res.json();
        console.log(`Loaded ${fileList.length} datasets via index.json registry`);
      }
    } catch (e) {
      document.getElementById('cards').innerHTML = '<div class="empty-state"><h3>Error loading</h3><p>Check your connection.</p></div>';
      return;
    }
  }

  const results = await Promise.allSettled(fileList.map(f => fetch(`./datas/${f}?v=${Date.now()}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })));
  
  datasets = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(d => d.price === undefined || d.price === 0 || d.pricing?.toLowerCase() !== 'paid');
    
  renderSkeletons();
  buildFilters();
  buildChips();
  buildTagChips();
  filter();
}

function getPlatformTheme(platform) {
  const p = (platform || '').toLowerCase();
  const themes = {
    'github': { color: '#1f2937', label: 'GH' },
    'kaggle': { color: '#2bace5', label: 'KG' },
    'gitlab': { color: '#e24329', label: 'GL' },
    'codeberg': { color: '#2185d0', label: 'CB' },
    'bitbucket': { color: '#0052cc', label: 'BB' },
    'uci': { color: '#ffd200', label: 'UC' },
    'archive.org': { color: '#2c2c2c', label: 'IA' },
    'internet archive': { color: '#2c2c2c', label: 'IA' }
  };
  return themes[p] || { color: '#6366f1', label: (platform || 'DN').substring(0,2).toUpperCase() };
}

function getOwnerColor(name) {
  let hash = 0;
  const str = name || 'DataNest';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}

function renderAttribution(dataset) {
  const owner = { 
    name: dataset.owner || 'DataNest Team', 
    handle: dataset.owner_handle || dataset.owner || '@datanest',
    url: dataset.owner_url || '#' 
  };
  const platform = {
    name: dataset.origin_site || 'DataNest',
    url: dataset.origin_site_url || dataset.visit_url || '#'
  };
  
  const ownerInitials = (owner.name.split(' ').map(n => n[0]).join('') || owner.name.substring(0, 2)).toUpperCase().slice(0, 2);
  const ownerColor = getOwnerColor(owner.name);
  const pTheme = getPlatformTheme(platform.name);

  return `
    <div class="attribution-row">
      <a href="${owner.url}" target="_blank" class="owner-reveal-wrap" onclick="event.stopPropagation()">
        <div class="owner-badge" style="background:${ownerColor}">${esc(ownerInitials)}</div>
        <div class="owner-name-label">${esc(owner.handle)}</div>
      </a>
      <a href="${platform.url}" target="_blank" class="owner-reveal-wrap profile-platform" onclick="event.stopPropagation()">
        <div class="owner-badge" style="background:${pTheme.color}">${esc(pTheme.label)}</div>
        <div class="owner-name-label">${esc(platform.name)}</div>
      </a>
    </div>`;
}

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD');
    const data = await res.json();
    exchangeRates = data.rates;
    const locale = navigator.language || 'en-US';
    const region = locale.split('-')[1] || 'US';
    const currencyMap = { IN: 'INR', GB: 'GBP', FR: 'EUR', DE: 'EUR', JP: 'JPY', CN: 'CNY', US: 'USD' };
    userCurrency = currencyMap[region] || 'USD';
  } catch (e) {
    console.error("Currency API failure");
  }
}

function formatPrice(usdPrice) {
  if (!usdPrice) return null;
  const rate = userCurrency === 'USD' ? 1 : (exchangeRates[userCurrency] || 1);
  const localPrice = usdPrice * rate;
  return new Intl.NumberFormat(navigator.language, { style: 'currency', currency: userCurrency }).format(localPrice);
}

function renderSkeletons() {
  const con = document.getElementById('cards');
  if (!con) return;
  const skel = `<div class="card skeleton-card"><div class="card-header"><div class="skeleton skeleton-badge"></div></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div><div class="skeleton-footer"><div class="skeleton skeleton-btn"></div><div class="skeleton skeleton-btn"></div></div></div>`;
  con.innerHTML = Array(8).fill(skel).join('');
}

function buildFilters() {
  const populate = (id, field, label) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const vals = ['All', ...new Set(datasets.map(d => d[field] || 'Other'))];
    sel.innerHTML = vals.map(v => `<option value="${v === 'All' ? '' : v}">${v === 'All' ? label : v}</option>`).join('');
  };
  populate('areaFilter', 'area', 'All Areas');
  populate('taskFilter', 'task', 'All Tasks');
  populate('typeFilter', 'data_type', 'All Types');
  populate('topicFilter', 'topic', 'All Topics');
  
  // Hide Paid option from Pricing filter if exists
  const pFilter = document.getElementById('pricingFilter');
  if (pFilter) {
    Array.from(pFilter.options).forEach(opt => {
      if (opt.value === 'Paid') opt.style.display = 'none';
    });
  }
}

function buildChips() {
  const con = document.getElementById('topicChips');
  if (!con) return;
  
  // Deduplicate and normalize areas
  const areasRaw = datasets.map(d => d.area || 'Other');
  const uniqueAreas = ['All', ...new Set(areasRaw.map(a => a.trim()))].sort();
  
  // Create a case-insensitive map to avoid "Social Science" vs "Social Sciences"
  const normalized = {};
  uniqueAreas.forEach(a => {
    const key = a.toLowerCase().replace(/s$/, ''); // very basic singular/plural normalize
    if (!normalized[key]) normalized[key] = a;
  });
  
  const areas = Object.values(normalized);

  con.innerHTML = areas.map(a => `<button class="chip${a === 'All' ? ' active' : ''}" data-area="${a}">${a}</button>`).join('') + 
    `<button class="chip btn-clear" id="btnClearFilters" style="background:var(--bg);border-style:dashed;display:none">Clear All</button>`;
  
  con.querySelectorAll('.chip:not(.btn-clear)').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
    c.classList.add('active');
    const sel = document.getElementById('areaFilter');
    if (sel) sel.value = c.dataset.topic === 'All' ? '' : (c.dataset.area || '');
    document.getElementById('btnClearFilters').style.display = 'inline-flex';
    filter();
  }));

  document.getElementById('btnClearFilters')?.addEventListener('click', () => {
    document.querySelectorAll('select').forEach(s => s.value = '');
    document.getElementById('searchInput').value = '';
    selectedTag = '';
    document.getElementById('btnClearFilters').style.display = 'none';
    buildChips();
    buildTagChips();
    filter();
  });
}

function buildTagChips() {
  const con = document.getElementById('tagChips');
  if (!con || datasets.length === 0) return;
  const tagCounts = {};
  datasets.forEach(d => (d.tags || []).forEach(t => {
    const normalized = t.toLowerCase().trim();
    tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
  }));
  const sortedTags = Object.keys(tagCounts).sort((a,b) => tagCounts[b] - tagCounts[a]).slice(0, 12);
  con.innerHTML = sortedTags.map(t => `<button class="tag-chip${t === selectedTag ? ' active' : ''}" data-tag="${t}">#${t}</button>`).join('');
  con.querySelectorAll('.tag-chip').forEach(c => c.addEventListener('click', () => {
    selectedTag = selectedTag === c.dataset.tag ? '' : c.dataset.tag;
    document.getElementById('btnClearFilters').style.display = 'inline-flex';
    buildTagChips();
    filter();
  }));
}

function filter() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const area = document.getElementById('areaFilter')?.value || '';
  const task = document.getElementById('taskFilter')?.value || '';
  const type = document.getElementById('typeFilter')?.value || '';
  const fmt = document.getElementById('formatFilter')?.value || '';
  const prc = document.getElementById('pricingFilter')?.value || '';
  const acc = document.getElementById('accessFilter')?.value || '';
  const sort = document.getElementById('sortBy')?.value || 'newest';

  filtered = datasets.filter(d => {
    const ms = !q || d.title.toLowerCase().includes(q) || d.overview.toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
    const ma = !area || (d.area || 'Other') === area;
    const mt = !task || (d.task || 'Other') === task;
    const mty = !type || (d.data_type || 'Other') === type;
    const mf = !fmt || d.format === fmt;
    const mp = !prc || (prc === 'Free' ? (!d.price || d.price === 0) : (d.price > 0));
    const mac = !acc || d.access_type === acc;
    const mtg = !selectedTag || (d.tags || []).includes(selectedTag);
    return ms && ma && mt && mty && mf && mp && mac && mtg;
  });

  switch (sort) {
    case 'az': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'za': filtered.sort((a, b) => b.title.localeCompare(a.title)); break;
    case 'oldest': filtered.sort((a, b) => new Date(a.added) - new Date(b.added)); break;
    default: filtered.sort((a, b) => new Date(b.added) - new Date(a.added));
  }

  document.getElementById('countDisplay').textContent = filtered.length;
  renderCards();
  renderPagination();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtNum(n) { if (!n) return '—'; const v = parseInt(n.toString().replace(/,/g, '')); return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v.toLocaleString(); }

function renderCards() {
  const con = document.getElementById('cards');
  if (!con) return;
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  con.innerHTML = pageItems.map((d, i) => {
    const ab = d.access_type === 'api' ? `<span class="badge badge-format" style="background:#f3e8ff;color:#9333ea">API / CODE</span>` : `<span class="badge badge-format">DOWNLOAD</span>`;
    
    return `
      <div class="card" onclick="openModal('${d.id}', event)" style="--index: ${i}">
        <div class="card-header">
          ${renderAttribution(d)}
          <div class="card-badges"><span class="badge badge-free">FREE</span>${ab}${d.restricted ? '<span class="badge" style="background:#fee2e2;color:#991b1b">LOGIN</span>' : ''}</div>
        </div>
        <h3 class="card-title">${esc(d.title)}</h3>
        <p class="card-overview">${esc(d.overview)}</p>
        <div class="card-footer">
          <div class="meta-group">
            <span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/></svg>${esc(d.size)}</span>
            <span class="meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>${fmtNum(d.rows)}</span>
          </div>
          <span class="badge badge-topic">${esc(d.area || d.topic)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openModal(id, event) {
  if (event && (event.target.closest('button') || event.target.closest('a'))) return;
  const d = datasets.find(x => x.id === id);
  if (!d) return;

  const filename = d.download_url ? d.download_url.split('/').pop().split('?')[0] : `${d.id}.${d.format?.toLowerCase() || 'dat'}`;
  
  const usageMethods = [
    { label: 'Pandas (Python)', code: `import pandas as pd\nimport requests\n\nurl = "${d.download_url || '#'}"\ndf = pd.read_${d.format?.toLowerCase() === 'csv' ? 'csv' : 'json'}(url if url.startswith('http') else "${filename}")\nprint(df.head())` },
    { label: 'Polars (Python)', code: `import polars as pl\n\n# Note: Download file first or use fsspec\ndf = pl.read_${d.format?.toLowerCase() === 'csv' ? 'csv' : 'json'}("${filename}")\nprint(df.head())` },
    { label: 'R (Tidyverse)', code: `library(tidyverse)\n\ndf <- read_${d.format?.toLowerCase() === 'csv' ? 'csv' : 'json'}("${d.download_url || filename}")\nhead(df)` }
  ];

  const hasPreview = !!d.preview;
  const hasUsage = usageMethods.length > 0;

  let tabsHtml = `<div class="modal-tabs">
    <button class="modal-tab active" onclick="switchTab(this, 'tab-overview')">Overview</button>
    ${hasPreview ? `<button class="modal-tab" onclick="switchTab(this, 'tab-preview')">Data Preview</button>` : ''}
    <button class="modal-tab" onclick="switchTab(this, 'tab-usage')">Usage / API</button>
    <button class="modal-tab" onclick="switchTab(this, 'tab-cli')">Terminal / CLI</button>
  </div>`;

  const overviewHtml = `
    <div id="tab-overview" class="tab-content active">
      <div class="modal-meta">
        <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.area || d.topic)}</div><div class="modal-meta-label">Area</div></div>
        <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.task && d.task !== '—' ? d.task : 'General')}</div><div class="modal-meta-label">Task</div></div>
        <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.format)}</div><div class="modal-meta-label">Format</div></div>
        <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.size)}</div><div class="modal-meta-label">Size</div></div>
        <div class="modal-meta-item"><div class="modal-meta-val">${fmtNum(d.rows)}</div><div class="modal-meta-label">Rows</div></div>
      </div>
      <p class="modal-overview" style="margin-top:20px">${esc(d.overview)}</p>
      <div class="modal-tags" style="margin-top:16px">
        ${(d.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
      </div>
    </div>`;

  let previewHtml = '';
  if (hasPreview) {
    const hasSplits = !!d.preview.splits;
    const currentSplit = hasSplits ? Object.keys(d.preview.splits)[0] : null;
    const splitData = hasSplits ? d.preview.splits[currentSplit] : d.preview;
    
    previewHtml = `
      <div id="tab-preview" class="tab-content">
        <div class="preview-toolbar">
          <input type="text" placeholder="Search in preview..." oninput="filterPreviewTable()">
          ${hasSplits ? `<div class="split-tabs">${Object.keys(d.preview.splits).map(s => `<button class="split-tab" onclick="loadSplit('${id}', '${s}')">${esc(s)}</button>`).join('')}</div>` : ''}
        </div>
        <div id="previewWrapper">${renderPreview(d, splitData)}</div>
      </div>`;
  }

  const usageHtml = `
    <div id="tab-usage" class="tab-content">
      <div class="usage-toolbar"><select class="method-select" onchange="updateUsageCode(this)">
        ${usageMethods.map((m, i) => `<option value="${i}">${esc(m.label)}</option>`).join('')}
      </select></div>
      <div class="code-container" id="usageCodeBlock">
        <div class="code-header"><button class="btn-copy-mini" onclick="copyCode(this)">Copy</button></div>
        <pre><code class="language-python">${esc(usageMethods[0].code)}</code></pre>
      </div>
    </div>`;

  // CLI Commands
  const cliCommands = [
    { label: 'Curl', cmd: `curl -L -o ${filename} "${d.download_url || '#'}"` },
    { label: 'Wget', cmd: `wget -O ${filename} "${d.download_url || '#'}"` },
    { label: 'Hugging Face CLI', cmd: `huggingface-cli download DataNest/${d.id} --include "${filename}" --local-dir .` },
    { label: 'Kaggle CLI', cmd: `kaggle datasets download -d datanest/${d.id} -f ${filename}` }
  ];

  const cliHtml = `
    <div id="tab-cli" class="tab-content">
      <div class="cli-grid">
        ${cliCommands.map(c => `
          <div class="cli-item">
            <div class="cli-label">${esc(c.label)}</div>
            <div class="cli-code"><code>${esc(c.cmd)}</code><button class="btn-copy-mini" onclick="copyCodeText(\`${esc(c.cmd)}\`, this)">Copy</button></div>
          </div>
        `).join('')}
      </div>
    </div>`;

  const actions = `<div class="modal-actions" style="margin-top:24px">
    ${d.download_url ? `<button class="btn btn-primary btn-lg" onclick="downloadFile('${esc(d.download_url)}', '${esc(filename)}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 0 01-2 2H5a2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/></svg> Download Dataset</button>` : ''}
    <a href="${esc(d.visit_url)}" class="btn btn-outline btn-lg" target="_blank">Visit Source Site</a>
  </div>`;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header-main">
      <div class="modal-owner-row">
        ${renderAttribution(d)}
      </div>
      <div class="modal-title" style="margin-top:12px">${esc(d.title)}</div>
    </div>
    ${tabsHtml}
    <div class="modal-body-scroll">
      ${overviewHtml}
      ${previewHtml}
      ${usageHtml}
      ${cliHtml}
    </div>
    ${actions}`;
  
  // Inject usage methods into window for global access
  window.currentUsageMethods = usageMethods;
  
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function switchTab(btn, tabId) {
  const modal = btn.closest('.modal');
  modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function renderPreviewTable(data) {
  // 1. Calculate Column Distributions
  const dists = data.cols.map((col, idx) => {
    const counts = {};
    data.rows.forEach(r => {
      const val = r[idx] === null || r[idx] === undefined ? 'Null' : r[idx].toString();
      counts[val] = (counts[val] || 0) + 1;
    });
    // Sort by count desc and take top N for sparkle
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const maxCount = Math.max(...Object.values(counts));
    return { sorted, maxCount };
  });

  const headerCells = data.cols.map((c, i) => {
    const { sorted, maxCount } = dists[i];
    const bars = sorted.map(([val, count]) => {
      const pct = (count / maxCount) * 100;
      return `<div class="spark-bar" style="height:${pct}%" title="${esc(val)}: ${count}"></div>`;
    }).join('');

    return `
      <th>
        <div class="th-content">
          <div class="th-name">${esc(c)}</div>
          <div class="th-sparkline">${bars}</div>
          <input type="text" class="th-filter" placeholder="Filter..." oninput="filterPreviewTable(this, ${i})">
        </div>
      </th>`;
  }).join('');

  return `<div class="preview-container"><table id="previewTable"><thead><tr>${headerCells}</tr></thead>
    <tbody>${data.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function filterPreviewTable() {
  const table = document.getElementById('previewTable');
  if (!table) return;
  const filters = Array.from(table.querySelectorAll('.th-filter')).map(i => i.value.toLowerCase().trim());
  const rows = table.querySelectorAll('tbody tr');
  
  rows.forEach(r => {
    const cells = Array.from(r.querySelectorAll('td'));
    const isVisible = filters.every((q, i) => {
      if (!q) return true;
      return (cells[i]?.textContent || '').toLowerCase().includes(q);
    });
    r.style.display = isVisible ? '' : 'none';
  });
}

function copyCodeText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = old;
      btn.style.background = '';
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      btn.textContent = 'Copied!';
    } catch (err) {
      btn.textContent = 'Error';
    }
    document.body.removeChild(textArea);
  });
}

function loadSplit(id, splitName) {
  const d = datasets.find(x => x.id === id);
  const data = d.preview.splits[splitName];
  document.getElementById('previewWrapper').innerHTML = renderPreview(d, data);
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); document.body.style.overflow = ''; }
function copyCode(btn) { 
  const code = btn.closest('.code-container').querySelector('code').textContent;
  copyCodeText(code, btn);
}

async function downloadFile(url, filename) {
  try {
    if ('showSaveFilePicker' in window) {
      const res = await fetch(url);
      const blob = await res.blob();
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Dataset File', accept: { '*/*': ['.' + filename.split('.').pop()] } }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename; a.click();
      URL.revokeObjectURL(blobUrl);
    }
  } catch (e) { 
    if (e.name !== 'AbortError') window.open(url, '_blank'); 
  }
}

function renderPreview(d, dataOverride) {
  const type = d.data_type?.toLowerCase() || 'text';
  const format = d.format?.toLowerCase() || 'csv';
  const data = dataOverride || d.preview;
  
  if (!data) return '<div class="preview-empty">No preview available for this dataset.</div>';

  if (type === 'image') return renderImageGallery(data);
  if (type === 'audio' || type === 'video') return renderMediaPlayers(data, type);
  if (format === 'csv' || data.cols) return renderPreviewTable(data);
  return renderDocumentViewer(data, format);
}

function renderImageGallery(data) {
  return `<div class="image-gallery">
    ${data.map(img => `<div class="img-item"><img src="${img.url}" loading="lazy" alt="preview"><span>${esc(img.label)}</span></div>`).join('')}
  </div>`;
}

function renderMediaPlayers(data, type) {
  return `<div class="media-preview">
    ${data.map(item => `
      <div class="media-item">
        <div class="media-label">${esc(item.label)}</div>
        ${type === 'video' ? `<video controls src="${item.url}"></video>` : `<audio controls src="${item.url}"></audio>`}
      </div>
    `).join('')}
  </div>`;
}

function renderDocumentViewer(data, format) {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return `<div class="code-container doc-viewer">
    <div class="code-header"><span class="doc-format">${format.toUpperCase()}</span><button class="btn-copy-mini" onclick="copyCode(this)">Copy</button></div>
    <pre><code>${esc(content)}</code></pre>
  </div>`;
}

function goToPage(p) { currentPage = p; filter(); window.scrollTo({top:0, behavior:'smooth'}); }

function renderPagination() {
  const con = document.getElementById('pagination');
  if (!con) return;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  if (totalPages <= 1) { con.innerHTML = ''; return; }
  
  let html = '';
  const btn = (p, label, dis) => `<button class="page-btn" onclick="goToPage(${p})" ${dis ? 'disabled' : ''}>${label}</button>`;
  const num = (p) => `<button class="page-num${p === currentPage ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`;

  html += btn(1, '«', currentPage === 1);
  html += btn(currentPage - 1, '‹', currentPage === 1);

  const max = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + max - 1);
  if (end - start < max - 1) start = Math.max(1, end - max + 1);

  if (start > 1) {
    html += num(1);
    if (start > 2) html += `<span class="page-ellipsis">...</span>`;
  }
  for (let i = start; i <= end; i++) html += num(i);
  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
    html += num(totalPages);
  }

  html += btn(currentPage + 1, '›', currentPage === totalPages);
  html += btn(totalPages, '»', currentPage === totalPages);
  con.innerHTML = html;
}

function updateUsageCode(sel) {
  const method = window.currentUsageMethods[sel.value];
  if (!method) return;
  const codeBlock = document.getElementById('usageCodeBlock');
  codeBlock.querySelector('code').textContent = method.code;
}

document.addEventListener('DOMContentLoaded', init);
document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; filter(); });
['areaFilter', 'taskFilter', 'typeFilter', 'formatFilter', 'pricingFilter', 'accessFilter', 'sortBy'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => { currentPage = 1; filter(); });
});
document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });
