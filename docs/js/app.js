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
    .map(r => r.value);
  
  renderSkeletons();
  buildFilters();
  buildChips();
  buildTagChips();
  filter();
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
}

function buildChips() {
  const con = document.getElementById('topicChips');
  if (!con) return;
  const areas = ['All', ...new Set(datasets.map(d => d.area || 'Other'))];
  con.innerHTML = areas.map(a => `<button class="chip${a === 'All' ? ' active' : ''}" data-area="${a}">${a}</button>`).join('');
  con.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
    c.classList.add('active');
    const sel = document.getElementById('areaFilter');
    if (sel) sel.value = c.dataset.area === 'All' ? '' : c.dataset.area;
    filter();
  }));
}

function buildTagChips() {
  const con = document.getElementById('tagChips');
  if (!con || datasets.length === 0) return;
  const tagCounts = {};
  datasets.forEach(d => (d.tags || []).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
  const sortedTags = Object.keys(tagCounts).sort((a,b) => tagCounts[b] - tagCounts[a]).slice(0, 15);
  con.innerHTML = sortedTags.map(t => `<button class="tag-chip${t === selectedTag ? ' active' : ''}" data-tag="${t}">#${t}</button>`).join('');
  con.querySelectorAll('.tag-chip').forEach(c => c.addEventListener('click', () => {
    selectedTag = selectedTag === c.dataset.tag ? '' : c.dataset.tag;
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

  con.innerHTML = pageItems.map(d => {
    const isPaid = d.price && d.price > 0;
    const pb = isPaid ? `<span class="badge badge-paid">${formatPrice(d.price)}</span>` : `<span class="badge badge-free">FREE</span>`;
    const ab = d.access_type === 'api' ? `<span class="badge badge-format" style="background:#f3e8ff;color:#9333ea">API / CODE</span>` : `<span class="badge badge-format">DOWNLOAD</span>`;
    
    return `
      <div class="card" onclick="openModal('${d.id}', event)">
        <div class="card-header"><div class="card-badges">${pb}${ab}${d.restricted ? '<span class="badge" style="background:#fee2e2;color:#991b1b">LOGIN</span>' : ''}</div></div>
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

  const usageMethods = d.usage_methods || (d.usage_code ? [{ name: 'python', label: 'Python', code: d.usage_code }] : []);
  const usageDropdown = usageMethods.length ? `
    <div class="usage-dropdown">
      <button class="usage-btn" onclick="toggleUsageMenu(event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>Use this dataset</button>
      <div class="usage-menu" id="usageMenu">
        ${usageMethods.map(m => `<div class="usage-item" onclick="showUsageCode('${esc(m.name)}', \`${esc(m.code)}\`)"><span>${esc(m.label)}</span></div>`).join('')}
      </div>
    </div><div id="usageCodeContainer" style="display:none;margin-bottom:16px"></div>` : '';

  let previewHtml = '';
  if (d.preview) {
    const hasSplits = !!d.preview.splits;
    const currentSplit = hasSplits ? Object.keys(d.preview.splits)[0] : null;
    const renderTable = (split) => `
      <div class="preview-container"><table><thead><tr>${split.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${split.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    
    previewHtml = `<div style="margin-top:20px"><h4 style="font-size:12px;color:var(--text-muted)">PREVIEW</h4>
      ${hasSplits ? `<div class="split-tabs">${Object.keys(d.preview.splits).map(s => `<button class="split-tab" onclick="this.parentElement.nextElementSibling.innerHTML=\`${renderTable(d.preview.splits[s])}\`">${esc(s)}</button>`).join('')}</div>` : ''}
      <div id="previewWrapper">${renderTable(hasSplits ? d.preview.splits[currentSplit] : d.preview)}</div></div>`;
  }

  const filename = d.download_url ? d.download_url.split('/').pop().split('?')[0] : `${d.id}.${d.format?.toLowerCase() || 'dat'}`;
  const actions = `<div class="modal-actions">${d.download_url ? `<button class="btn btn-primary" onclick="downloadFile('${esc(d.download_url)}', '${esc(filename)}')">Download</button>` : ''}<a href="${esc(d.visit_url)}" class="btn btn-outline" target="_blank">Source</a></div>`;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-title">${esc(d.title)}</div>
    <p class="modal-overview">${esc(d.overview)}</p>
    <div class="modal-meta">
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.area || d.topic)}</div><div class="modal-meta-label">Area</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.task || '—')}</div><div class="modal-meta-label">Task</div></div>
      <div class="modal-meta-item"><div class="modal-meta-val">${esc(d.format)}</div><div class="modal-meta-label">Format</div></div>
    </div>
    ${usageDropdown}${previewHtml}${actions}`;
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function toggleUsageMenu(e) { e.stopPropagation(); document.getElementById('usageMenu').classList.toggle('show'); }
function showUsageCode(name, code) { 
  const c = document.getElementById('usageCodeContainer');
  c.innerHTML = `<div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${esc(code)}</code></pre></div>`;
  c.style.display = 'block'; 
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); document.body.style.overflow = ''; }
function copyCode(btn) { navigator.clipboard.writeText(btn.parentElement.querySelector('code').textContent).then(() => { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }); }

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = filename; a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (e) { window.open(url, '_blank'); }
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

document.addEventListener('DOMContentLoaded', init);
document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; filter(); });
['areaFilter', 'taskFilter', 'typeFilter', 'formatFilter', 'pricingFilter', 'accessFilter', 'sortBy'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => { currentPage = 1; filter(); });
});
document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });
