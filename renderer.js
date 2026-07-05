'use strict';

function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let lang = 'en';
let appSettings = {};
let categories = [];
let groups = [];
let lastMoves = [];
let lastGroupMoves = [];
let lastRulesMoves = [];
let currentFolder = null;
let currentGroupFolder = null;
let scheduleFolder = null;

// ── Init ──────────────────────────────────────────────────────────
function tr(key) {
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
}

async function init() {
  lucide.createIcons();
  appSettings = await window.api.getSettings();
  if (appSettings.theme) document.documentElement.setAttribute('data-theme', appSettings.theme);
  if (appSettings.accent) document.documentElement.style.setProperty('--accent', appSettings.accent);
  categories  = await window.api.getCategories();
  groups      = await window.api.getGroups();
  await loadBookmarks();

  applyLanguage(appSettings.language);
  renderGroupChips();

  // Set default folder if configured
  if (appSettings.defaultFolder) {
    currentFolder = appSettings.defaultFolder;
    document.getElementById('folderInput').value = appSettings.defaultFolder;
  }

  document.getElementById('groupNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGroup(); });
  document.getElementById('newCatName').addEventListener('keydown',     e => { if (e.key === 'Enter') addCategory(); });

  renderRecentFolders('organize');
  initAllDragDrop();
  initVersionDisplay();
  restoreAccordionState();
  loadIgnoreList();
  loadSizeFilter();
  loadRenameRules();
  initOnboarding();
  initCleanupScheduleUI();
  initRulesScheduleUI();
  initContextMenuToggle();
}

// ── Language ──────────────────────────────────────────────────────
function applyLanguage(l) {
  lang = l;
  const t = TRANSLATIONS[l] || TRANSLATIONS['en'];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });
}

function changeLanguage(l) {
  appSettings.language = l;
  window.api.saveSettings(appSettings);
  applyLanguage(l);
  renderSettings();
  showToast(TRANSLATIONS[l]?.language || 'Language changed');
}

// ── Tabs ──────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (!page) return;
  page.classList.remove('hidden');
  page.classList.remove('tab-enter');
  void page.offsetWidth;
  page.classList.add('tab-enter');
  const tabEl = document.getElementById(`tab-${name}`);
  if (tabEl) tabEl.classList.add('active');
  if (name === 'history') {
    lastSeenHistoryCount = cachedSessions.length;
    const badge = document.getElementById('historyTabBadge');
    if (badge) badge.classList.add('hidden');
    loadHistory();
  }
  if (name === 'stats')    loadStats();
  if (name === 'settings') renderSettings();
  if (name === 'watcher')  initWatcher();
  if (name === 'rules')    loadRules();
  if (name === 'cleanup') { initRecycleBin(); loadCleanupSuggestions(); }
  if (['organize','group','duplicates','cleanup','watcher'].includes(name)) {
    const ctxMap = { organize: 'organize', group: 'group', duplicates: 'duplicates', cleanup: 'cleanup', watcher: 'watcher' };
    renderRecentFolders(ctxMap[name]);
  }
  lucide.createIcons();
}

// ── Organize ──────────────────────────────────────────────────────
async function pickFolder()    { const f = await window.api.pickFolder();    if (f) setFolder(f); }
async function useDownloads()  { const f = await window.api.getDownloads();  if (f) setFolder(f); }

async function setFolder(folder) {
  currentFolder = folder;
  document.getElementById('folderInput').value = folder;
  await trackRecentFolder(folder);
  await showPreview(folder);
}

async function showPreview(folder) {
  const files = await window.api.preview(folder);
  if (!files.length) { showToast(tr('noSortableFiles')); return; }

  const grouped = {};
  for (const f of files) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f.name);
  }

  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  for (const [cat, names] of Object.entries(grouped)) {
    const icon = getCatIcon(cat);
    const preview = names.slice(0, 3).map(n => `<div class="cat-card-file">${n.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('');
    const more = names.length > 3 ? `<div class="cat-card-file" style="color:#444">+${names.length - 3} more</div>` : '';
    grid.innerHTML += `<div class="cat-card">
      <div class="cat-card-name"><i data-lucide="${icon}"></i>${cat}</div>
      <div class="cat-card-count">${names.length} <span class="cat-card-label">file${names.length !== 1 ? 's' : ''}</span></div>
      <div class="cat-card-files">${preview}${more}</div>
    </div>`;
  }
  lucide.createIcons();
  document.getElementById('previewCount').textContent = `${files.length} files`;
  document.getElementById('previewCard').classList.remove('hidden');
  document.getElementById('organizeEmptyState')?.classList.add('hidden');
  document.getElementById('resultsCard').classList.add('hidden');
}

async function organize() {
  if (!currentFolder) return;
  const btn = document.getElementById('organizeBtn');
  btn.disabled = true;

  const pw = document.getElementById('progressWrap');
  const pb = document.getElementById('progressBar');
  pw.classList.remove('hidden');
  pb.style.width = '0%';

  let progress = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 90);
    pb.style.width = `${progress}%`;
  }, 200);

  const result = await window.api.organize(currentFolder);
  lastMoves = result.moved;

  clearInterval(interval);
  pb.style.width = '100%';
  setTimeout(() => pw.classList.add('hidden'), 600);

  const grouped = {};
  for (const m of result.moved) {
    if (!grouped[m.category]) grouped[m.category] = 0;
    grouped[m.category]++;
  }

  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = '';
  for (const [cat, count] of Object.entries(grouped)) {
    grid.innerHTML += `<div class="cat-card">
      <div class="cat-card-name"><i data-lucide="${getCatIcon(cat)}"></i>${cat}</div>
      <div class="cat-card-count">${count}</div>
      <div class="cat-card-label">file${count !== 1 ? 's' : ''} moved</div>
    </div>`;
  }
  lucide.createIcons();
  document.getElementById('movedCount').textContent = `${result.moved.length} moved`;
  document.getElementById('previewCard').classList.add('hidden');
  document.getElementById('organizeEmptyState')?.classList.remove('hidden');
  document.getElementById('resultsCard').classList.remove('hidden');
  btn.disabled = false;
  if (result.errors.length) showToast(`${result.errors.length} error(s)`);
}

async function undo() {
  if (!lastMoves.length) { showToast(tr('nothingToUndo')); return; }
  const r = await window.api.undo(lastMoves);
  lastMoves = [];
  showToast(tr('restoredFiles').replace('{count}', r.restored.length));
  resetOrganize();
}

function resetOrganize() {
  currentFolder = null; lastMoves = [];
  document.getElementById('folderInput').value = '';
  document.getElementById('previewCard').classList.add('hidden');
  document.getElementById('organizeEmptyState')?.classList.remove('hidden');
  document.getElementById('resultsCard').classList.add('hidden');
}

// ── Smart Group ───────────────────────────────────────────────────
function renderGroupChips() {
  const list = document.getElementById('groupList');
  const count = document.getElementById('groupCount');
  if (!list) return;
  count.textContent = groups.length;
  list.innerHTML = groups.map((g, i) => `
    <div class="chip">${g.name}
      <button class="chip-del" onclick="removeGroup(${i})"><i data-lucide="x"></i></button>
    </div>`).join('');
  lucide.createIcons();
}

async function exportGroups() {
  const result = await window.api.exportGroups();
  if (result.cancelled) return;
  if (result.ok) showToast(`✓ ${tr('groupsExported')}`);
  else showToast(`✗ ${result.error}`);
}

async function importGroups() {
  const result = await window.api.importGroups();
  if (result.cancelled) return;
  if (result.ok) {
    showToast(`✓ ${result.added} ${tr('groupsImported')}`);
    await loadGroups();
  } else {
    showToast(`✗ ${result.error}`);
  }
}

async function addGroup() {
  const input = document.getElementById('groupNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (groups.find(g => g.name.toLowerCase() === name.toLowerCase())) { showToast(tr('alreadyExists')); return; }
  groups.push({ name });
  await window.api.saveGroups(groups);
  renderGroupChips();
  input.value = '';
  showToast(tr('groupAdded').replace('{name}', name));
}

async function removeGroup(i) {
  const name = groups[i].name;
  groups.splice(i, 1);
  await window.api.saveGroups(groups);
  renderGroupChips();
  showToast(tr('groupRemoved').replace('{name}', name));
}

async function pickGroupFolder()   { const f = await window.api.pickFolder();   if (f) setGroupFolder(f); }
async function useDownloadsGroup() { const f = await window.api.getDownloads(); if (f) setGroupFolder(f); }

async function setGroupFolder(folder) {
  currentGroupFolder = folder;
  document.getElementById('groupFolderInput').value = folder;
  await trackRecentFolder(folder);
  await showGroupPreview(folder);
}

async function showGroupPreview(folder) {
  if (!groups.length) { showToast(tr('addGroupFirst')); return; }
  const files = await window.api.previewGroups(folder);
  if (!files.length) { showToast(tr('noMatchingFiles')); return; }

  const list = document.getElementById('groupPreviewList');
  list.innerHTML = files.map(f => `
    <div class="match-item">
      <span class="match-filename" title="${sanitize(f.name)}">${sanitize(f.name)}</span>
      <span class="match-arrow"><i data-lucide="arrow-right"></i></span>
      <span class="match-dest">${f.group.charAt(0).toUpperCase() + f.group.slice(1)}/</span>
    </div>`).join('');
  lucide.createIcons();
  document.getElementById('groupPreviewCount').textContent = `${files.length} files`;
  document.getElementById('groupPreviewCard').classList.remove('hidden');
  document.getElementById('groupResultsCard').classList.add('hidden');
}

async function organizeGroups() {
  if (!currentGroupFolder) return;
  const btn = document.getElementById('groupOrganizeBtn');
  btn.disabled = true;
  const result = await window.api.organizeGroups(currentGroupFolder);
  lastGroupMoves = result.moved;

  const grouped = {};
  for (const m of result.moved) {
    if (!grouped[m.group]) grouped[m.group] = 0;
    grouped[m.group]++;
  }
  const grid = document.getElementById('groupResultsGrid');
  grid.innerHTML = '';
  for (const [grp, count] of Object.entries(grouped)) {
    grid.innerHTML += `<div class="cat-card">
      <div class="cat-card-name"><i data-lucide="store"></i>${grp}</div>
      <div class="cat-card-count">${count}</div>
      <div class="cat-card-label">file${count !== 1 ? 's' : ''} moved</div>
    </div>`;
  }
  lucide.createIcons();
  document.getElementById('groupMovedCount').textContent = `${result.moved.length} moved`;
  document.getElementById('groupPreviewCard').classList.add('hidden');
  document.getElementById('groupResultsCard').classList.remove('hidden');
  btn.disabled = false;
}

async function undoGroups() {
  if (!lastGroupMoves.length) { showToast(tr('nothingToUndo')); return; }
  const r = await window.api.undo(lastGroupMoves);
  lastGroupMoves = [];
  showToast(tr('restoredFiles').replace('{count}', r.restored.length));
  resetGroup();
}

function resetGroup() {
  currentGroupFolder = null; lastGroupMoves = [];
  document.getElementById('groupFolderInput').value = '';
  document.getElementById('groupPreviewCard').classList.add('hidden');
  document.getElementById('groupResultsCard').classList.add('hidden');
}

// ── History ───────────────────────────────────────────────────────
let cachedSessions = [];
let historyTypeFilter = 'all';
let lastSeenHistoryCount = 0;

function updateHistoryBadge() {
  const badge = document.getElementById('historyTabBadge');
  if (!badge) return;
  const newCount = cachedSessions.length - lastSeenHistoryCount;
  if (newCount > 0) {
    badge.textContent = newCount > 99 ? '99+' : newCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function loadHistory() {
  cachedSessions = await window.api.getLog();
  renderHistory(cachedSessions);
  updateHistoryBadge();
}

function renderHistory(sessions) {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  document.getElementById('historyCount').textContent = sessions.length;
  list.innerHTML = '';

  if (!sessions.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  for (const s of sessions) {
    const date = new Date(s.timestamp);
    const dateStr = date.toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const timeStr = date.toLocaleTimeString('el-GR', { hour:'2-digit', minute:'2-digit' });

    const grouped = {};
    for (const f of (s.moved || [])) {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    }

    const groupsHTML = Object.entries(grouped).map(([cat, files]) => `
      <div class="session-cat" data-category="${cat}" data-session-id="${s.id}" data-session-folder="${s.folder.replace(/"/g,'&quot;')}"
           ondragover="handleHistoryDragOver(event)" ondragleave="handleHistoryDragLeave(event)" ondrop="handleHistoryDrop(event)">
        <div class="session-cat-label"><i data-lucide="${getCatIcon(cat)}"></i>${cat} (${files.length})</div>
        <div class="file-chips">${files.map(f => `
          <span class="file-chip-wrap" draggable="${f.to ? 'true' : 'false'}"
                ${f.to ? `data-preview-path="${f.to.replace(/\\/g,'\\\\').replace(/"/g,'&quot;')}"` : ''}
                ondragstart="handleHistoryDragStart(event, '${s.id}', '${f.name.replace(/'/g,"\\'")}', '${(f.to||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
            <span class="file-chip" title="${sanitize(f.name)}">${sanitize(f.name)}</span>
            ${f.to ? `
            <button class="file-chip-action" title="${tr('openLocation')}" onclick="openFileLocation('${f.to.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
              <i data-lucide="folder-open"></i>
            </button>
            <button class="file-chip-action file-chip-undo" title="${tr('undoFile')}" onclick="undoSingleFile(${s.id}, '${f.name.replace(/'/g,"\\'")}', '${(f.from||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}', '${f.to.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
              <i data-lucide="undo-2"></i>
            </button>` : ''}
          </span>`).join('')}</div>
      </div>`).join('');

    const el = document.createElement('div');
    el.className = 'session';
    el.dataset.timestamp = s.timestamp;

    if (s.type === 'rules') {
      // Rules run session — group by action type
      const byAction = { move: [], delete: [], rename: [] };
      for (const r of (s.results || [])) {
        if (byAction[r.action]) byAction[r.action].push(r);
      }
      const rulesGroupsHTML = Object.entries(byAction).filter(([, files]) => files.length).map(([action, files]) => {
        const label = action === 'move' ? 'Moved' : action === 'delete' ? 'Deleted' : 'Renamed';
        const icon = action === 'move' ? 'arrow-right' : action === 'delete' ? 'trash-2' : 'pencil';
        return `<div class="session-cat">
          <div class="session-cat-label"><i data-lucide="${icon}"></i>${label} (${files.length})</div>
          <div class="file-chips">${files.map(f => `
            <span class="file-chip-wrap">
              <span class="file-chip" title="${sanitize(f.file)}">${sanitize(f.file)}</span>
              ${(f.from && f.to) ? `
              <button class="file-chip-action file-chip-undo" title="${tr('undoFile')}" onclick="undoSingleRulesFile('${f.from.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}', '${f.to.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}', ${s.id})">
                <i data-lucide="undo-2"></i>
              </button>` : ''}
            </span>`).join('')}</div>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div class="session-header" onclick="toggleSession(this)">
          <div class="session-date">${dateStr} ${timeStr}</div>
          <div class="session-folder" title="${s.folder}">${s.folder}</div>
          <span class="session-type type-rules">Rules</span>
          <span class="session-badge">${s.total} ${s.total === 1 ? 'file' : 'files'}</span>
          <button class="session-open-folder" title="${tr('openFolder')}" onclick="event.stopPropagation();openSessionFolder('${s.folder.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
            <i data-lucide="folder-open"></i>
          </button>
          <button class="session-del" onclick="deleteSession(event,${s.id})"><i data-lucide="x"></i></button>
          <span class="session-chevron"><i data-lucide="chevron-down"></i></span>
        </div>
        <div class="session-body">${rulesGroupsHTML}</div>`;
    } else {
      el.innerHTML = `
        <div class="session-header" onclick="toggleSession(this)">
          <div class="session-date">${dateStr} ${timeStr}</div>
          <div class="session-folder" title="${s.folder}">${s.folder}</div>
          <span class="session-type ${s.type === 'smart-group' ? 'type-smart-group' : s.type === 'watcher' ? 'type-watcher' : 'type-organize'}">${s.type === 'smart-group' ? 'Smart Group' : s.type === 'watcher' ? 'Watcher' : 'Organize'}</span>
          <span class="session-badge">${s.total} moved</span>
          <button class="session-open-folder" title="${tr('exportSession')}" onclick="event.stopPropagation();exportSession(${s.id})">
            <i data-lucide="download"></i>
          </button>
          <button class="session-open-folder" title="${tr('openFolder')}" onclick="event.stopPropagation();openSessionFolder('${s.folder.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
            <i data-lucide="folder-open"></i>
          </button>
          <button class="session-open-folder session-undo-btn" title="${tr('undoSession')}" onclick="event.stopPropagation();undoSession(${s.id})">
            <i data-lucide="rotate-ccw"></i>
          </button>
          <button class="session-del" onclick="deleteSession(event,${s.id})"><i data-lucide="x"></i></button>
          <span class="session-chevron"><i data-lucide="chevron-down"></i></span>
        </div>
        <div class="session-body">${groupsHTML}</div>`;
    }
    list.appendChild(el);
  }
  lucide.createIcons();
  attachPreviewsToHistory();
}

function setHistoryTypeFilter(type) {
  historyTypeFilter = type;
  document.querySelectorAll('.history-type-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.type === type);
  });
  filterHistory();
}

function filterHistory() {
  const q = (document.getElementById('historySearch')?.value || '').toLowerCase().trim();
  const from = document.getElementById('historyDateFrom')?.value;
  const to = document.getElementById('historyDateTo')?.value;
  const fromTs = from ? new Date(from + 'T00:00:00').getTime() : null;
  const toTs = to ? new Date(to + 'T23:59:59').getTime() : null;

  const filtered = cachedSessions.filter(s => {
    const ts = new Date(s.timestamp).getTime();
    const text = (s.folder + ' ' + (s.moved || []).map(f => f.name).join(' ')).toLowerCase();
    const matchText = !q || text.includes(q);
    const matchFrom = !fromTs || ts >= fromTs;
    const matchTo = !toTs || ts <= toTs;
    const matchType = historyTypeFilter === 'all' || s.type === historyTypeFilter ||
      (historyTypeFilter === 'organize' && !s.type);
    return matchText && matchFrom && matchTo && matchType;
  });
  renderHistory(filtered);
}

function clearHistoryFilter() {
  const s = document.getElementById('historySearch');
  const f = document.getElementById('historyDateFrom');
  const t = document.getElementById('historyDateTo');
  if (s) s.value = '';
  if (f) f.value = '';
  if (t) t.value = '';
  historyTypeFilter = 'all';
  document.querySelectorAll('.history-type-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.type === 'all');
  });
  renderHistory(cachedSessions);
}

async function exportSession(sessionId) {
  const sessions = await window.api.getLog();
  const s = sessions.find(x => x.id === sessionId);
  if (!s) return;
  const date = new Date(s.timestamp).toLocaleString();
  const lines = [
    `Mojo File Organizer - Session Export`,
    `Date: ${date}`,
    `Folder: ${s.folder}`,
    `Type: ${s.type}`,
    `Total moved: ${s.total}`,
    ``,
    `Files moved:`,
    ...(s.moved || []).map(f => `  ${f.name} → ${f.category}`)
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mojo-session-${s.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function undoSession(sessionId) {
  const sessions = await window.api.getLog();
  const s = sessions.find(x => x.id === sessionId);
  if (!s || !s.moved?.length) { showToast(tr('nothingToUndo')); return; }

  const confirmed = await showConfirm(
    tr('confirmUndoSession').replace('{count}', s.moved.length).replace('{date}', new Date(s.timestamp).toLocaleString())
  );
  if (!confirmed) return;

  const r = await window.api.undo(s.moved);
  const restored = r.restored?.length || 0;
  const failed = r.errors?.length || 0;

  if (restored > 0 && failed === 0) {
    showToast(`↩ ${restored} ${tr('filesRestored')}`);
    await window.api.deleteSession(sessionId);
    loadHistory();
  } else if (restored > 0 && failed > 0) {
    showToast(`↩ ${restored} ${tr('filesRestored')} · ${failed} ${tr('filesNotFound')}`);
    await window.api.deleteSession(sessionId);
    loadHistory();
  } else {
    showToast(tr('undoFailed'));
  }
}

async function openSessionFolder(folder) {
  await window.api.openFolder(folder);
}

async function openFileLocation(filePath) {
  await window.api.openFileLocation(filePath);
}

async function undoSingleFile(sessionId, fileName, from, to) {
  if (!from) { showToast(tr('cannotUndo')); return; }
  const result = await window.api.undoSingleFile({ sessionId, fileName, from, to });
  if (result.ok) {
    showToast(tr('fileRestored'));
    loadHistory();
  } else {
    showToast(tr('failedUndoFile'));
  }
}

// ── History drag and drop recategorize ──────────────────────────
let draggedHistoryFile = null;

function handleHistoryDragStart(e, sessionId, fileName, filePath) {
  if (!filePath) { e.preventDefault(); return; }
  draggedHistoryFile = { sessionId, fileName, filePath };
  e.dataTransfer.effectAllowed = 'move';
}

function handleHistoryDragOver(e) {
  if (!draggedHistoryFile) return;
  e.preventDefault();
  e.currentTarget.classList.add('drag-over-cat');
}

function handleHistoryDragLeave(e) {
  e.currentTarget.classList.remove('drag-over-cat');
}

async function handleHistoryDrop(e) {
  e.preventDefault();
  const targetEl = e.currentTarget;
  targetEl.classList.remove('drag-over-cat');
  if (!draggedHistoryFile) return;

  const newCategory = targetEl.dataset.category;
  const sessionFolder = targetEl.dataset.sessionFolder;
  const { sessionId, fileName, filePath } = draggedHistoryFile;
  draggedHistoryFile = null;

  const result = await window.api.recategorizeFile({
    sessionId: parseInt(sessionId),
    fileName,
    oldPath: filePath,
    newCategory,
    sessionFolder
  });

  if (result.ok) {
    showToast(tr('movedToCategory').replace('{category}', newCategory));
    loadHistory();
  } else {
    showToast(tr('failedMoveFile'));
  }
}

function toggleSession(header) { header.closest('.session').classList.toggle('open'); }

async function deleteSession(e, id) {
  e.stopPropagation();
  await window.api.deleteSession(id);
  loadHistory();
  showToast(tr('sessionDeleted'));
}

async function clearLog() {
  if (!await showConfirm(tr('confirmClearHistory'))) return;
  await window.api.clearLog();
  loadHistory();
  showToast(tr('historyCleared'));
}

// ── Stats ─────────────────────────────────────────────────────────
async function loadStats() {
  const stats = await window.api.getStats();
  const empty = document.getElementById('statsEmpty');
  const grid  = document.getElementById('statsGrid');

  const hasOrganize = stats.totalFiles > 0;
  const hasRules = stats.rulesStats?.total > 0;

  if (!hasOrganize && !hasRules) {
    grid.innerHTML = '';
    document.getElementById('chartWrap').innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    lucide.createIcons();
    return;
  }
  if (empty) empty.classList.add('hidden');

  let gridHTML = '';

  if (hasOrganize) {
    gridHTML += `
      <div class="stat-card"><div class="stat-num">${stats.totalFiles.toLocaleString()}</div><div class="stat-label">Files Organized</div></div>
      <div class="stat-card"><div class="stat-num">${stats.totalSessions}</div><div class="stat-label">Organize Sessions</div></div>
      <div class="stat-card"><div class="stat-num">${Object.keys(stats.byCategory).length}</div><div class="stat-label">Categories Used</div></div>`;
  }

  if (hasRules) {
    const rs = stats.rulesStats;
    gridHTML += `
      <div class="stat-card"><div class="stat-num">${rs.total.toLocaleString()}</div><div class="stat-label">Files Processed by Rules</div></div>
      <div class="stat-card"><div class="stat-num">${rs.sessions}</div><div class="stat-label">Rules Sessions</div></div>
      <div class="stat-card" style="grid-column:span 1">
        <div class="stat-num" style="font-size:13px;gap:10px;display:flex;justify-content:center">
          <span style="color:var(--green)">${rs.move} moved</span>
          <span style="color:var(--danger)">${rs.delete} deleted</span>
          <span style="color:var(--accent)">${rs.rename} renamed</span>
        </div>
        <div class="stat-label">Rules Breakdown</div>
      </div>`;
  }

  grid.innerHTML = gridHTML;

  const chart = document.getElementById('chartWrap');
  chart.innerHTML = '';
  if (hasOrganize) {
    const sorted = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    const catColors = ['#3ddb3d','#378add','#ef9f27','#d4537e','#7f77dd','#1dacd6','#f97316','#28c840'];
    for (const [idx, [cat, count]] of sorted.entries()) {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const color = catColors[idx % catColors.length];
      chart.innerHTML += `<div class="chart-row">
        <div class="chart-label">${cat}</div>
        <div class="chart-track"><div class="chart-fill" style="width:${Math.round((count/max)*100)}%;background:${color}"></div></div>
        <div class="chart-count">${count} <span class="chart-pct">${pct}%</span></div>
      </div>`;
    }
    if (!sorted.length) chart.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:20px 0;text-align:center">No data yet</div>`;
  }
}

// ── Settings ──────────────────────────────────────────────────────
async function renderSettings() {
  applyThemeSettings();
  // Apply saved values to UI
  document.getElementById('settingLang').value = appSettings.language || 'en';
  document.getElementById('settingDefaultFolder').value = appSettings.defaultFolder || '';
  document.getElementById('scheduleTime').value = appSettings.schedule?.time || '09:00';
  document.getElementById('scheduleFolderInput').value = appSettings.schedule?.folder || '';

  // Toggles
  const toggles = {
    'toggleStartWindows': 'startWithWindows',
    'toggleMinimizeTray': 'minimizeToTray'
  };
  for (const [id, key] of Object.entries(toggles)) {
    const btn = document.getElementById(id);
    btn.classList.toggle('on', !!appSettings[key]);
  }

  // Days
  const savedDays = appSettings.schedule?.days || ['MON'];
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', savedDays.includes(btn.dataset.day));
  });

  renderCatSettings();
}

async function saveSetting(key, value) {
  appSettings[key] = value;
  await window.api.saveSettings(appSettings);
  if (key === 'language') applyLanguage(value);
}

async function toggleSetting(key) {
  appSettings[key] = !appSettings[key];
  await window.api.saveSettings(appSettings);
  const idMap = { startWithWindows: 'toggleStartWindows', minimizeToTray: 'toggleMinimizeTray' };
  document.getElementById(idMap[key]).classList.toggle('on', appSettings[key]);
  showToast(appSettings[key]
    ? (tr('enabled'))
    : (tr('disabled')));
}

async function pickDefaultFolder() {
  const f = await window.api.pickFolder();
  if (f) {
    document.getElementById('settingDefaultFolder').value = f;
    await saveSetting('defaultFolder', f);
    showToast(tr('defaultFolderSet'));
  }
}

async function clearDefaultFolder() {
  document.getElementById('settingDefaultFolder').value = '';
  await saveSetting('defaultFolder', '');
  showToast(tr('defaultFolderCleared'));
}

async function pickScheduleFolder() {
  const f = await window.api.pickFolder();
  if (f) {
    scheduleFolder = f;
    document.getElementById('scheduleFolderInput').value = f;
    if (!appSettings.schedule) appSettings.schedule = {};
    appSettings.schedule.folder = f;
    await window.api.saveSettings(appSettings);
  }
}

function toggleDay(btn) {
  btn.classList.toggle('active');
}

function getSelectedDays() {
  return [...document.querySelectorAll('.day-btn.active')].map(b => b.dataset.day);
}

async function enableSchedule() {
  const days = getSelectedDays();
  const time = document.getElementById('scheduleTime').value;
  const folder = appSettings.schedule?.folder || '';

  if (!days.length) { showToast(tr('selectDayFirst')); return; }
  if (!folder) { showToast(tr('selectFolderFirst')); return; }

  appSettings.schedule = { ...appSettings.schedule, enabled: true, days, time, folder };
  await window.api.saveSettings(appSettings);

  const result = await window.api.schedule({ days, time, folder });
  const el = document.getElementById('scheduleMsg');
  el.className = result.ok ? 'status-msg ok' : 'status-msg err';
  el.textContent = result.ok
    ? tr('scheduledDays').replace('{days}', days.join(', ')).replace('{time}', time)
    : tr('scheduleFailedMsg');
}

async function disableSchedule() {
  await window.api.unschedule();
  if (appSettings.schedule) appSettings.schedule.enabled = false;
  await window.api.saveSettings(appSettings);
  const el = document.getElementById('scheduleMsg');
  el.className = 'status-msg ok';
  el.textContent = tr('autoRunDisabled');
}

// ── Keyboard Shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement.tagName;
  const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag);

  // Confirm modal keyboard handling
  if (e.key === 'Escape' && _confirmResolve) { resolveConfirm(false); return; }
  if (e.key === 'Enter'  && _confirmResolve) { resolveConfirm(true);  return; }
  // Esc — close any open modal
  if (e.key === 'Escape') {
    document.querySelectorAll('.confirm-overlay:not(.hidden), .ob-overlay:not(.hidden)').forEach(m => {
      m.classList.add('hidden');
    });
    closePreviewCleanup();
    return;
  }

  // ? — show shortcuts
  if (e.key === '?' && !typing) {
    e.preventDefault();
    document.getElementById('shortcutsModal')?.classList.toggle('hidden');
    return;
  }

  // Ctrl shortcuts
  if (e.ctrlKey) {
    switch (e.key) {
      case 'o': e.preventDefault(); { const f = document.getElementById('folderInput')?.value; if (f) { showTab('organize'); organize(); } else { showTab('organize'); showToast(tr('selectFolderFirst') || 'Select a folder first'); } } break;
      case 'z': e.preventDefault(); document.getElementById('undoBtn')?.click(); break;
      case 'p': e.preventDefault(); {
        if (e.shiftKey) {
          const activeTab = document.querySelector('.page:not(.hidden)');
          if (activeTab?.id === 'page-rules') { previewRules(); }
        } else {
          const f = document.getElementById('folderInput')?.value; if (f) { showTab('organize'); showPreview(f); } else { showTab('organize'); showToast(tr('selectFolderFirst') || 'Select a folder first'); }
        }
      } break;
      case 'r': e.preventDefault(); { const activeTab = document.querySelector('.page:not(.hidden)'); if (activeTab?.id === 'page-rules') runRules(); } break;
      case 'f': e.preventDefault(); { const activeTab = document.querySelector('.page:not(.hidden)'); if (activeTab?.id === 'page-history') { document.getElementById('historySearch')?.focus(); } else { document.querySelector('.page:not(.hidden) input[type="text"]')?.focus(); } } break;
      case '1': e.preventDefault(); showTab('organize'); break;
      case '2': e.preventDefault(); showTab('group'); break;
      case '3': e.preventDefault(); showTab('history'); break;
      case '4': e.preventDefault(); showTab('stats'); break;
      case '5': e.preventDefault(); showTab('duplicates'); break;
      case '6': e.preventDefault(); showTab('cleanup'); break;
      case '7': e.preventDefault(); showTab('watcher'); break;
      case '8': e.preventDefault(); showTab('rules'); break;
      case '9': e.preventDefault(); showTab('settings'); break;
    }
  }
});

function closeShortcuts() {
  document.getElementById('shortcutsModal')?.classList.add('hidden');
}

// ── Context Menu ──────────────────────────────────────────────────
async function initContextMenuToggle() {
  const s = await window.api.getSettings();
  const btn = document.getElementById('toggleContextMenu');
  if (btn) btn.classList.toggle('on', !!s.contextMenuEnabled);
}

async function toggleContextMenu() {
  const s = await window.api.getSettings();
  const btn = document.getElementById('toggleContextMenu');
  const enabled = !s.contextMenuEnabled;
  const result = enabled
    ? await window.api.registerContextMenu()
    : await window.api.unregisterContextMenu();
  if (result.ok) {
    s.contextMenuEnabled = enabled;
    await window.api.saveSettings(s);
    if (btn) btn.classList.toggle('on', enabled);
    showToast(enabled ? tr('contextMenuEnabled') : tr('contextMenuDisabled'));
  } else {
    showToast(tr('contextMenuFailed'));
  }
}

// Handle launch from Explorer context menu
window.api.onContextMenuOrganize(async (folder) => {
  showTab('organize');
  const input = document.getElementById('folderInput');
  if (input) input.value = folder;
  appSettings.defaultFolder = folder;
  await window.api.saveSettings(appSettings);
  await organizeFolder(folder);
});

if (window.api.onContextMenuRules) {
  window.api.onContextMenuRules(async (folder) => {
    showTab('rules');
    const input = document.getElementById('rulesFolder');
    if (input) input.value = folder;
    await window.api.addRecentFolder(folder);
  });
}

// Handle tray actions
if (window.api.onTrayAction) {
  window.api.onTrayAction(async (data) => {
    if (data.action === 'tab') {
      showTab(data.tab);
    } else if (data.action === 'organize') {
      showTab('organize');
      const input = document.getElementById('folderInput');
      if (input) input.value = data.folder;
      await showPreview(data.folder);
    }
  });
}

// ── Batch Organize ────────────────────────────────────────────────
let batchFolders = [];
let batchModeActive = false;

function toggleBatchMode() {
  batchModeActive = !batchModeActive;
  document.getElementById('singleFolderMode').classList.toggle('hidden', batchModeActive);
  document.getElementById('batchFolderMode').classList.toggle('hidden', !batchModeActive);
  document.getElementById('batchModeBtn').classList.toggle('active', batchModeActive);
  document.getElementById('organizeEmptyState').classList.toggle('hidden', batchModeActive);
  document.getElementById('previewCard').classList.add('hidden');
  document.getElementById('resultsCard')?.classList.add('hidden');
  if (batchModeActive) renderBatchList();
}

async function pickBatchFolder() {
  const folder = await window.api.pickFolder();
  if (!folder) return;
  if (batchFolders.includes(folder)) { showToast(tr('folderAlreadyAdded') || 'Already added'); return; }
  batchFolders.push(folder);
  renderBatchList();
}

function addBatchDownloads() {
  window.api.getDownloads().then(folder => {
    if (!folder) return;
    if (batchFolders.includes(folder)) { showToast(tr('folderAlreadyAdded') || 'Already added'); return; }
    batchFolders.push(folder);
    renderBatchList();
  });
}

function removeBatchFolder(idx) {
  batchFolders.splice(idx, 1);
  renderBatchList();
}

function renderBatchList() {
  const list = document.getElementById('batchFolderList');
  if (!list) return;
  if (!batchFolders.length) {
    list.innerHTML = `<div style="font-size:11px;color:var(--text-dim);padding:6px 0">${tr('noBatchFolders') || 'No folders added yet'}</div>`;
    return;
  }
  list.innerHTML = batchFolders.map((f, i) => `
    <div class="batch-folder-row" id="batch-row-${i}">
      <span class="batch-folder-path" title="${sanitize(f)}">${sanitize(f)}</span>
      <span class="batch-folder-status" id="batch-status-${i}"></span>
      <button class="batch-folder-remove" onclick="removeBatchFolder(${i})"><i data-lucide="x"></i></button>
    </div>`).join('');
  lucide.createIcons();
}

async function organizeBatch() {
  if (!batchFolders.length) { showToast(tr('noBatchFolders') || 'No folders added'); return; }
  const statusEl = document.getElementById('batchStatus');
  let total = 0;

  for (let i = 0; i < batchFolders.length; i++) {
    const folder = batchFolders[i];
    const statusCell = document.getElementById(`batch-status-${i}`);
    if (statusEl) statusEl.textContent = `${tr('organizing') || 'Organizing'} ${i + 1}/${batchFolders.length}...`;
    if (statusCell) statusCell.textContent = '...';

    try {
      const result = await window.api.organize(folder);
      const moved = result.moved?.length || 0;
      total += moved;
      if (statusCell) {
        statusCell.textContent = `✓ ${moved} ${tr('moved') || 'moved'}`;
        statusCell.className = 'batch-folder-status done';
      }
    } catch (e) {
      if (statusCell) {
        statusCell.textContent = '✗ error';
        statusCell.className = 'batch-folder-status error';
      }
    }
  }

  if (statusEl) statusEl.textContent = `✓ ${tr('batchDone') || 'Done!'} ${total} ${tr('filesOrganized') || 'files organized'}`;
  showToast(`✓ ${total} ${tr('filesOrganized') || 'files organized'}`);
  batchFolders = [];
  renderBatchList();
}

// ── Cleanup Suggestions ───────────────────────────────────────────
const SUGGESTIONS_DISMISSED_KEY = 'mojo-dismissed-suggestions';

function getDismissedSuggestions() {
  try { return JSON.parse(localStorage.getItem(SUGGESTIONS_DISMISSED_KEY) || '[]'); }
  catch { return []; }
}

function dismissSuggestion(id) {
  const dismissed = getDismissedSuggestions();
  dismissed.push(id);
  localStorage.setItem(SUGGESTIONS_DISMISSED_KEY, JSON.stringify(dismissed));
  document.getElementById('suggestion-' + id)?.remove();
  const remaining = document.querySelectorAll('.suggestion-row').length;
  if (!remaining) document.getElementById('cleanupSuggestionsCard')?.classList.add('hidden');
  else document.getElementById('suggestionsCount').textContent = remaining;
}

async function loadCleanupSuggestions() {
  const sessions = await window.api.getLog();
  if (!sessions || !sessions.length) return;

  const dismissed = getDismissedSuggestions();
  const suggestions = [];
  const now = Date.now();
  const day = 86400000;

  // 1. Folders organized 3+ times in last 30 days
  const folderCounts = {};
  sessions.forEach(s => {
    if (now - new Date(s.timestamp).getTime() > 30 * day) return;
    folderCounts[s.folder] = (folderCounts[s.folder] || 0) + 1;
  });
  Object.entries(folderCounts).forEach(([folder, count]) => {
    if (count < 3) return;
    const id = 'freq-' + btoa(folder).slice(0, 16);
    if (dismissed.includes(id)) return;
    const name = folder.split(/[\\/]/).pop();
    suggestions.push({ id, type: 'org', icon: 'refresh-cw',
      title: tr('suggFreqTitle').replace('{name}', name),
      desc: tr('suggFreqDesc').replace('{count}', count),
      action: () => { document.getElementById('cleanupFolderInput').value = folder; appSettings.cleanupFolder = folder; },
      actionLabel: tr('suggOrganize')
    });
  });

  // 2. Large installers moved 30+ days ago
  const oldInstallers = [];
  sessions.forEach(s => {
    const age = now - new Date(s.timestamp).getTime();
    if (age < 30 * day) return;
    s.moved?.forEach(m => {
      if (m.category === 'Installers' || m.category === 'installers') {
        oldInstallers.push({ name: m.name, folder: s.folder, age: Math.floor(age / day) });
      }
    });
  });
  if (oldInstallers.length >= 3) {
    const id = 'old-installers';
    if (!dismissed.includes(id)) {
      suggestions.push({ id, type: 'del', icon: 'package',
        title: tr('suggInstallersTitle').replace('{count}', oldInstallers.length),
        desc: tr('suggInstallersDesc'),
        action: () => switchTab('cleanup'),
        actionLabel: tr('suggRunCleanup')
      });
    }
  }

  // 3. Category with 50+ files across sessions
  const catCounts = {};
  sessions.forEach(s => {
    s.moved?.forEach(m => { catCounts[m.category] = (catCounts[m.category] || 0) + 1; });
  });
  const topCat = Object.entries(catCounts).sort((a,b) => b[1]-a[1])[0];
  if (topCat && topCat[1] >= 50) {
    const [cat, count] = topCat;
    const id = 'top-cat-' + cat;
    if (!dismissed.includes(id)) {
      suggestions.push({ id, type: 'clean', icon: 'bar-chart-2',
        title: tr('suggCatTitle').replace('{cat}', cat).replace('{count}', count),
        desc: tr('suggCatDesc'),
        action: () => showTab('stats'),
        actionLabel: tr('suggViewStats')
      });
    }
  }

  if (!suggestions.length) return;

  const list = document.getElementById('suggestionsList');
  const card = document.getElementById('cleanupSuggestionsCard');
  list.innerHTML = '';

  suggestions.forEach(s => {
    const row = document.createElement('div');
    row.className = 'suggestion-row';
    row.id = 'suggestion-' + s.id;
    row.innerHTML = `
      <div class="suggestion-icon ${s.type}"><i data-lucide="${s.icon}"></i></div>
      <div class="suggestion-info">
        <div class="suggestion-title">${s.title}</div>
        <div class="suggestion-desc">${s.desc}</div>
      </div>
      <div class="suggestion-actions">
        <button class="suggestion-btn" onclick="suggestionAction('${s.id}')">${s.actionLabel}</button>
        <button class="suggestion-dismiss" onclick="dismissSuggestion('${s.id}')">✕</button>
      </div>`;
    list.appendChild(row);
  });

  // Store actions for later
  window._suggestionActions = window._suggestionActions || {};
  suggestions.forEach(s => { window._suggestionActions[s.id] = s.action; });

  document.getElementById('suggestionsCount').textContent = suggestions.length;
  card.classList.remove('hidden');
  lucide.createIcons();
}

function suggestionAction(id) {
  window._suggestionActions?.[id]?.();
  dismissSuggestion(id);
}

// ── Recycle Bin ───────────────────────────────────────────────────
const RECYCLE_BIN_SCOPES = {
  cleanup: { size: 'recycleBinSize', desc: 'recycleBinSizeDesc', btn: 'emptyRecycleBinBtn', msg: 'recycleBinMsg' },
  rules:   { size: 'rulesRecycleBinSize', desc: 'rulesRecycleBinSizeDesc', btn: 'rulesEmptyRecycleBinBtn', msg: 'rulesRecycleBinMsg' }
};

async function initRecycleBin(scope = 'cleanup') {
  const ids = RECYCLE_BIN_SCOPES[scope] || RECYCLE_BIN_SCOPES.cleanup;
  const result = await window.api.getRecycleBinSize();
  const sizeDesc = document.getElementById(ids.desc);
  const sizeHint = document.getElementById(ids.size);
  const btn = document.getElementById(ids.btn);
  if (!result.ok || result.size === 0) {
    if (sizeDesc) sizeDesc.textContent = tr('recycleBinEmpty');
    if (sizeHint) sizeHint.textContent = tr('recycleBinEmpty');
    if (btn) btn.disabled = true;
  } else {
    const label = `${formatSize(result.size)} · ${result.count} ${result.count === 1 ? 'item' : 'items'}`;
    if (sizeDesc) sizeDesc.textContent = label;
    if (sizeHint) sizeHint.textContent = formatSize(result.size);
    if (btn) btn.disabled = false;
  }
}

async function openRecycleBin() {
  await window.api.openRecycleBin();
}

async function emptyRecycleBin(scope = 'cleanup') {
  const ids = RECYCLE_BIN_SCOPES[scope] || RECYCLE_BIN_SCOPES.cleanup;
  const sizeHint = document.getElementById(ids.size);
  const size = sizeHint?.textContent;
  if (!await showConfirm(tr('confirmEmptyRecycleBin').replace('{size}', size || ''))) return;

  const btn = document.getElementById(ids.btn);
  if (btn) btn.disabled = true;

  const result = await window.api.emptyRecycleBin();
  const msg = document.getElementById(ids.msg);
  if (result.ok) {
    if (msg) { msg.className = 'status-msg ok'; msg.textContent = tr('recycleBinEmptied'); }
    const sizeDesc = document.getElementById(ids.desc);
    const sizeHint2 = document.getElementById(ids.size);
    if (sizeDesc) sizeDesc.textContent = tr('recycleBinEmpty');
    if (sizeHint2) sizeHint2.textContent = tr('recycleBinEmpty');
  } else {
    if (msg) { msg.className = 'status-msg err'; msg.textContent = tr('recycleBinFailed'); }
    if (btn) btn.disabled = false;
  }
}

// ── Cleanup Treemap ───────────────────────────────────────────────
const TREEMAP_COLORS = [
  'linear-gradient(135deg,#1a5c1a,#2a8a2a)',
  'linear-gradient(135deg,#1a3a6e,#1f4a8a)',
  'linear-gradient(135deg,#6e3a1a,#8a4a1f)',
  'linear-gradient(135deg,#4a1a6e,#5c2288)',
  'linear-gradient(135deg,#1a5a6e,#1f6e88)',
  'linear-gradient(135deg,#444,#555)',
];
const TREEMAP_DOTS = ['#2a8a2a','#1f4a8a','#8a4a1f','#5c2288','#1f6e88','#555'];

function renderCleanupTreemap(results, totalSize) {
  const treemap = document.getElementById('cleanupTreemap');
  const grid    = document.getElementById('treemapGrid');
  const legend  = document.getElementById('treemapLegend');
  const tooltip = document.getElementById('treemapTooltip');

  const sections = [
    { id: 'installers',   label: tr('installers'),     size: results.installers.totalSize },
    { id: 'junk',         label: tr('junkFiles'),      size: results.junk.totalSize },
    { id: 'duplicates',   label: tr('duplicateFiles'), size: results.duplicates.totalSize },
    { id: 'oldFiles',     label: tr('oldFiles'),       size: results.oldFiles?.totalSize || 0 },
    { id: 'emptyFolders', label: tr('emptyFolders'),   size: 0 },
  ].filter(s => s.size > 0);

  if (!sections.length) { treemap.classList.add('hidden'); return; }

  grid.innerHTML = '';
  legend.innerHTML = '';

  sections.forEach((sec, i) => {
    const pct = totalSize > 0 ? Math.max((sec.size / totalSize) * 100, 4) : 0;
    const isSmall = pct < 8;
    const block = document.createElement('div');
    block.className = 'treemap-block';
    block.style.background = TREEMAP_COLORS[i % TREEMAP_COLORS.length];
    block.style.flex = pct.toString();
    block.innerHTML = isSmall ? '' : `
      <span class="treemap-block-name">${sec.label}</span>
      <span class="treemap-block-size">${formatSize(sec.size)}</span>`;

    block.addEventListener('mouseenter', (e) => {
      document.getElementById('treemapTipName').textContent = sec.label;
      document.getElementById('treemapTipSize').textContent = formatSize(sec.size);
      document.getElementById('treemapTipPct').textContent = (totalSize > 0 ? Math.round(sec.size / totalSize * 100) : 0) + '% of total';
      tooltip.classList.remove('hidden');
    });
    block.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));
    block.addEventListener('click', () => {
      const target = document.getElementById('cleanup-section-' + sec.id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    grid.appendChild(block);

    const li = document.createElement('div');
    li.className = 'treemap-legend-item';
    li.innerHTML = `<div class="treemap-legend-dot" style="background:${TREEMAP_DOTS[i % TREEMAP_DOTS.length]}"></div>${sec.label} ${totalSize > 0 ? Math.round(sec.size / totalSize * 100) : 0}%`;
    legend.appendChild(li);
  });

  treemap.classList.remove('hidden');
}

// ── Rename Rules ──────────────────────────────────────────────────
let renameRules = { datePrefix: false, dateSuffix: false, spacesToUnderscores: false, lowercaseAll: false, removeSpecialChars: false };

async function loadRenameRules() {
  const s = await window.api.getSettings();
  renameRules = s.renameRules || { datePrefix: false, dateSuffix: false, spacesToUnderscores: false, lowercaseAll: false, removeSpecialChars: false };
  renderRenameRules();
}

function renderRenameRules() {
  for (const key of Object.keys(renameRules)) {
    const row = document.getElementById('rr-' + key);
    const tog = document.getElementById('rr-toggle-' + key);
    if (row) row.classList.toggle('active', !!renameRules[key]);
    if (tog) tog.classList.toggle('on', !!renameRules[key]);
  }
  updateRenamePreview();
  const count = Object.values(renameRules).filter(Boolean).length;
  const hint = document.getElementById('renameRulesHint');
  if (hint) hint.textContent = count ? `${count} active` : '';
}

async function toggleRenameRule(key) {
  if (key === 'datePrefix' && !renameRules.datePrefix) renameRules.dateSuffix = false;
  if (key === 'dateSuffix' && !renameRules.dateSuffix) renameRules.datePrefix = false;
  renameRules[key] = !renameRules[key];
  await window.api.saveRenameRules(renameRules);
  renderRenameRules();
}

function applyRenameRulesPreview(filename) {
  const dot  = filename.lastIndexOf('.');
  let base   = dot > 0 ? filename.slice(0, dot) : filename;
  const ext  = dot > 0 ? filename.slice(dot) : '';
  const today = new Date().toISOString().slice(0, 10);
  if (renameRules.datePrefix)          base = `${today}_${base}`;
  if (renameRules.dateSuffix)          base = `${base}_${today}`;
  if (renameRules.spacesToUnderscores) base = base.replace(/ /g, '_');
  if (renameRules.lowercaseAll)        base = base.toLowerCase();
  if (renameRules.removeSpecialChars)  base = base.replace(/[^\w\-\u0370-\u03FF\u1F00-\u1FFF]/g, '');
  return base + ext;
}

function updateRenamePreview() {
  const sample = 'My Photo (1).jpg';
  const result = applyRenameRulesPreview(sample);
  const out = document.getElementById('rrPreviewOut');
  if (out) {
    out.textContent = result;
    out.style.color = result !== sample ? 'var(--accent, var(--green))' : 'var(--text-dim)';
  }
}

// ── Cleanup Schedule ─────────────────────────────────────────────
async function pickCleanupScheduleFolder() {
  const f = await window.api.pickFolder();
  if (f) {
    document.getElementById('cleanupScheduleFolder').value = f;
    if (!appSettings.cleanupSchedule) appSettings.cleanupSchedule = {};
    appSettings.cleanupSchedule.folder = f;
    await window.api.saveSettings(appSettings);
  }
}

function toggleCleanupDay(btn) { btn.classList.toggle('active'); }

function getCleanupSelectedDays() {
  return [...document.querySelectorAll('#cleanupDaysRow .day-btn.active')].map(b => b.dataset.day);
}

function getCleanupSelectedSections() {
  const sections = [];
  if (document.getElementById('csInstaller')?.checked) sections.push('installers');
  if (document.getElementById('csJunk')?.checked) sections.push('junk');
  if (document.getElementById('csOldFiles')?.checked) sections.push('oldFiles');
  if (document.getElementById('csEmptyFolders')?.checked) sections.push('emptyFolders');
  return sections;
}

async function enableCleanupSchedule() {
  const days = getCleanupSelectedDays();
  const time = document.getElementById('cleanupScheduleTime').value;
  const folder = appSettings.cleanupSchedule?.folder || '';
  const sections = getCleanupSelectedSections();

  if (!days.length) { showToast(tr('selectDayFirst')); return; }
  if (!folder) { showToast(tr('selectFolderFirst')); return; }
  if (!sections.length) { showToast(tr('selectSectionFirst')); return; }

  appSettings.cleanupSchedule = { ...appSettings.cleanupSchedule, enabled: true, days, time, folder, sections };
  await window.api.saveSettings(appSettings);

  const result = await window.api.scheduleCleanup({ days, time, folder, sections });
  const el = document.getElementById('cleanupScheduleMsg');
  el.className = result.ok ? 'status-msg ok' : 'status-msg err';
  el.textContent = result.ok ? tr('scheduledMsg') : tr('scheduleFailedMsg');
}

async function disableCleanupSchedule() {
  await window.api.unscheduleCleanup();
  if (appSettings.cleanupSchedule) appSettings.cleanupSchedule.enabled = false;
  await window.api.saveSettings(appSettings);
  const el = document.getElementById('cleanupScheduleMsg');
  el.className = 'status-msg ok';
  el.textContent = tr('autoRunDisabled');
}

// ── Rules Schedule ────────────────────────────────────────────────
async function pickRulesScheduleFolder() {
  const f = await window.api.pickFolder();
  if (f) {
    document.getElementById('rulesScheduleFolder').value = f;
    const settingsEl = document.getElementById('rulesScheduleFolderSettings');
    if (settingsEl) settingsEl.value = f;
    if (!appSettings.rulesSchedule) appSettings.rulesSchedule = {};
    appSettings.rulesSchedule.folder = f;
    await window.api.saveSettings(appSettings);
  }
}

async function pickRulesScheduleFolderSettings() {
  const f = await window.api.pickFolder();
  if (f) {
    document.getElementById('rulesScheduleFolderSettings').value = f;
    const rulesEl = document.getElementById('rulesScheduleFolder');
    if (rulesEl) rulesEl.value = f;
    if (!appSettings.rulesSchedule) appSettings.rulesSchedule = {};
    appSettings.rulesSchedule.folder = f;
    await window.api.saveSettings(appSettings);
  }
}

function toggleRulesDay(btn) { btn.classList.toggle('active'); syncRulesDays('rulesDaysRow', 'rulesDaysRowSettings'); }
function toggleRulesDaySettings(btn) { btn.classList.toggle('active'); syncRulesDays('rulesDaysRowSettings', 'rulesDaysRow'); }

function syncRulesDays(sourceId, targetId) {
  const active = [...document.querySelectorAll(`#${sourceId} .day-btn.active`)].map(b => b.dataset.day);
  document.querySelectorAll(`#${targetId} .day-btn`).forEach(b => {
    b.classList.toggle('active', active.includes(b.dataset.day));
  });
}

function getRulesSelectedDays() {
  return [...document.querySelectorAll('#rulesDaysRow .day-btn.active')].map(b => b.dataset.day);
}

async function enableRulesSchedule() {
  const days = getRulesSelectedDays();
  const time = document.getElementById('rulesScheduleTime').value;
  const folder = appSettings.rulesSchedule?.folder || '';
  if (!days.length) { showToast(tr('selectDayFirst')); return; }
  if (!folder) { showToast(tr('selectFolderFirst')); return; }
  appSettings.rulesSchedule = { ...appSettings.rulesSchedule, enabled: true, days, time, folder };
  await window.api.saveSettings(appSettings);
  const result = await window.api.scheduleRules({ days, time, folder });
  const el = document.getElementById('rulesScheduleMsg');
  if (el) { el.className = result.ok ? 'status-msg ok' : 'status-msg err'; el.textContent = result.ok ? tr('scheduledMsg') : tr('scheduleFailedMsg'); }
  const elS = document.getElementById('rulesScheduleMsgSettings');
  if (elS) { elS.className = result.ok ? 'status-msg ok' : 'status-msg err'; elS.textContent = result.ok ? tr('scheduledMsg') : tr('scheduleFailedMsg'); }
}

async function enableRulesScheduleSettings() {
  const days = [...document.querySelectorAll('#rulesDaysRowSettings .day-btn.active')].map(b => b.dataset.day);
  const time = document.getElementById('rulesScheduleTimeSettings').value;
  const folder = appSettings.rulesSchedule?.folder || '';
  if (!days.length) { showToast(tr('selectDayFirst')); return; }
  if (!folder) { showToast(tr('selectFolderFirst')); return; }
  appSettings.rulesSchedule = { ...appSettings.rulesSchedule, enabled: true, days, time, folder };
  await window.api.saveSettings(appSettings);
  const result = await window.api.scheduleRules({ days, time, folder });
  const el = document.getElementById('rulesScheduleMsg');
  if (el) { el.className = result.ok ? 'status-msg ok' : 'status-msg err'; el.textContent = result.ok ? tr('scheduledMsg') : tr('scheduleFailedMsg'); }
  const elS = document.getElementById('rulesScheduleMsgSettings');
  if (elS) { elS.className = result.ok ? 'status-msg ok' : 'status-msg err'; elS.textContent = result.ok ? tr('scheduledMsg') : tr('scheduleFailedMsg'); }
}

async function disableRulesSchedule() {
  await window.api.unscheduleRules();
  if (appSettings.rulesSchedule) appSettings.rulesSchedule.enabled = false;
  await window.api.saveSettings(appSettings);
  const el = document.getElementById('rulesScheduleMsg');
  if (el) { el.className = 'status-msg ok'; el.textContent = tr('autoRunDisabled'); }
  const elS = document.getElementById('rulesScheduleMsgSettings');
  if (elS) { elS.className = 'status-msg ok'; elS.textContent = tr('autoRunDisabled'); }
}

function initRulesScheduleUI() {
  const rs = appSettings.rulesSchedule;
  if (!rs) return;
  if (rs.folder) {
    const el = document.getElementById('rulesScheduleFolder');
    const elS = document.getElementById('rulesScheduleFolderSettings');
    if (el) el.value = rs.folder;
    if (elS) elS.value = rs.folder;
  }
  if (rs.time) {
    const el = document.getElementById('rulesScheduleTime');
    const elS = document.getElementById('rulesScheduleTimeSettings');
    if (el) el.value = rs.time;
    if (elS) elS.value = rs.time;
  }
  if (rs.days) {
    document.querySelectorAll('#rulesDaysRow .day-btn, #rulesDaysRowSettings .day-btn').forEach(b => {
      b.classList.toggle('active', rs.days.includes(b.dataset.day));
    });
  }
}

function initCleanupScheduleUI() {
  const cs = appSettings.cleanupSchedule;
  if (!cs) return;
  if (cs.folder) document.getElementById('cleanupScheduleFolder').value = cs.folder;
  if (cs.time) document.getElementById('cleanupScheduleTime').value = cs.time;
  if (cs.days) {
    document.querySelectorAll('#cleanupDaysRow .day-btn').forEach(b => {
      b.classList.toggle('active', cs.days.includes(b.dataset.day));
    });
  }
  if (cs.sections) {
    if (document.getElementById('csInstaller')) document.getElementById('csInstaller').checked = cs.sections.includes('installers');
    if (document.getElementById('csJunk')) document.getElementById('csJunk').checked = cs.sections.includes('junk');
    if (document.getElementById('csOldFiles')) document.getElementById('csOldFiles').checked = cs.sections.includes('oldFiles');
    if (document.getElementById('csEmptyFolders')) document.getElementById('csEmptyFolders').checked = cs.sections.includes('emptyFolders');
  }
}

// ── Categories settings ───────────────────────────────────────────
function renderCatSettings() {
  const list = document.getElementById('catSettingsList');
  list.innerHTML = '';
  const iconMap = {
    'Images': 'image', 'Videos': 'video', 'Audio': 'music',
    'Documents': 'file-text', 'Archives': 'archive', 'Code': 'code',
    'Installers': 'package', 'Fonts': 'type', 'Torrents': 'download'
  };
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const icon = iconMap[cat.name] || 'folder';
    const extChips = cat.extensions.map((ext, j) => `
      <span class="ext-chip">${ext}
        <button class="ext-chip-del" onclick="removeExt(${i},${j})"><i data-lucide="x"></i></button>
      </span>`).join('');
    const row = document.createElement('div');
    row.className = 'cat-setting-row';
    row.innerHTML = `
      <div class="cat-setting-header" onclick="toggleCatSetting(this)">
        <button class="cat-toggle ${cat.enabled ? 'on' : ''}" onclick="toggleCat(event,${i})"></button>
        <span class="cat-icon-wrap"><i data-lucide="${icon}"></i></span>
        <span class="cat-setting-name">${cat.name}</span>
        <span class="cat-setting-count">${cat.extensions.length} ext</span>
        <button class="cat-del-btn" onclick="deleteCat(event,${i})"><i data-lucide="trash-2"></i></button>
        <span class="cat-setting-chevron"><i data-lucide="chevron-down"></i></span>
      </div>
      <div class="cat-setting-body">
        <div class="ext-chips" id="ext-chips-${i}">${extChips}</div>
        <div class="ext-add-row">
          <input type="text" id="ext-input-${i}" placeholder=".ext" onkeydown="if(event.key==='Enter')addExt(${i})"/>
          <button class="btn btn-outline btn-sm" onclick="addExt(${i})"><i data-lucide="plus"></i> Add</button>
        </div>
      </div>`;
    list.appendChild(row);
  }
  lucide.createIcons();
  const hint = document.getElementById('categoriesCountHint');
  if (hint) hint.textContent = `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`;
}

function toggleCatSetting(header) { header.closest('.cat-setting-row').classList.toggle('open'); }

async function toggleCat(e, i) {
  e.stopPropagation();
  categories[i].enabled = !categories[i].enabled;
  e.target.classList.toggle('on', categories[i].enabled);
  await window.api.saveCategories(categories);
}

async function deleteCat(e, i) {
  e.stopPropagation();
  if (!await showConfirm(tr('confirmDeleteCategory').replace('{name}', categories[i].name))) return;
  categories.splice(i, 1);
  await window.api.saveCategories(categories);
  renderCatSettings();
  showToast(tr('categoryDeleted'));
}

async function addExt(i) {
  const input = document.getElementById(`ext-input-${i}`);
  let ext = input.value.trim().toLowerCase();
  if (!ext) return;
  if (!ext.startsWith('.')) ext = '.' + ext;
  if (categories[i].extensions.includes(ext)) { showToast('Already exists!'); return; }
  categories[i].extensions.push(ext);
  await window.api.saveCategories(categories);
  input.value = '';
  renderCatSettings();
  showToast(`${ext} added`);
}

async function removeExt(i, j) {
  categories[i].extensions.splice(j, 1);
  await window.api.saveCategories(categories);
  renderCatSettings();
}

async function addCategory() {
  const input = document.getElementById('newCatName');
  const name = input.value.trim();
  if (!name) return;
  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) { showToast(tr('alreadyExists')); return; }
  categories.push({ id: name.toLowerCase().replace(/\s+/g,'-'), name, icon: 'folder', enabled: true, extensions: [] });
  await window.api.saveCategories(categories);
  input.value = '';
  renderCatSettings();
  showToast(tr('categoryCreated').replace('{name}', name));
}

async function resetCategories() {
  if (!await showConfirm(tr('confirmResetCategories'))) return;
  categories = await window.api.resetCategories();
  renderCatSettings();
  showToast(tr('resetToDefaults'));
}

// ── Duplicate Finder ─────────────────────────────────────────────
let currentDupFolder = null;
let lastDeletedDups = [];

async function pickDupFolder()    { const f = await window.api.pickFolder();   if (f) setDupFolder(f); }
async function useDownloadsDup()  { const f = await window.api.getDownloads(); if (f) setDupFolder(f); }

function setDupFolder(folder) {
  currentDupFolder = folder;
  document.getElementById('dupFolderInput').value = folder;
  trackRecentFolder(folder);
}

async function scanDuplicates(mode) {
  if (!currentDupFolder) { showToast(tr('selectFolderFirst')); return; }

  // Toggle active button
  document.getElementById('scanContentBtn').classList.toggle('active', mode === 'content');
  document.getElementById('scanNameBtn').classList.toggle('active', mode === 'name');

  showToast(tr('scanning'));
  const result = await window.api.scanDuplicates({ folderPath: currentDupFolder, mode });

  const card  = document.getElementById('dupResultsCard');
  const empty = document.getElementById('dupEmpty');
  const list  = document.getElementById('dupList');

  if (!result.duplicates.length) {
    card.classList.add('hidden');
    empty.classList.remove('hidden');
    lucide.createIcons();
    return;
  }

  empty.classList.add('hidden');
  card.classList.remove('hidden');
  document.getElementById('dupCount').textContent = `${result.totalGroups} groups · ${result.totalFiles} files`;

  list.innerHTML = '';
  result.duplicates.forEach((group, gi) => {
    const div = document.createElement('div');
    div.className = 'dup-group';
    const size = formatSize(group[0].size);

    // Smart suggestion: keep newest file (highest mtime)
    const keepIdx = group.reduce((best, f, i) => (f.mtime > group[best].mtime ? i : best), 0);
    const keepReason = 'newest';

    const rows = group.map((f, fi) => {
      const isKeep = fi === keepIdx;
      const dateStr = f.mtime ? new Date(f.mtime).toLocaleDateString() : '';
      return `<div class="dup-row ${isKeep ? 'keep-row' : ''}" onclick="toggleDupRow(this, '${f.path.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}', '${f.name.replace(/'/g,"\\'")}', ${f.size})">
        <div class="dup-check ${isKeep ? '' : ''}"><i data-lucide="check"></i></div>
        ${isKeep
          ? `<span class="keep-badge">KEEP <span class="keep-reason">${keepReason}</span></span>`
          : '<span class="del-badge">DELETE</span>'}
        <span class="dup-filename" title="${sanitize(f.name)}">${sanitize(f.name)}</span>
        <span class="dup-filepath" title="${f.path}">${f.path}</span>
        <span class="dup-size">${size}</span>
        ${dateStr ? `<span class="dup-date">${dateStr}</span>` : ''}
      </div>`;
    }).join('');

    div.innerHTML = `
      <div class="dup-group-header">
        <i data-lucide="copy"></i>
        ${group.length} duplicate files · ${size} each
      </div>
      ${rows}`;
    list.appendChild(div);
  });
  lucide.createIcons();
}

function toggleDupRow(row, filePath, fileName, fileSize) {
  if (row.classList.contains('keep-row')) return; // can't select keep row
  row.classList.toggle('selected');
  const check = row.querySelector('.dup-check');
  check.classList.toggle('checked', row.classList.contains('selected'));
  lucide.createIcons();
}


async function deleteSelected() {
  const selectedRows = document.querySelectorAll('.dup-row.selected');
  if (!selectedRows.length) { showToast(tr('selectFilesFirst')); return; }

  const files = [...selectedRows].map(row => {
    const pathEl = row.querySelector('.dup-filepath');
    const nameEl = row.querySelector('.dup-filename');
    const sizeEl = row.querySelector('.dup-size');
    return { path: pathEl.title, name: nameEl.textContent, size: 0 };
  });

  if (!await showConfirm(tr('confirmDeleteFiles').replace('{count}', files.length))) return;

  const result = await window.api.deleteDuplicates(files);
  lastDeletedDups = result.deleted;

  document.getElementById('undoDupBtn').style.display = result.deleted.length ? 'flex' : 'none';
  showToast(tr('deletedFiles').replace('{count}', result.deleted.length));

  const lastMode = document.getElementById('scanContentBtn').classList.contains('active') ? 'content' : 'name';
  await scanDuplicates(lastMode);
}

async function undoDuplicates() {
  if (!lastDeletedDups.length) return;
  const result = await window.api.restoreDuplicates(lastDeletedDups);
  lastDeletedDups = [];
  document.getElementById('undoDupBtn').style.display = 'none';
  showToast(tr('restoredDupFiles').replace('{count}', result.restored.length));
  await scanDuplicates('content');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── File Watcher ─────────────────────────────────────────────────
let watcherEventCount = 0;

async function initWatcher() {
  const status = await window.api.getWatcherStatus();
  if (status.active) {
  document.getElementById('watcherFolderInput').value = status.folder;
  if (document.getElementById('page-watcher') && !document.getElementById('page-watcher').classList.contains('hidden')) {
    setWatcherActive(true);
  }
}

  window.api.onWatcherEvent((data) => {
    addWatcherEvent(data.filename, data.category);
  });
}

async function pickWatcherFolder() {
  const f = await window.api.pickFolder();
  if (f) document.getElementById('watcherFolderInput').value = f;
}

async function useDownloadsWatcher() {
  const f = await window.api.getDownloads();
  if (f) document.getElementById('watcherFolderInput').value = f;
}

async function startWatcher() {
  const folder = document.getElementById('watcherFolderInput').value;
  if (!folder) { showToast(tr('selectFolderFirst')); return; }

  const result = await window.api.startWatcher(folder);
  if (result.ok) {
    setWatcherActive(true);
    const empty = document.getElementById('watcherEmpty');
    if (empty) { empty.classList.remove('hidden'); lucide.createIcons(); }
    showToast(tr('watchingFiles'));
  } else {
    showToast(tr('failedStartWatcher'));
  }
}

async function stopWatcher() {
  await window.api.stopWatcher();
  setWatcherActive(false);
  showToast(tr('watcherStopped'));
}

function setWatcherActive(active) {
  document.getElementById('startWatcherBtn').classList.toggle('hidden', active);
  document.getElementById('stopWatcherBtn').classList.toggle('hidden', !active);
  document.getElementById('watcherActiveBadge').classList.toggle('hidden', !active);
}

function addWatcherEvent(filename, category) {
  watcherEventCount++;
  document.getElementById('watcherEventCount').textContent = `${watcherEventCount} event${watcherEventCount !== 1 ? 's' : ''}`;

  const log = document.getElementById('watcherLog');
  const empty = document.getElementById('watcherEmpty');
  if (empty) empty.classList.add('hidden');

  const now = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const el = document.createElement('div');
  el.className = 'watcher-event';
  el.innerHTML = `
    <div class="watcher-pulse"></div>
    <span class="watcher-event-time">${now}</span>
    <span class="watcher-event-file">${filename}</span>
    <span class="watcher-event-cat">→ ${category}/</span>`;
  log.insertBefore(el, log.firstChild);
  lucide.createIcons();

  document.getElementById('watcherLogCard').classList.remove('hidden');
}

function clearWatcherLog() {
  document.getElementById('watcherLog').innerHTML = '';
  watcherEventCount = 0;
  document.getElementById('watcherEventCount').textContent = '0 events';
  const empty = document.getElementById('watcherEmpty');
  if (empty) empty.classList.remove('hidden');
}

// ── Themes ───────────────────────────────────────────────────────
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  document.getElementById('themeDark').classList.toggle('active', theme === 'dark');
  document.getElementById('themeLight').classList.toggle('active', theme === 'light');
  appSettings.theme = theme;
  window.api.saveSettings(appSettings);
}

function setAccent(color, dotEl) {
  // Convert hex to rgb for manual mixing
  const r = parseInt(color.slice(1,3), 16);
  const g = parseInt(color.slice(3,5), 16);
  const b = parseInt(color.slice(5,7), 16);

  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--green', color);
  document.documentElement.style.setProperty('--green-dim', `rgba(${r},${g},${b},0.12)`);
  document.documentElement.style.setProperty('--green-hover', `rgba(${r},${g},${b},0.85)`);
  document.body.style.setProperty('--accent', color);
  document.body.style.setProperty('--green', color);
  document.body.style.setProperty('--green-dim', `rgba(${r},${g},${b},0.12)`);
  document.body.style.setProperty('--green-hover', `rgba(${r},${g},${b},0.85)`);
  document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('selected'));
if (dotEl) dotEl.classList.add('selected');

  appSettings.accent = color;
  window.api.saveSettings(appSettings);
}

function applyThemeSettings() {
  if (appSettings.theme) setTheme(appSettings.theme);
  if (appSettings.accent) {
    document.documentElement.style.setProperty('--accent', appSettings.accent);
    document.getElementById('customAccentColor').value = appSettings.accent;
    document.querySelectorAll('.accent-dot').forEach(d => {
      d.classList.toggle('selected', d.dataset.color === appSettings.accent);
    });
  }
}

// ── Export Stats ─────────────────────────────────────────────────
async function exportStats(format) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];

  const options = format === 'csv' ? {
    title: 'Export to CSV',
    defaultPath: `mojo-stats-${new Date().toISOString().slice(0,10)}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  } : {
    title: 'Export to PDF',
    defaultPath: `mojo-stats-${new Date().toISOString().slice(0,10)}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  };

  const savePath = await window.api.showSaveDialog(options);
  if (!savePath) return;

  const result = format === 'csv'
    ? await window.api.exportCsv(savePath)
    : await window.api.exportPdf(savePath);

  if (result.ok) {
    showToast(format === 'csv' ? 'Exported to CSV!' : 'Exported to PDF!');
  } else {
    showToast('Export failed: ' + result.error);
  }
}

// ── Cleanup Tab ───────────────────────────────────────────────────
let currentCleanupFolder = null;
let cleanupScanResults = null;
let lastCleanupDeleted = [];
let ageThresholdMonths = 6;

async function pickCleanupFolder()    { const f = await window.api.pickFolder();   if (f) setCleanupFolder(f); }
async function useDownloadsCleanup()  { const f = await window.api.getDownloads(); if (f) setCleanupFolder(f); }

function setCleanupFolder(folder) {
  currentCleanupFolder = folder;
  document.getElementById('cleanupFolderInput').value = folder;
  trackRecentFolder(folder);
}

function setAgeThreshold(months, btnEl) {
  if (!months || months < 1) return;
  ageThresholdMonths = months;
  document.querySelectorAll('#ageThresholdGroup .theme-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
    document.getElementById('customAgeMonths').value = '';
  }
}

async function scanCleanup() {
  if (!currentCleanupFolder) { showToast(tr('selectFolderFirst')); return; }
  showToast(tr('scanning'));
  const preScan = document.getElementById('cleanupPreScan');
  if (preScan) preScan.classList.add('hidden');

  const results = await window.api.scanCleanup({ folderPath: currentCleanupFolder, oldFilesMonths: ageThresholdMonths });
  cleanupScanResults = results;

  const totalSize = results.installers.totalSize + results.junk.totalSize + results.duplicates.totalSize + (results.oldFiles?.totalSize || 0);

  if (totalSize === 0 && results.emptyFolders.count === 0) {
    document.getElementById('cleanupResultsCard').classList.add('hidden');
    document.getElementById('cleanupEmpty').classList.remove('hidden');
    lucide.createIcons();
    return;
  }

  document.getElementById('cleanupEmpty').classList.add('hidden');
  document.getElementById('cleanupResultsCard').classList.remove('hidden');
  document.getElementById('cleanupTotalSize').textContent = formatSize(totalSize) + ' found';

  renderCleanupTreemap(results, totalSize);

  const maxSize = Math.max(results.installers.totalSize, results.junk.totalSize, results.duplicates.totalSize, results.oldFiles?.totalSize || 0, 1);

  const sections = [
    {
      id: 'installers', icon: '⚙️',
      title: tr('installers'),
      desc: '.exe .msi .pkg .dmg',
      size: results.installers.totalSize,
      count: results.installers.files.length,
      label: tr('filesLabel')
    },
    {
      id: 'junk', icon: '🗑️',
      title: tr('junkFiles'),
      desc: '.tmp .log .cache .bak',
      size: results.junk.totalSize,
      count: results.junk.files.length,
      label: tr('filesLabel')
    },
    {
      id: 'duplicates', icon: '📄',
      title: tr('duplicateFiles'),
      desc: tr('identicalByContent'),
      size: results.duplicates.totalSize,
      count: results.duplicates.files.length,
      label: tr('filesLabel')
    },
    {
      id: 'oldFiles', icon: '🕒',
      title: tr('oldFiles'),
      desc: tr('notUsedMonths').replace('{count}', ageThresholdMonths),
      size: results.oldFiles?.totalSize || 0,
      count: results.oldFiles?.files.length || 0,
      label: tr('filesLabel')
    },
    {
      id: 'emptyFolders', icon: '📁',
      title: tr('emptyFolders'),
      desc: tr('foldersNoFiles'),
      size: 0,
      count: results.emptyFolders.count,
      label: tr('foldersLabel')
    }
  ];

  const container = document.getElementById('cleanupSections');
  container.innerHTML = sections.map(s => `
    <div class="cleanup-section">
      <div class="cleanup-section-row" onclick="toggleCleanupSection('${s.id}')">
        <input type="checkbox" id="check-${s.id}" checked onclick="event.stopPropagation();updateCleanupTotal()"/>
        <span class="cleanup-section-icon">${s.icon}</span>
        <div class="cleanup-section-info">
          <div class="cleanup-section-title">${s.title}</div>
          <div class="cleanup-section-desc">${s.desc}</div>
          <div class="cleanup-section-bar">
            <div class="cleanup-section-fill" style="width:${s.size ? Math.round((s.size/maxSize)*100) : 0}%"></div>
          </div>
        </div>
        <div class="cleanup-section-stats">
          <div class="cleanup-section-size">${s.size ? formatSize(s.size) : '—'}</div>
          <div class="cleanup-section-count">${s.count} ${s.label}</div>
        </div>
      </div>
    </div>`).join('');

  updateCleanupTotal();

  // Render duplicate apps if found
  const dupApps = results.duplicateApps || [];
  const dupAppsContainer = document.getElementById('cleanupSections');
  if (dupApps.length > 0) {
    const totalOldSize = dupApps.reduce((s, g) => s + g.delete.reduce((ss, f) => ss + f.size, 0), 0);
    const dupAppsEl = document.createElement('div');
    dupAppsEl.className = 'cleanup-section dup-apps-section';
    dupAppsEl.id = 'cleanup-section-dupApps';
    dupAppsEl.innerHTML = `
      <div class="cleanup-section-header" onclick="toggleCleanupSection('dupApps')">
        <input type="checkbox" id="check-dupApps" onchange="updateCleanupTotal()" checked onclick="event.stopPropagation()"/>
        <i data-lucide="layers" class="cleanup-section-icon"></i>
        <div class="cleanup-section-info">
          <div class="cleanup-section-title">${tr('duplicateApps')}</div>
          <div class="cleanup-section-desc">${tr('duplicateAppsDesc')}</div>
          <div class="cleanup-section-bar">
            <div class="cleanup-section-fill" style="width:${totalOldSize ? Math.round((totalOldSize/maxSize)*100) : 0}%"></div>
          </div>
        </div>
        <div class="cleanup-section-stats">
          <div class="cleanup-section-size">${totalOldSize ? formatSize(totalOldSize) : '—'}</div>
          <div class="cleanup-section-count">${dupApps.length} ${tr('appsLabel')}</div>
        </div>
      </div>
      <div class="dup-apps-list">
        ${dupApps.map(g => `
          <div class="dup-app-group">
            <div class="dup-app-name">${g.appName}</div>
            <div class="dup-app-keep">
              <span class="dup-badge keep">${tr('keep')}</span>
              <span class="dup-app-file">${g.keep.name}</span>
              <span class="dup-app-size">${formatSize(g.keep.size)}</span>
            </div>
            ${g.delete.map(f => `
              <div class="dup-app-del">
                <span class="dup-badge delete">${tr('delete')}</span>
                <span class="dup-app-file">${sanitize(f.name)}</span>
                <span class="dup-app-size">${formatSize(f.size)}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>`;
    dupAppsContainer.appendChild(dupAppsEl);
  }

  lucide.createIcons();
}

function toggleCleanupSection(id) {
  const cb = document.getElementById(`check-${id}`);
  cb.checked = !cb.checked;
  updateCleanupTotal();
}

function toggleSelectAll(checked) {
  ['installers','junk','duplicates','oldFiles','emptyFolders'].forEach(id => {
    const cb = document.getElementById(`check-${id}`);
    if (cb) cb.checked = checked;
  });
  updateCleanupTotal();
}

function updateCleanupTotal() {
  if (!cleanupScanResults) return;
  let total = 0;
  if (document.getElementById('check-installers')?.checked)   total += cleanupScanResults.installers.totalSize;
  if (document.getElementById('check-junk')?.checked)         total += cleanupScanResults.junk.totalSize;
  if (document.getElementById('check-duplicates')?.checked)   total += cleanupScanResults.duplicates.totalSize;
  if (document.getElementById('check-oldFiles')?.checked)     total += (cleanupScanResults.oldFiles?.totalSize || 0);
  if (document.getElementById('check-dupApps')?.checked) {
    (cleanupScanResults.duplicateApps || []).forEach(g => {
      g.delete.forEach(f => { total += f.size; });
    });
  }
  document.getElementById('cleanupSelectedSize').textContent = formatSize(total) + ' selected';

  const allChecked = ['installers','junk','duplicates','oldFiles','emptyFolders'].every(id => document.getElementById(`check-${id}`)?.checked);
  document.getElementById('selectAllCleanup').checked = allChecked;
}

function previewCleanup() {
  if (!cleanupScanResults) return;

  const sections = [];

  if (document.getElementById('check-installers')?.checked && cleanupScanResults.installers.files.length) {
    sections.push({ label: tr('installers'), files: cleanupScanResults.installers.files });
  }
  if (document.getElementById('check-junk')?.checked && cleanupScanResults.junk.files.length) {
    sections.push({ label: tr('junkFiles'), files: cleanupScanResults.junk.files });
  }
  if (document.getElementById('check-duplicates')?.checked && cleanupScanResults.duplicates.files.length) {
    sections.push({ label: tr('duplicateFiles'), files: cleanupScanResults.duplicates.files });
  }
  if (document.getElementById('check-oldFiles')?.checked && (cleanupScanResults.oldFiles?.files || []).length) {
    sections.push({ label: tr('oldFiles'), files: cleanupScanResults.oldFiles.files });
  }
  if (document.getElementById('check-emptyFolders')?.checked && cleanupScanResults.emptyFolders.folders.length) {
    sections.push({ label: tr('emptyFolders'), files: cleanupScanResults.emptyFolders.folders.map(f => ({ name: f.name, size: 0 })) });
  }

  const totalCount = sections.reduce((s, sec) => s + sec.files.length, 0);
  if (!totalCount) { showToast(tr('nothingSelected')); return; }

  const body = sections.map(sec => `
    <div class="preview-section">
      <div class="preview-section-label">${sec.label} <span class="preview-section-count">${sec.files.length}</span></div>
      ${sec.files.map(f => `
        <div class="preview-file-row">
          <span class="preview-file-name">${sanitize(f.name)}</span>
          <span class="preview-file-size">${f.size ? formatSize(f.size) : tr('emptyFolders')}</span>
        </div>`).join('')}
    </div>`).join('');

  const modal = document.getElementById('previewCleanupModal');
  const countEl = document.getElementById('previewCleanupCount');
  const bodyEl = document.getElementById('previewCleanupBody');

  if (countEl) countEl.textContent = totalCount;
  if (bodyEl) bodyEl.innerHTML = body;
  if (modal) modal.classList.remove('hidden');
}

function closePreviewCleanup() {
  document.getElementById('previewCleanupModal')?.classList.add('hidden');
}

async function runCleanup() {
  if (!cleanupScanResults) return;

  const dupAppsFiles = document.getElementById('check-dupApps')?.checked
    ? (cleanupScanResults.duplicateApps || []).flatMap(g => g.delete)
    : null;

  const toDelete = {
    installers:   document.getElementById('check-installers')?.checked   ? cleanupScanResults.installers.files : null,
    junk:         document.getElementById('check-junk')?.checked         ? cleanupScanResults.junk.files : null,
    duplicates:   document.getElementById('check-duplicates')?.checked   ? cleanupScanResults.duplicates.files : null,
    oldFiles:     document.getElementById('check-oldFiles')?.checked     ? (cleanupScanResults.oldFiles?.files || []) : null,
    emptyFolders: document.getElementById('check-emptyFolders')?.checked ? cleanupScanResults.emptyFolders.folders : null,
    dupApps:      dupAppsFiles,
  };

  const totalCount = [toDelete.installers, toDelete.junk, toDelete.duplicates, toDelete.oldFiles, toDelete.emptyFolders, toDelete.dupApps]
    .filter(Boolean).reduce((s, arr) => s + arr.length, 0);

  if (totalCount === 0) { showToast(tr('nothingSelected')); return; }
  if (!await showConfirm(tr('confirmDeleteItems').replace('{count}', totalCount))) return;

  const result = await window.api.runCleanup(toDelete);
  lastCleanupDeleted = result.deleted;

  document.getElementById('undoCleanupBtn').style.display = result.deleted.length ? 'flex' : 'none';
  showToast(tr('cleanedItems').replace('{count}', result.deleted.length));
  await scanCleanup();
}

async function undoCleanup() {
  if (!lastCleanupDeleted.length) return;
  const result = await window.api.restoreCleanup(lastCleanupDeleted);
  lastCleanupDeleted = [];
  document.getElementById('undoCleanupBtn').style.display = 'none';
  showToast(tr('restoredItems').replace('{count}', result.restored.length));
  await scanCleanup();
}

// ── Bookmarks ─────────────────────────────────────────────────────
let bookmarksList = [];

async function loadBookmarks() {
  bookmarksList = await window.api.getBookmarks();
}

function toggleBookmarkPanel(context) {
  const panel = document.getElementById(`bookmarkPanel-${context}`);
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    renderBookmarkPanel(context);
    panel.classList.remove('hidden');
  } else {
    panel.classList.add('hidden');
  }
}

function renderBookmarkPanel(context) {
  const panel = document.getElementById(`bookmarkPanel-${context}`);
  const currentFolderValue = getCurrentFolderForContext(context);

  let html = `
    <div class="bookmark-add-row">
      <button class="btn btn-green btn-sm" onclick="bookmarkCurrentFolder('${context}')">
        <i data-lucide="bookmark-plus"></i> ${tr('bookmarkCurrentFolder')}
      </button>
    </div>`;

  if (!bookmarksList.length) {
    html += `<div class="bookmark-empty">${tr('noBookmarks')}</div>`;
  } else {
    html += bookmarksList.map(b => `
      <div class="bookmark-item" onclick="useBookmark('${context}', '${b.path.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
        <i data-lucide="star" class="star-icon"></i>
        <span class="bookmark-name">${b.name}</span>
        <span class="bookmark-path" title="${b.path}">${b.path}</span>
        <button class="bookmark-remove" onclick="event.stopPropagation();removeBookmarkItem(${b.id}, '${context}')">
          <i data-lucide="x"></i>
        </button>
      </div>`).join('');
  }

  panel.innerHTML = html;
  lucide.createIcons();
}

function getCurrentFolderForContext(context) {
  if (context === 'organize')   return document.getElementById('folderInput').value;
  if (context === 'group')      return document.getElementById('groupFolderInput').value;
  if (context === 'duplicates') return document.getElementById('dupFolderInput').value;
  if (context === 'cleanup')    return document.getElementById('cleanupFolderInput').value;
  if (context === 'watcher')    return document.getElementById('watcherFolderInput').value;
  return '';
}

function useBookmark(context, folderPath) {
  if (context === 'organize')   setFolder(folderPath);
  if (context === 'group')      setGroupFolder(folderPath);
  if (context === 'duplicates') setDupFolder(folderPath);
  if (context === 'cleanup')    setCleanupFolder(folderPath);
  if (context === 'watcher')    document.getElementById('watcherFolderInput').value = folderPath;
  document.getElementById(`bookmarkPanel-${context}`).classList.add('hidden');
}

async function bookmarkCurrentFolder(context) {
  const folder = getCurrentFolderForContext(context);
  if (!folder) { showToast(tr('selectFolderFirst')); return; }

  bookmarksList = await window.api.addBookmark(folder);
  showToast(tr('bookmarkAdded'));
  renderBookmarkPanel(context);
}

async function removeBookmarkItem(id, context) {
  bookmarksList = await window.api.removeBookmark(id);
  renderBookmarkPanel(context);
  showToast(tr('bookmarkRemoved'));
}

// ── Recent Folders ────────────────────────────────────────────────
async function trackRecentFolder(folder) {
  if (!folder) return;
  await window.api.addRecentFolder(folder);
}

async function getRecentFoldersHTML(context) {
  const recent = await window.api.getRecentFolders();
  if (!recent.length) return '';
  return `
    <div class="recent-folders-row">
      <span class="recent-folders-label">${tr('recentLabel')}</span>
      ${recent.map(r => `
        <button class="recent-folder-chip" title="${r.path}" onclick="useRecentFolder('${context}', '${r.path.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
          ${r.name}
        </button>`).join('')}
    </div>`;
}

async function renderRecentFolders(context) {
  const containerId = `recentFolders-${context}`;
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = await getRecentFoldersHTML(context);
  lucide.createIcons();
}

function useRecentFolder(context, folderPath) {
  if (context === 'organize')   setFolder(folderPath);
  if (context === 'group')      setGroupFolder(folderPath);
  if (context === 'duplicates') setDupFolder(folderPath);
  if (context === 'cleanup')    setCleanupFolder(folderPath);
  if (context === 'watcher')    document.getElementById('watcherFolderInput').value = folderPath;
}

// ── Drag and Drop ─────────────────────────────────────────────────
function setupFolderDragDrop(rowSelector, onFolderDropped) {
  const row = document.querySelector(rowSelector);
  if (!row) return;

  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.add('drag-over');
  });

  row.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.remove('drag-over');
  });

  row.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (!files.length) return;

    const filePath = window.api.getDroppedFilePath(files[0]);
    if (!filePath) return;

    const folderPath = await window.api.getPathForFile(filePath);
    if (folderPath) onFolderDropped(folderPath);
  });
}

function initAllDragDrop() {
  setupFolderDragDrop('#page-organize .folder-row', setFolder);
  setupFolderDragDrop('#page-group .folder-row', setGroupFolder);
  setupFolderDragDrop('#page-duplicates .folder-row', setDupFolder);
  setupFolderDragDrop('#page-cleanup .folder-row', setCleanupFolder);
  setupFolderDragDrop('#page-watcher .folder-row', (folder) => {
    document.getElementById('watcherFolderInput').value = folder;
    trackRecentFolder(folder);
  });
}

// ── Updates ───────────────────────────────────────────────────────
let latestReleaseUrl = null;

async function initVersionDisplay() {
  try {
    const v = await window.api.getAppVersion();
    const txt = document.getElementById('aboutVersionText');
    if (txt) txt.textContent = `v${v}`;
    const hint = document.getElementById('aboutVersionHint');
    if (hint) hint.textContent = `v${v}`;
    const tbVersion = document.querySelector('.titlebar-version');
    if (tbVersion) tbVersion.textContent = `v${v}`;
  } catch (e) {}
}

// ── Settings accordion ───────────────────────────────────────────
const SETTINGS_ACCORDION_KEY = 'mojo-settings-accordion-state';

function getAccordionState() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_ACCORDION_KEY)) || {}; }
  catch (e) { return {}; }
}

function saveAccordionState(state) {
  try { localStorage.setItem(SETTINGS_ACCORDION_KEY, JSON.stringify(state)); }
  catch (e) {}
}

function toggleSettingsCard(name) {
  const card = document.getElementById(`settingsCard-${name}`);
  if (!card) return;
  const collapsed = card.classList.toggle('collapsed');
  const state = getAccordionState();
  state[name] = collapsed;
  saveAccordionState(state);
}

function restoreAccordionState() {
  const state = getAccordionState();
  for (const name of Object.keys(state)) {
    const card = document.getElementById(`settingsCard-${name}`);
    if (card) card.classList.toggle('collapsed', state[name]);
  }
}

async function checkForUpdates(fromBadge = false) {
  const btn = document.getElementById('checkUpdatesBtn');
  const msg = document.getElementById('updateStatusMsg');
  if (btn) btn.disabled = true;
  if (msg) { msg.className = 'status-msg'; msg.textContent = tr('checkingForUpdates'); }
  if (fromBadge) showToast(tr('checkingForUpdates'));

  const result = await window.api.checkForUpdates();
  if (btn) btn.disabled = false;

  if (!result.ok) {
    if (msg) { msg.className = 'status-msg err'; msg.textContent = tr('updateCheckFailed'); }
    if (fromBadge) showToast(tr('updateCheckFailed'));
    return;
  }
  if (result.updateAvailable) {
    latestReleaseUrl = result.releaseUrl;
    if (msg) { msg.className = 'status-msg ok'; msg.textContent = tr('updateAvailableMsg').replace('{version}', result.latestVersion); }
    showUpdateBanner(result);
    if (fromBadge) showToast(tr('updateAvailableMsg').replace('{version}', result.latestVersion));
  } else {
    if (msg) { msg.className = 'status-msg ok'; msg.textContent = tr('upToDate'); }
    if (fromBadge) showToast(tr('upToDate'));
  }
}

function showUpdateBanner(result) {
  if (!result?.updateAvailable) return;
  latestReleaseUrl = result.releaseUrl || '';
  updateFoundByAutoUpdater = false;
  const banner = document.getElementById('updateBanner');
  const text = document.getElementById('updateBannerText');
  const btn = document.getElementById('updateActionBtn');
  const version = result.latestVersion || '';
  if (text) text.textContent = tr('updateAvailableMsg').replace('{version}', version);
  if (btn) { btn.textContent = tr('viewRelease'); btn.disabled = false; }
  if (banner) banner.classList.remove('hidden');
}

function dismissUpdateBanner() {
  const banner = document.getElementById('updateBanner');
  if (banner) banner.classList.add('hidden');
}

function openReleasePage() {
  window.api.openReleasePage(latestReleaseUrl);
}

if (window.api.onUpdateAvailable) {
  window.api.onUpdateAvailable((result) => showUpdateBanner(result));
}

// ── Auto Updater UI ───────────────────────────────────────────────
let updateReady = false;
let updateFoundByAutoUpdater = false;

function handleUpdateAction() {
  if (updateReady) {
    window.api.installUpdate();
  } else if (updateFoundByAutoUpdater) {
    window.api.downloadUpdate().then(result => {
      if (!result?.ok) showToast(tr('updateCheckFailed'));
    });
  } else {
    window.api.openReleasePage(latestReleaseUrl);
  }
}

if (window.api.onUpdaterStatus) {
  window.api.onUpdaterStatus((data) => {
    const banner = document.getElementById('updateBanner');
    const text = document.getElementById('updateBannerText');
    const btn = document.getElementById('updateActionBtn');
    const wrap = document.getElementById('updateProgressWrap');
    const fill = document.getElementById('updateProgressFill');
    const label = document.getElementById('updateProgressLabel');

    if (data.status === 'available') {
      updateFoundByAutoUpdater = true;
      if (text) text.textContent = tr('updateAvailableMsg').replace('{version}', data.version);
      if (btn) { btn.textContent = tr('downloadUpdate'); btn.disabled = false; }
      if (banner) banner.classList.remove('hidden');
      updateReady = false;
    } else if (data.status === 'downloading') {
      if (wrap) wrap.classList.remove('hidden');
      if (fill) fill.style.width = data.percent + '%';
      if (label) label.textContent = data.percent + '%';
      if (btn) { btn.textContent = tr('downloading'); btn.disabled = true; }
      if (banner) banner.classList.remove('hidden');
    } else if (data.status === 'downloaded') {
      if (wrap) wrap.classList.add('hidden');
      if (text) text.textContent = tr('updateReadyMsg').replace('{version}', data.version);
      if (btn) { btn.textContent = tr('restartToUpdate'); btn.disabled = false; }
      if (banner) banner.classList.remove('hidden');
      updateReady = true;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function getCatIcon(cat) {
  const map = { Images:'image', Videos:'video', Audio:'music', Documents:'file-text', Archives:'archive', Code:'code', Installers:'package', Fonts:'type', Torrents:'download' };
  return map[cat] || 'folder';
}

// ── Onboarding ────────────────────────────────────────────────────
const OB_TOTAL = 7;
let obCurrent = 0;
let obTheme = 'dark';
let obLang = 'en';

async function initOnboarding() {
  const s = await window.api.getSettings();
  if (s.onboardingComplete) return;
  obTheme = s.theme || 'dark';
  obLang  = s.language || 'en';
  obRender();
  document.getElementById('obOverlay').classList.remove('hidden');
  lucide.createIcons();
}

function obRender() {
  const track = document.getElementById('obTrack');
  if (track) track.style.transform = `translateX(-${obCurrent * 480}px)`;

  document.querySelectorAll('.ob-dot').forEach((d, i) => {
    d.className = 'ob-dot' + (i === obCurrent ? ' active' : i < obCurrent ? ' done' : '');
  });

  const backBtn = document.getElementById('obBackBtn');
  const nextBtn = document.getElementById('obNextBtn');
  if (backBtn) backBtn.classList.toggle('hidden', obCurrent === 0);

  if (nextBtn) {
    if (obCurrent === OB_TOTAL - 1) {
      nextBtn.innerHTML = `<span>${tr('letsGo')}</span><i data-lucide="rocket"></i>`;
    } else {
      nextBtn.innerHTML = `<span>${tr('next')}</span><i data-lucide="arrow-right"></i>`;
    }
  }

  if (obCurrent === OB_TOTAL - 1) {
    document.querySelectorAll('.ob-theme-btn').forEach(b => b.classList.remove('ob-sel'));
    const activeTheme = document.getElementById(obTheme === 'dark' ? 'obDarkBtn' : 'obLightBtn');
    if (activeTheme) activeTheme.classList.add('ob-sel');
    document.querySelectorAll('.ob-lang-btn').forEach(b => {
      b.classList.toggle('ob-sel', b.dataset.lang === obLang);
    });
  }
  lucide.createIcons();
}

function obGo(dir) {
  if (dir === 1 && obCurrent === OB_TOTAL - 1) { obComplete(); return; }
  obCurrent = Math.max(0, Math.min(OB_TOTAL - 1, obCurrent + dir));
  obRender();
}

function obSkip() { obComplete(); }

function obSetTheme(t) {
  obTheme = t;
  setTheme(t);
  obRender();
}

function obSetLang(l) {
  obLang = l;
  changeLanguage(l);
  obRender();
}

async function obComplete() {
  const s = await window.api.getSettings();
  s.onboardingComplete = true;
  s.theme = obTheme;
  s.language = obLang;
  await window.api.saveSettings(s);
  const overlay = document.getElementById('obOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => overlay.classList.add('hidden'), 200);
  }
}

function obReopen() {
  obCurrent = 0;
  obRender();
  const overlay = document.getElementById('obOverlay');
  if (overlay) {
    overlay.style.opacity = '1';
    overlay.style.transition = '';
    overlay.classList.remove('hidden');
    lucide.createIcons();
  }
}

// ── Size Filter ───────────────────────────────────────────────────
async function loadSizeFilter() {
  const s = await window.api.getSettings();
  const minKB = s.sizeFilter?.minKB || 0;
  const maxKB = s.sizeFilter?.maxKB || 0;
  const minEl = document.getElementById('sizeFilterMin');
  const maxEl = document.getElementById('sizeFilterMax');
  const minUnit = document.getElementById('sizeFilterMinUnit');
  const maxUnit = document.getElementById('sizeFilterMaxUnit');
  if (minKB >= 1024 && minKB % 1024 === 0) {
    if (minEl) minEl.value = minKB / 1024;
    if (minUnit) minUnit.value = 'MB';
  } else {
    if (minEl) minEl.value = minKB;
    if (minUnit) minUnit.value = 'KB';
  }
  if (maxKB >= 1024 && maxKB % 1024 === 0) {
    if (maxEl) maxEl.value = maxKB / 1024;
    if (maxUnit) maxUnit.value = 'MB';
  } else {
    if (maxEl) maxEl.value = maxKB;
    if (maxUnit) maxUnit.value = 'KB';
  }
}

async function saveSizeFilter() {
  const minVal  = parseInt(document.getElementById('sizeFilterMin').value) || 0;
  const maxVal  = parseInt(document.getElementById('sizeFilterMax').value) || 0;
  const minUnit = document.getElementById('sizeFilterMinUnit').value;
  const maxUnit = document.getElementById('sizeFilterMaxUnit').value;
  const minKB = minUnit === 'MB' ? minVal * 1024 : minVal;
  const maxKB = maxUnit === 'MB' ? maxVal * 1024 : maxVal;
  const s = await window.api.getSettings();
  s.sizeFilter = { minKB, maxKB };
  await window.api.saveSettings(s);
}

// ── Ignore List ───────────────────────────────────────────────────
let ignoreList = { folders: [], extensions: [] };

async function loadIgnoreList() {
  ignoreList = await window.api.getIgnoreList();
  renderIgnoreChips();
}

function renderIgnoreChips() {
  const extEl    = document.getElementById('ignoreExtChips');
  const folderEl = document.getElementById('ignoreFolderChips');
  const hint     = document.getElementById('ignoreCountHint');
  if (!extEl || !folderEl) return;

  extEl.innerHTML = ignoreList.extensions.map((e, i) => `
    <span class="ignore-chip">
      <span>${e}</span>
      <button onclick="removeIgnoreExt(${i})"><i data-lucide="x"></i></button>
    </span>`).join('');

  folderEl.innerHTML = ignoreList.folders.map((f, i) => `
    <span class="ignore-chip">
      <span>${f}</span>
      <button onclick="removeIgnoreFolder(${i})"><i data-lucide="x"></i></button>
    </span>`).join('');

  const total = ignoreList.extensions.length + ignoreList.folders.length;
  if (hint) hint.textContent = `${total} rule${total !== 1 ? 's' : ''}`;
  lucide.createIcons();
}

async function addIgnoreExt() {
  const input = document.getElementById('newIgnoreExt');
  let val = input.value.trim().toLowerCase();
  if (!val) return;
  if (!val.startsWith('.')) val = '.' + val;
  if (ignoreList.extensions.includes(val)) { showToast(tr('alreadyExists')); return; }
  ignoreList.extensions.push(val);
  await window.api.saveIgnoreList(ignoreList);
  input.value = '';
  renderIgnoreChips();
}

async function removeIgnoreExt(i) {
  ignoreList.extensions.splice(i, 1);
  await window.api.saveIgnoreList(ignoreList);
  renderIgnoreChips();
}

async function addIgnoreFolder() {
  const input = document.getElementById('newIgnoreFolder');
  const val = input.value.trim();
  if (!val) return;
  if (ignoreList.folders.includes(val)) { showToast(tr('alreadyExists')); return; }
  ignoreList.folders.push(val);
  await window.api.saveIgnoreList(ignoreList);
  input.value = '';
  renderIgnoreChips();
}

async function removeIgnoreFolder(i) {
  ignoreList.folders.splice(i, 1);
  await window.api.saveIgnoreList(ignoreList);
  renderIgnoreChips();
}

async function resetIgnoreList() {
  if (!await showConfirm(tr('confirmResetIgnore'))) return;
  ignoreList = await window.api.resetIgnoreList();
  renderIgnoreChips();
}

// ── File Preview Tooltip ─────────────────────────────────────────
let _previewTimer   = null;
let _previewVisible = false;

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(ext) {
  const map = { '.mp4':' video', '.mkv':'video', '.avi':'video', '.mov':'video',
    '.mp3':'music', '.wav':'music', '.flac':'music', '.aac':'music',
    '.pdf':'file-text', '.doc':'file-text', '.docx':'file-text',
    '.zip':'archive', '.rar':'archive', '.7z':'archive',
    '.exe':'package', '.msi':'package',
    '.ttf':'type', '.otf':'type',
    '.torrent':'download' };
  return map[ext] || 'file';
}

function showFilePreview(filePath, mouseX, mouseY) {
  window.api.filePreview(filePath).then(result => {
    if (!result || result.type === 'missing' || result.type === 'error') return;
    const tooltip  = document.getElementById('filePreviewTooltip');
    const inner    = document.getElementById('filePreviewInner');

    if (result.type === 'image') {
      const safeSrc = result.src.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      inner.innerHTML = `<img src="${safeSrc}" alt="preview"/>`;
    } else if (result.type === 'text') {
      const escaped = result.lines.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      inner.innerHTML = `<div class="fpt-text">${escaped}</div>`;
    } else {
      const ext  = result.ext || '';
      const icon = getFileIcon(ext);
      inner.innerHTML = `
        <div class="fpt-info">
          <i data-lucide="${icon}"></i>
          <span class="fpt-ext">${ext || 'file'}</span>
          <span class="fpt-size">${formatBytes(result.size || 0)}</span>
        </div>`;
      lucide.createIcons({ nodes: [inner] });
    }

    positionPreviewTooltip(tooltip, mouseX, mouseY);
    tooltip.classList.remove('hidden');
    _previewVisible = true;
  });
}

function positionPreviewTooltip(tooltip, mx, my) {
  tooltip.style.left = '0px'; tooltip.style.top = '0px';
  tooltip.classList.remove('hidden');
  const tw = tooltip.offsetWidth  || 250;
  const th = tooltip.offsetHeight || 200;
  const vw = window.innerWidth, vh = window.innerHeight;
  const offset = 14;
  let x = mx + offset, y = my + offset;
  if (x + tw > vw - 8) x = mx - tw - offset;
  if (y + th > vh - 8) y = my - th - offset;
  tooltip.style.left = `${Math.max(8, x)}px`;
  tooltip.style.top  = `${Math.max(8, y)}px`;
}

function hideFilePreview() {
  clearTimeout(_previewTimer);
  _previewTimer = null;
  _previewVisible = false;
  document.getElementById('filePreviewTooltip').classList.add('hidden');
}

function attachFilePreview(el, filePath) {
  el.addEventListener('mouseenter', (e) => {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => showFilePreview(filePath, e.clientX, e.clientY), 400);
  });
  el.addEventListener('mousemove', (e) => {
    if (_previewVisible) {
      positionPreviewTooltip(document.getElementById('filePreviewTooltip'), e.clientX, e.clientY);
    }
  });
  el.addEventListener('mouseleave', () => hideFilePreview());
}

function attachPreviewsToHistory() {
  document.querySelectorAll('.file-chip-wrap[data-preview-path]').forEach(el => {
    attachFilePreview(el, el.dataset.previewPath);
  });
}

// ── Confirm Modal ─────────────────────────────────────────────────
let _confirmResolve = null;

function showConfirm(message) {
  return new Promise((resolve) => {
    _confirmResolve = resolve;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOverlay').classList.remove('hidden');
    lucide.createIcons();
  });
}

function resolveConfirm(result) {
  document.getElementById('confirmOverlay').classList.add('hidden');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Start ─────────────────────────────────────────────────────────
// ── Data Backup & Restore ─────────────────────────────────────────
async function exportAppData() {
  const result = await window.api.exportAppData();
  const msg = document.getElementById('dataBackupMsg');
  if (result.cancelled) return;
  if (result.ok) {
    if (msg) { msg.className = 'status-msg ok'; msg.textContent = `✓ ${tr('exportedTo')} ${result.path}`; }
    showToast('✓ ' + tr('settingsExported'));
  } else {
    if (msg) { msg.className = 'status-msg err'; msg.textContent = `✗ ${result.error}`; }
  }
}

async function importAppData() {
  const result = await window.api.importAppData();
  const msg = document.getElementById('dataBackupMsg');
  if (result.cancelled) return;
  if (result.ok) {
    if (msg) { msg.className = 'status-msg ok'; msg.textContent = `✓ ${tr('settingsImported')}`; }
    showToast('✓ ' + tr('settingsImported'));
    setTimeout(() => location.reload(), 1500);
  } else {
    if (msg) { msg.className = 'status-msg err'; msg.textContent = `✗ ${result.error}`; }
  }
}

// ── Rules Engine ──────────────────────────────────────────────────
const PRESET_RULES = [
  {
    id: 'preset-1', name: 'Delete old installers',
    desc: 'Installers older than 6 months → Recycle Bin',
    icon: 'package', color: 'rgba(224,85,85,0.1)', iconColor: '#e05555',
    conditions: [{ field: 'age', op: 'gt', value: 180, unit: 'days' }, { field: 'extension', op: 'eq', value: 'exe' }],
    logic: 'AND', action: { type: 'delete' }
  },
  {
    id: 'preset-2', name: 'Clean temp files',
    desc: '.tmp .log .cache .bak files → Recycle Bin',
    icon: 'trash-2', color: 'rgba(224,85,85,0.1)', iconColor: '#e05555',
    conditions: [{ field: 'extension', op: 'eq', value: 'tmp' }],
    logic: 'OR', action: { type: 'delete' }
  },
  {
    id: 'preset-3', name: 'Archive large videos',
    desc: 'Videos larger than 500MB → Videos folder',
    icon: 'video', color: 'rgba(55,138,221,0.1)', iconColor: '#378add',
    conditions: [{ field: 'size', op: 'gt', value: 500, unit: 'MB' }, { field: 'extension', op: 'eq', value: 'mp4' }],
    logic: 'AND', action: { type: 'move', dest: '' }
  },
  {
    id: 'preset-4', name: 'Organize old downloads',
    desc: 'Files older than 3 months → Archive folder',
    icon: 'archive', color: 'rgba(239,159,39,0.1)', iconColor: '#ef9f27',
    conditions: [{ field: 'age', op: 'gt', value: 90, unit: 'days' }],
    logic: 'AND', action: { type: 'move', dest: '' }
  },
  {
    id: 'preset-5', name: 'Remove old backup files',
    desc: 'Files with "backup" in name older than 30 days → Recycle Bin',
    icon: 'shield-off', color: 'rgba(127,119,221,0.1)', iconColor: '#7f77dd',
    conditions: [{ field: 'name', op: 'contains', value: 'backup' }, { field: 'age', op: 'gt', value: 30, unit: 'days' }],
    logic: 'AND', action: { type: 'delete' }
  },
  {
    id: 'preset-6', name: 'Archive old documents',
    desc: 'PDFs and Word files older than 1 year → Archive folder',
    icon: 'file-text', color: 'rgba(61,219,61,0.1)', iconColor: '#3ddb3d',
    conditions: [{ field: 'age', op: 'gt', value: 365, unit: 'days' }, { field: 'extension', op: 'eq', value: 'pdf' }],
    logic: 'AND', action: { type: 'move', dest: '' }
  },
];

let rulesData = [];
let editingRuleId = null;

async function loadRules() {
  rulesData = await window.api.getRules() || [];
  renderRulesList();
  renderPresetRules();
}

async function bulkToggleRules(enabled) {
  if (!rulesData.length) return;
  rulesData = rulesData.map(r => ({ ...r, enabled }));
  await window.api.saveRules(rulesData);
  renderRulesList();
  showToast(enabled ? 'All rules enabled' : 'All rules disabled');
}

async function exportRules() {
  const result = await window.api.exportRules();
  if (result.cancelled) return;
  if (result.ok) showToast(`✓ ${tr('rulesExported')}`);
  else showToast(`✗ ${result.error}`);
}

async function importRules() {
  const result = await window.api.importRules();
  if (result.cancelled) return;
  if (result.ok) {
    showToast(`✓ ${result.added} ${tr('rulesImported')}`);
    await loadRules();
  } else {
    showToast(`✗ ${result.error}`);
  }
}

function renderPresetRules() {
  const list = document.getElementById('presetRulesList');
  if (!list) return;
  const activePresetIds = rulesData.filter(r => r.presetId).map(r => r.presetId);

  list.innerHTML = PRESET_RULES.map(p => {
    const isAdded = activePresetIds.includes(p.id);
    return `<div class="preset-rule-row">
      <div class="preset-rule-icon" style="background:${p.color}">
        <i data-lucide="${p.icon}" style="color:${p.iconColor}"></i>
      </div>
      <div class="preset-rule-body">
        <div class="preset-rule-name">${p.name}</div>
        <div class="preset-rule-desc">${p.desc}</div>
      </div>
      ${isAdded
        ? `<button class="btn btn-outline btn-sm" style="color:var(--text-dim)" onclick="removePresetRule('${p.id}')">Remove</button>`
        : `<button class="btn btn-outline btn-sm" onclick="addPresetRule('${p.id}')"><i data-lucide="plus"></i> Add</button>`
      }
    </div>`;
  }).join('');
  lucide.createIcons();
}

async function addPresetRule(presetId) {
  const preset = PRESET_RULES.find(p => p.id === presetId);
  if (!preset) return;

  // If preset needs a folder (move action), ask for it
  if (preset.action.type === 'move') {
    const folder = await window.api.pickFolder();
    if (!folder) return;
    preset.action.dest = folder;
  }

  rulesData.push({
    id: Date.now(), presetId, name: preset.name,
    conditions: preset.conditions, logic: preset.logic,
    action: { ...preset.action }, enabled: true
  });
  await window.api.saveRules(rulesData);
  renderRulesList();
  renderPresetRules();
  showToast(`✓ Rule "${preset.name}" added`);
}

async function removePresetRule(presetId) {
  rulesData = rulesData.filter(r => r.presetId !== presetId);
  await window.api.saveRules(rulesData);
  renderRulesList();
  renderPresetRules();
}

function renderRulesList() {
  const list = document.getElementById('rulesList');
  const empty = document.getElementById('rulesEmpty');
  const count = document.getElementById('rulesCount');
  const searchWrap = document.getElementById('rulesSearchWrap');
  if (!list) return;
  if (count) count.textContent = rulesData.length || '';
  if (!rulesData.length) {
    list.innerHTML = '';
    empty?.classList.remove('hidden');
    searchWrap?.classList.add('hidden');
    return;
  }
  empty?.classList.add('hidden');
  if (searchWrap) searchWrap.classList.toggle('hidden', rulesData.length < 4);
  filterRulesList();
}

function filterRulesList() {
  const list = document.getElementById('rulesList');
  if (!list) return;
  const q = (document.getElementById('rulesSearch')?.value || '').toLowerCase().trim();
  const filtered = q ? rulesData.filter(r => r.name?.toLowerCase().includes(q)) : rulesData;
  if (!filtered.length && q) {
    list.innerHTML = `<div style="color:var(--text-dim);font-size:11px;padding:8px 0">No rules match "${sanitize(q)}"</div>`;
    return;
  }
  list.innerHTML = filtered.map((r) => {
    const realIdx = rulesData.indexOf(r);
    return `<div class="rule-card ${r.enabled ? '' : 'disabled'}" draggable="true" data-idx="${realIdx}">
      <div class="rule-drag-handle"><i data-lucide="grip-vertical"></i></div>
      <div class="rule-card-body">
        <div class="rule-card-name">${sanitize(r.name)}</div>
        <div class="rule-card-summary">${summarizeRule(r)}</div>
      </div>
      <div class="rule-card-actions">
        <button class="setting-toggle ${r.enabled ? 'on' : ''}" onclick="toggleRule(${realIdx})" style="width:32px;height:18px"></button>
        <button class="btn btn-outline btn-sm" onclick="openRuleEditor(${realIdx})"><i data-lucide="pencil"></i></button>
        <button class="btn btn-outline btn-sm" onclick="deleteRule(${realIdx})" style="color:var(--danger)"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
  initRulesDrag();
}

function initRulesDrag() {
  const list = document.getElementById('rulesList');
  if (!list) return;
  let dragIdx = null;

  list.querySelectorAll('.rule-card').forEach(card => {
    card.addEventListener('dragstart', () => {
      dragIdx = parseInt(card.dataset.idx);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      list.querySelectorAll('.rule-card').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      list.querySelectorAll('.rule-card').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });
    card.addEventListener('drop', async e => {
      e.preventDefault();
      const dropIdx = parseInt(card.dataset.idx);
      if (dragIdx === null || dragIdx === dropIdx) return;
      const moved = rulesData.splice(dragIdx, 1)[0];
      rulesData.splice(dropIdx, 0, moved);
      await window.api.saveRules(rulesData);
      renderRulesList();
    });
  });
}

function summarizeRule(r) {
  const conds = (r.conditions || []).map(c => summarizeCondition(c)).join(` <b>${r.logic || 'AND'}</b> `);
  const action = r.action?.type === 'move' ? `→ Move to ${sanitize(r.action.dest || '?')}`
               : r.action?.type === 'delete' ? '→ Delete'
               : '→ Rename';
  return `IF ${conds} ${action}`;
}

function summarizeCondition(c) {
  const opMap = { gt: '>', lt: '<', contains: 'contains', starts: 'starts with', ends: 'ends with', not_contains: 'does not contain', eq: 'is' };
  const unit = c.unit || '';
  return `${c.field} ${opMap[c.op] || c.op} ${c.value} ${unit}`.trim();
}

async function toggleRule(idx) {
  rulesData[idx].enabled = !rulesData[idx].enabled;
  await window.api.saveRules(rulesData);
  renderRulesList();
}

async function deleteRule(idx) {
  if (!await showConfirm(`Delete rule "${rulesData[idx].name}"?`)) return;
  rulesData.splice(idx, 1);
  await window.api.saveRules(rulesData);
  renderRulesList();
}

function openRuleEditor(idx = null) {
  editingRuleId = idx;
  const title = document.getElementById('ruleEditorTitle');
  if (title) title.textContent = idx !== null ? 'Edit Rule' : 'Add Rule';

  const rule = idx !== null ? rulesData[idx] : { name: '', conditions: [], logic: 'AND', action: { type: 'move', dest: '' }, enabled: true };

  document.getElementById('ruleNameInput').value = rule.name || '';
  document.getElementById('ruleLogic').value = rule.logic || 'AND';
  document.getElementById('ruleActionType').value = rule.action?.type || 'move';

  renderRuleConditions(rule.conditions || []);
  updateActionUI(rule.action);
  document.getElementById('ruleEditorModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeRuleEditor() {
  document.getElementById('ruleEditorModal').classList.add('hidden');
  editingRuleId = null;
}

function renderRuleConditions(conditions) {
  const wrap = document.getElementById('ruleConditions');
  if (!wrap) return;
  wrap.innerHTML = conditions.map((c, i) => `
    <div class="rule-condition-row" id="cond-${i}">
      <select class="rule-select" id="cond-field-${i}" onchange="updateConditionUI(${i})">
        <option value="name" ${c.field==='name'?'selected':''}>Name</option>
        <option value="extension" ${c.field==='extension'?'selected':''}>Extension</option>
        <option value="age" ${c.field==='age'?'selected':''}>Age</option>
        <option value="size" ${c.field==='size'?'selected':''}>Size</option>
      </select>
      ${getConditionOpUI(c)}
      <button class="batch-folder-remove" onclick="removeCondition(${i})"><i data-lucide="x"></i></button>
    </div>`).join('');
  lucide.createIcons();
}

function getConditionOpUI(c) {
  if (c.field === 'name') return `
    <select class="rule-select" id="cond-op-${c._i??0}" style="width:120px">
      <option value="contains" ${c.op==='contains'?'selected':''}>contains</option>
      <option value="not_contains" ${c.op==='not_contains'?'selected':''}>does not contain</option>
      <option value="starts" ${c.op==='starts'?'selected':''}>starts with</option>
      <option value="ends" ${c.op==='ends'?'selected':''}>ends with</option>
    </select>
    <input class="rule-input" id="cond-val-${c._i??0}" value="${sanitize(c.value||'')}" placeholder="text" style="flex:1"/>`;
  if (c.field === 'extension') return `
    <input class="rule-input" id="cond-val-${c._i??0}" value="${sanitize(c.value||'')}" placeholder=".exe" style="flex:1"/>`;
  if (c.field === 'age') return `
    <select class="rule-select" id="cond-op-${c._i??0}">
      <option value="gt" ${c.op==='gt'?'selected':''}>older than</option>
      <option value="lt" ${c.op==='lt'?'selected':''}>newer than</option>
    </select>
    <input class="rule-input" id="cond-val-${c._i??0}" value="${c.value||30}" type="number" min="1" style="width:60px"/>
    <select class="rule-select" id="cond-unit-${c._i??0}">
      <option value="days" ${c.unit==='days'?'selected':''}>days</option>
      <option value="months" ${c.unit==='months'?'selected':''}>months</option>
    </select>`;
  if (c.field === 'size') return `
    <select class="rule-select" id="cond-op-${c._i??0}">
      <option value="gt" ${c.op==='gt'?'selected':''}>larger than</option>
      <option value="lt" ${c.op==='lt'?'selected':''}>smaller than</option>
    </select>
    <input class="rule-input" id="cond-val-${c._i??0}" value="${c.value||100}" type="number" min="1" style="width:60px"/>
    <select class="rule-select" id="cond-unit-${c._i??0}">
      <option value="KB" ${c.unit==='KB'?'selected':''}>KB</option>
      <option value="MB" ${c.unit==='MB'?'selected':''}>MB</option>
      <option value="GB" ${c.unit==='GB'?'selected':''}>GB</option>
    </select>`;
  return '';
}

function addRuleCondition() {
  const conds = getConditionsFromUI();
  conds.push({ field: 'name', op: 'contains', value: '' });
  renderRuleConditions(conds.map((c, i) => ({ ...c, _i: i })));
}

function removeCondition(idx) {
  const conds = getConditionsFromUI();
  conds.splice(idx, 1);
  renderRuleConditions(conds.map((c, i) => ({ ...c, _i: i })));
}

function updateConditionUI(idx) {
  const conds = getConditionsFromUI();
  conds[idx].field = document.getElementById(`cond-field-${idx}`)?.value || 'name';
  conds[idx].op = 'contains'; conds[idx].value = ''; conds[idx].unit = '';
  renderRuleConditions(conds.map((c, i) => ({ ...c, _i: i })));
}

function getConditionsFromUI() {
  const rows = document.querySelectorAll('#ruleConditions .rule-condition-row');
  return Array.from(rows).map((_, i) => ({
    field: document.getElementById(`cond-field-${i}`)?.value || 'name',
    op: document.getElementById(`cond-op-${i}`)?.value || 'contains',
    value: document.getElementById(`cond-val-${i}`)?.value || '',
    unit: document.getElementById(`cond-unit-${i}`)?.value || ''
  }));
}

function updateActionUI(action = null) {
  const type = action?.type || document.getElementById('ruleActionType')?.value || 'move';
  const extra = document.getElementById('ruleActionExtra');
  if (!extra) return;
  if (type === 'move') {
    extra.innerHTML = `<input class="rule-input" id="ruleActionDest" placeholder="Destination folder..." value="${sanitize(action?.dest||'')}" style="flex:1"/>
      <button class="btn btn-outline btn-sm" onclick="pickRuleActionDest()"><i data-lucide="folder-open"></i></button>`;
  } else if (type === 'rename') {
    extra.innerHTML = `<div style="font-size:11px;color:var(--text-dim)">Uses current Rename Rules from Settings</div>`;
  } else {
    extra.innerHTML = `<div style="font-size:11px;color:var(--danger)">Files will be moved to Recycle Bin</div>`;
  }
  lucide.createIcons();
}

async function pickRuleActionDest() {
  const folder = await window.api.pickFolder();
  if (folder) { const el = document.getElementById('ruleActionDest'); if (el) el.value = folder; }
}

async function saveRule() {
  const name = document.getElementById('ruleNameInput')?.value?.trim();
  if (!name) { showToast('Enter a rule name'); return; }
  const conditions = getConditionsFromUI();
  if (!conditions.length) { showToast('Add at least one condition'); return; }
  const actionType = document.getElementById('ruleActionType')?.value || 'move';
  const action = { type: actionType };
  if (actionType === 'move') action.dest = document.getElementById('ruleActionDest')?.value?.trim();
  const logic = document.getElementById('ruleLogic')?.value || 'AND';
  const rule = { id: Date.now(), name, conditions, logic, action, enabled: true };

  if (editingRuleId !== null) {
    rule.id = rulesData[editingRuleId].id;
    rulesData[editingRuleId] = rule;
  } else {
    rulesData.push(rule);
  }
  await window.api.saveRules(rulesData);
  renderRulesList();
  closeRuleEditor();
  showToast(`✓ Rule "${name}" saved`);
}

async function pickRulesFolder() {
  const folder = await window.api.pickFolder();
  if (folder) { const el = document.getElementById('rulesFolder'); if (el) el.value = folder; }
}

async function previewRules() {
  const folder = document.getElementById('rulesFolder')?.value;
  if (!folder) { showToast(tr('selectFolderFirst') || 'Select a folder first'); return; }
  const activeRules = rulesData.filter(r => r.enabled);
  if (!activeRules.length) { showToast('No active rules'); return; }

  const statusEl = document.getElementById('rulesRunStatus');
  const previewEl = document.getElementById('rulesPreviewResults');
  const runBtn = document.getElementById('runRulesBtn');
  const previewBtn = document.getElementById('previewRulesBtn');
  if (runBtn) runBtn.disabled = true;
  if (previewBtn) previewBtn.disabled = true;
  if (statusEl) statusEl.innerHTML = '<span class="rules-running-indicator"></span> Previewing...';

  const result = await window.api.previewRules({ folderPath: folder, rules: activeRules });

  if (runBtn) runBtn.disabled = false;
  if (previewBtn) previewBtn.disabled = false;

  if (!result.ok) {
    if (statusEl) statusEl.textContent = '✗ Error';
    if (previewEl) { previewEl.classList.remove('hidden'); previewEl.innerHTML = `<div style="color:var(--danger);font-size:11px;padding:8px 0">${result.error}</div>`; }
    return;
  }

  if (statusEl) statusEl.textContent = `${tr('rulesPreviewTitle')}: ${result.results.length} files`;

  const overlapping = result.results.filter(r => r.overlaps?.length);

  if (previewEl) {
    if (!result.results.length) {
      previewEl.classList.remove('hidden');
      previewEl.innerHTML = `<div style="color:var(--text-dim);font-size:11px;padding:8px 0">${tr('noRulesMatched')}</div>`;
    } else {
      const overlapWarning = overlapping.length
        ? `<div style="color:#fbbf24;font-size:11px;padding:6px 8px;background:rgba(251,191,36,0.08);border:0.5px solid rgba(251,191,36,0.2);border-radius:6px;margin-bottom:8px">
            ⚠ ${overlapping.length} file${overlapping.length === 1 ? '' : 's'} matched multiple rules. Only the first matching rule will be applied.
           </div>` : '';
      previewEl.classList.remove('hidden');
      previewEl.innerHTML = overlapWarning + `<div style="margin-top:2px">${result.results.map(r => `
        <div class="rule-result-row matched">
          <span style="flex:1">${sanitize(r.file)}</span>
          <span class="rule-result-action">${r.action === 'move' ? `→ ${sanitize(r.dest||'')}` : r.action === 'delete' ? '🗑 delete' : `rename to ${sanitize(r.newName||r.file)}`}</span>
          <span style="font-size:10px;color:var(--text-dim)">${sanitize(r.rule)}</span>
          <span style="font-size:10px;font-weight:600;color:var(--accent);margin-left:4px">PREVIEW</span>
          ${r.overlaps?.length ? `<span style="font-size:10px;color:#fbbf24;margin-left:4px" title="Also matched: ${r.overlaps.map(o => sanitize(o)).join(', ')}">⚠</span>` : ''}
        </div>`).join('')}</div>`;
    }
  }
}

async function runRules() {
  document.getElementById('rulesPreviewResults')?.classList.add('hidden');
  const folder = document.getElementById('rulesFolder')?.value;
  if (!folder) { showToast(tr('selectFolderFirst') || 'Select a folder first'); return; }
  const activeRules = rulesData.filter(r => r.enabled);
  if (!activeRules.length) { showToast('No active rules'); return; }

  const statusEl = document.getElementById('rulesRunStatus');
  const runBtn = document.getElementById('runRulesBtn');
  const previewBtn = document.getElementById('previewRulesBtn');
  if (runBtn) runBtn.disabled = true;
  if (previewBtn) previewBtn.disabled = true;
  if (statusEl) statusEl.innerHTML = '<span class="rules-running-indicator"></span> Running...';

  const result = await window.api.runRules({ folderPath: folder, rules: activeRules });

  if (runBtn) runBtn.disabled = false;
  if (previewBtn) previewBtn.disabled = false;

  const resultsEl = document.getElementById('rulesRunResults');

  if (!result.ok) {
    if (statusEl) statusEl.textContent = '✗ Error';
    if (resultsEl) resultsEl.innerHTML = `<div style="color:var(--danger);font-size:11px;padding:8px 0">${result.error}</div>`;
    document.getElementById('rulesRecycleBinCard')?.classList.add('hidden');
    document.getElementById('rulesRunSummary')?.classList.add('hidden');
    document.getElementById('rulesUndoRow')?.classList.add('hidden');
    lastRulesMoves = [];
    return;
  }

  const matched = result.results.filter(r => r.ok);
  if (statusEl) statusEl.textContent = `✓ ${matched.length} files processed`;

  const summaryEl = document.getElementById('rulesRunSummary');
  if (summaryEl) {
    const counts = matched.reduce((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {});
    const parts = [];
    if (counts.move)   parts.push(`<span class="rules-summary-item move"><span class="rules-summary-count">${counts.move}</span> ${tr('runRulesSummaryMoved')}</span>`);
    if (counts.delete) parts.push(`<span class="rules-summary-item del"><span class="rules-summary-count">${counts.delete}</span> ${tr('runRulesSummaryDeleted')}</span>`);
    if (counts.rename) parts.push(`<span class="rules-summary-item rename"><span class="rules-summary-count">${counts.rename}</span> ${tr('runRulesSummaryRenamed')}</span>`);
    if (parts.length) {
      summaryEl.innerHTML = parts.join('');
      summaryEl.classList.remove('hidden');
    } else {
      summaryEl.classList.add('hidden');
    }
  }

  if (resultsEl) {
    const overlapping = result.results.filter(r => r.overlaps?.length);
    const overlapWarning = overlapping.length
      ? `<div style="color:#fbbf24;font-size:11px;padding:6px 8px;background:rgba(251,191,36,0.08);border:0.5px solid rgba(251,191,36,0.2);border-radius:6px;margin-bottom:8px">
          ⚠ ${overlapping.length} file${overlapping.length === 1 ? '' : 's'} matched multiple rules. Only the first matching rule was applied.
         </div>` : '';
    if (!result.results.length) {
      resultsEl.innerHTML = `<div style="color:var(--text-dim);font-size:11px;padding:8px 0">No files matched any rules</div>`;
    } else {
      resultsEl.innerHTML = overlapWarning + `<div style="margin-top:10px">${result.results.map(r => `
        <div class="rule-result-row ${r.ok ? 'matched' : ''}">
          <span style="flex:1">${sanitize(r.file)}</span>
          <span class="rule-result-action ${r.action==='delete'?'del':''}">${r.action === 'move' ? `→ ${sanitize(r.dest||'')}` : r.action === 'delete' ? '🗑 deleted' : `renamed to ${sanitize(r.newName||'')}`}</span>
          <span style="font-size:10px;color:var(--text-dim)">${sanitize(r.rule)}</span>
          ${r.overlaps?.length ? `<span style="font-size:10px;color:#fbbf24;margin-left:4px" title="Also matched: ${r.overlaps.map(o => sanitize(o)).join(', ')}">⚠</span>` : ''}
        </div>`).join('')}</div>`;
    }
  }

  const rulesBinCard = document.getElementById('rulesRecycleBinCard');
  const hadDeletions = result.results.some(r => r.ok && r.action === 'delete');
  if (rulesBinCard) {
    if (hadDeletions) {
      rulesBinCard.classList.remove('hidden');
      initRecycleBin('rules');
    } else {
      rulesBinCard.classList.add('hidden');
    }
  }

  lastRulesMoves = result.results
    .filter(r => r.ok && (r.action === 'move' || r.action === 'rename') && r.from && r.to)
    .map(r => ({ name: r.file, from: r.from, to: r.to }));
  const undoRow = document.getElementById('rulesUndoRow');
  if (undoRow) undoRow.classList.toggle('hidden', lastRulesMoves.length === 0);

  if (matched.length) await loadHistory();
}

async function undoRulesRun() {
  if (!lastRulesMoves.length) { showToast(tr('nothingToUndo')); return; }
  const r = await window.api.undo(lastRulesMoves);
  lastRulesMoves = [];
  document.getElementById('rulesUndoRow')?.classList.add('hidden');
  showToast(tr('restoredFiles').replace('{count}', r.restored.length));
}

async function undoSingleRulesFile(from, to, sessionId) {
  const r = await window.api.undo([{ from: to, to: from, name: from.split('\\').pop() }]);
  if (r?.restored?.length) {
    showToast(tr('restoredFiles').replace('{count}', 1));
    await loadHistory();
  } else {
    showToast(`✗ ${tr('filesNotFound')}`);
  }
}

document.addEventListener('DOMContentLoaded', init);