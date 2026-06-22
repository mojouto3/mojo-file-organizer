'use strict';

let lang = 'en';
let appSettings = {};
let categories = [];
let groups = [];
let lastMoves = [];
let lastGroupMoves = [];
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
  document.getElementById(`page-${name}`).classList.remove('hidden');
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'history')  loadHistory();
  if (name === 'stats')    loadStats();
  if (name === 'settings') renderSettings();
  if (name === 'watcher')  initWatcher();
  if (name === 'cleanup') {}
  if (['organize','group','duplicates','cleanup','watcher'].includes(name)) {
    const ctxMap = { organize: 'organize', group: 'group', duplicates: 'duplicates', cleanup: 'cleanup', watcher: 'watcher' };
    renderRecentFolders(ctxMap[name]);
  }
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
  if (!files.length) { showToast(lang === 'en' ? 'No sortable files found!' : 'Δεν βρέθηκαν αρχεία!'); return; }

  const grouped = {};
  for (const f of files) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f.name);
  }

  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  for (const [cat, names] of Object.entries(grouped)) {
    const icon = getCatIcon(cat);
    const preview = names.slice(0, 3).map(n => `<div class="cat-card-file">${n}</div>`).join('');
    const more = names.length > 3 ? `<div class="cat-card-file" style="color:#444">+${names.length - 3} more</div>` : '';
    grid.innerHTML += `<div class="cat-card">
      <div class="cat-card-name"><i data-lucide="${icon}"></i>${cat}</div>
      <div class="cat-card-count">${names.length}</div>
      <div class="cat-card-label">file${names.length !== 1 ? 's' : ''}</div>
      <div class="cat-card-files">${preview}${more}</div>
    </div>`;
  }
  lucide.createIcons();
  document.getElementById('previewCount').textContent = `${files.length} files`;
  document.getElementById('previewCard').classList.remove('hidden');
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
  document.getElementById('resultsCard').classList.remove('hidden');
  btn.disabled = false;
  if (result.errors.length) showToast(`${result.errors.length} error(s)`);
}

async function undo() {
  if (!lastMoves.length) { showToast(lang === 'en' ? 'Nothing to undo!' : 'Τίποτα για αναίρεση!'); return; }
  const r = await window.api.undo(lastMoves);
  lastMoves = [];
  showToast(lang === 'en' ? `Restored ${r.restored.length} file(s)` : `Επαναφορά ${r.restored.length} αρχείων`);
  resetOrganize();
}

function resetOrganize() {
  currentFolder = null; lastMoves = [];
  document.getElementById('folderInput').value = '';
  document.getElementById('previewCard').classList.add('hidden');
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

async function addGroup() {
  const input = document.getElementById('groupNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (groups.find(g => g.name.toLowerCase() === name.toLowerCase())) { showToast(lang === 'en' ? 'Already exists!' : 'Υπάρχει ήδη!'); return; }
  groups.push({ name });
  await window.api.saveGroups(groups);
  renderGroupChips();
  input.value = '';
  showToast(lang === 'en' ? `"${name}" added` : `Προστέθηκε το "${name}"`);
}

async function removeGroup(i) {
  const name = groups[i].name;
  groups.splice(i, 1);
  await window.api.saveGroups(groups);
  renderGroupChips();
  showToast(lang === 'en' ? `"${name}" removed` : 'Αφαιρέθηκε');
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
  if (!groups.length) { showToast(lang === 'en' ? 'Add at least one group first!' : 'Προσθέστε μια ομάδα πρώτα!'); return; }
  const files = await window.api.previewGroups(folder);
  if (!files.length) { showToast(lang === 'en' ? 'No matching files found!' : 'Δεν βρέθηκαν αρχεία!'); return; }

  const list = document.getElementById('groupPreviewList');
  list.innerHTML = files.map(f => `
    <div class="match-item">
      <span class="match-filename" title="${f.name}">${f.name}</span>
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
  if (!lastGroupMoves.length) { showToast(lang === 'en' ? 'Nothing to undo!' : 'Τίποτα για αναίρεση!'); return; }
  const r = await window.api.undo(lastGroupMoves);
  lastGroupMoves = [];
  showToast(lang === 'en' ? `Restored ${r.restored.length} file(s)` : `Επαναφορά ${r.restored.length} αρχείων`);
  resetGroup();
}

function resetGroup() {
  currentGroupFolder = null; lastGroupMoves = [];
  document.getElementById('groupFolderInput').value = '';
  document.getElementById('groupPreviewCard').classList.add('hidden');
  document.getElementById('groupResultsCard').classList.add('hidden');
}

// ── History ───────────────────────────────────────────────────────
async function loadHistory() {
  const sessions = await window.api.getLog();
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
    for (const f of s.moved) {
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
            <span class="file-chip" title="${f.name}">${f.name}</span>
            ${f.to ? `
            <button class="file-chip-action" title="${lang === 'en' ? 'Open location' : 'Άνοιγμα τοποθεσίας'}" onclick="openFileLocation('${f.to.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
              <i data-lucide="folder-open"></i>
            </button>
            <button class="file-chip-action file-chip-undo" title="${lang === 'en' ? 'Undo this file' : 'Αναίρεση αρχείου'}" onclick="undoSingleFile(${s.id}, '${f.name.replace(/'/g,"\\'")}', '${(f.from||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}', '${f.to.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
              <i data-lucide="undo-2"></i>
            </button>` : ''}
          </span>`).join('')}</div>
      </div>`).join('');

    const el = document.createElement('div');
    el.className = 'session';
    el.innerHTML = `
      <div class="session-header" onclick="toggleSession(this)">
        <div class="session-date">${dateStr} ${timeStr}</div>
        <div class="session-folder" title="${s.folder}">${s.folder}</div>
        <span class="session-type">${s.type === 'smart-group' ? 'Smart Group' : s.type === 'watcher' ? 'Watcher' : 'Organize'}</span>
        <span class="session-badge">${s.total} moved</span>
        <button class="session-open-folder" title="${lang === 'en' ? 'Open folder' : 'Άνοιγμα φακέλου'}" onclick="event.stopPropagation();openSessionFolder('${s.folder.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">
          <i data-lucide="folder-open"></i>
        </button>
        <button class="session-del" onclick="deleteSession(event,${s.id})"><i data-lucide="x"></i></button>
        <span class="session-chevron"><i data-lucide="chevron-down"></i></span>
      </div>
      <div class="session-body">${groupsHTML}</div>`;
    list.appendChild(el);
  }
  lucide.createIcons();
  attachPreviewsToHistory();
}

async function openSessionFolder(folder) {
  await window.api.openFolder(folder);
}

async function openFileLocation(filePath) {
  await window.api.openFileLocation(filePath);
}

async function undoSingleFile(sessionId, fileName, from, to) {
  if (!from) { showToast(lang === 'en' ? 'Cannot undo this file' : 'Δεν μπορεί να αναιρεθεί'); return; }
  const result = await window.api.undoSingleFile({ sessionId, fileName, from, to });
  if (result.ok) {
    showToast(lang === 'en' ? 'File restored' : 'Το αρχείο επαναφέρθηκε');
    loadHistory();
  } else {
    showToast(lang === 'en' ? 'Failed to undo file' : 'Αποτυχία αναίρεσης');
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
    showToast(lang === 'en' ? `Moved to ${newCategory}` : `Μετακινήθηκε στο ${newCategory}`);
    loadHistory();
  } else {
    showToast(lang === 'en' ? 'Failed to move file' : 'Αποτυχία μετακίνησης');
  }
}

function toggleSession(header) { header.closest('.session').classList.toggle('open'); }

async function deleteSession(e, id) {
  e.stopPropagation();
  await window.api.deleteSession(id);
  loadHistory();
  showToast(lang === 'en' ? 'Session deleted' : 'Διαγράφηκε');
}

async function clearLog() {
  if (!await showConfirm(tr('confirmClearHistory'))) return;
  await window.api.clearLog();
  loadHistory();
  showToast(lang === 'en' ? 'History cleared' : 'Καθαρίστηκε');
}

// ── Stats ─────────────────────────────────────────────────────────
async function loadStats() {
  const stats = await window.api.getStats();
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-num">${stats.totalFiles.toLocaleString()}</div><div class="stat-label">Total Files Organized</div></div>
    <div class="stat-card"><div class="stat-num">${stats.totalSessions}</div><div class="stat-label">Sessions</div></div>
    <div class="stat-card"><div class="stat-num">${Object.keys(stats.byCategory).length}</div><div class="stat-label">Categories Used</div></div>`;

  const chart = document.getElementById('chartWrap');
  chart.innerHTML = '';
  const sorted = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  for (const [cat, count] of sorted) {
    chart.innerHTML += `<div class="chart-row">
      <div class="chart-label">${cat}</div>
      <div class="chart-track"><div class="chart-fill" style="width:${Math.round((count/max)*100)}%"></div></div>
      <div class="chart-count">${count}</div>
    </div>`;
  }
  if (!sorted.length) chart.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:20px 0;text-align:center">No data yet</div>`;
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
    ? (lang === 'en' ? 'Enabled' : 'Ενεργοποιήθηκε')
    : (lang === 'en' ? 'Disabled' : 'Απενεργοποιήθηκε'));
}

async function pickDefaultFolder() {
  const f = await window.api.pickFolder();
  if (f) {
    document.getElementById('settingDefaultFolder').value = f;
    await saveSetting('defaultFolder', f);
    showToast(lang === 'en' ? 'Default folder set' : 'Ορίστηκε ο προεπιλεγμένος φάκελος');
  }
}

async function clearDefaultFolder() {
  document.getElementById('settingDefaultFolder').value = '';
  await saveSetting('defaultFolder', '');
  showToast(lang === 'en' ? 'Default folder cleared' : 'Αφαιρέθηκε');
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

  if (!days.length) { showToast(lang === 'en' ? 'Select at least one day!' : 'Επιλέξτε τουλάχιστον μία μέρα!'); return; }
  if (!folder) { showToast(lang === 'en' ? 'Select a folder first!' : 'Επιλέξτε φάκελο πρώτα!'); return; }

  appSettings.schedule = { ...appSettings.schedule, enabled: true, days, time, folder };
  await window.api.saveSettings(appSettings);

  const result = await window.api.schedule({ days, time, folder });
  const el = document.getElementById('scheduleMsg');
  el.className = result.ok ? 'status-msg ok' : 'status-msg err';
  el.textContent = result.ok
    ? (lang === 'en' ? `✓ Scheduled — ${days.join(', ')} at ${time}` : `✓ Ενεργοποιήθηκε — ${days.join(', ')} στις ${time}`)
    : (lang === 'en' ? '✗ Failed — try running as Administrator' : '✗ Αποτυχία — δοκιμάστε ως Διαχειριστής');
}

async function disableSchedule() {
  await window.api.unschedule();
  if (appSettings.schedule) appSettings.schedule.enabled = false;
  await window.api.saveSettings(appSettings);
  const el = document.getElementById('scheduleMsg');
  el.className = 'status-msg ok';
  el.textContent = lang === 'en' ? '✓ Auto-run disabled' : '✓ Απενεργοποιήθηκε';
}

// ── Categories settings ───────────────────────────────────────────
function renderCatSettings() {
  const list = document.getElementById('catSettingsList');
  list.innerHTML = '';
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const extChips = cat.extensions.map((ext, j) => `
      <span class="ext-chip">${ext}
        <button class="ext-chip-del" onclick="removeExt(${i},${j})"><i data-lucide="x"></i></button>
      </span>`).join('');
    const row = document.createElement('div');
    row.className = 'cat-setting-row';
    row.innerHTML = `
      <div class="cat-setting-header" onclick="toggleCatSetting(this)">
        <button class="cat-toggle ${cat.enabled ? 'on' : ''}" onclick="toggleCat(event,${i})"></button>
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
  showToast(lang === 'en' ? 'Category deleted' : 'Διαγράφηκε');
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
  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) { showToast(lang === 'en' ? 'Already exists!' : 'Υπάρχει ήδη!'); return; }
  categories.push({ id: name.toLowerCase().replace(/\s+/g,'-'), name, icon: 'folder', enabled: true, extensions: [] });
  await window.api.saveCategories(categories);
  input.value = '';
  renderCatSettings();
  showToast(lang === 'en' ? `"${name}" created` : `Δημιουργήθηκε το "${name}"`);
}

async function resetCategories() {
  if (!await showConfirm(tr('confirmResetCategories'))) return;
  categories = await window.api.resetCategories();
  renderCatSettings();
  showToast(lang === 'en' ? 'Reset to defaults' : 'Επαναφορά');
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
  if (!currentDupFolder) { showToast(lang === 'en' ? 'Select a folder first!' : 'Επιλέξτε φάκελο πρώτα!'); return; }

  // Toggle active button
  document.getElementById('scanContentBtn').classList.toggle('active', mode === 'content');
  document.getElementById('scanNameBtn').classList.toggle('active', mode === 'name');

  showToast(lang === 'en' ? 'Scanning...' : 'Σάρωση...');
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

    const rows = group.map((f, fi) => {
      const isKeep = fi === 0;
      return `<div class="dup-row ${isKeep ? 'keep-row' : ''}" onclick="toggleDupRow(this, '${f.path.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}', '${f.name.replace(/'/g,"\\'")}', ${f.size})">
        <div class="dup-check ${isKeep ? '' : ''}"><i data-lucide="check"></i></div>
        ${isKeep ? '<span class="keep-badge">KEEP</span>' : '<span class="del-badge">DELETE</span><span class="badge-placeholder" style="display:none"></span>'}
        <span class="dup-filename" title="${f.name}">${f.name}</span>
        <span class="dup-filepath" title="${f.path}">${f.path}</span>
        <span class="dup-size">${size}</span>
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
  if (!selectedRows.length) { showToast(lang === 'en' ? 'Select files to delete!' : 'Επιλέξτε αρχεία!'); return; }

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
  showToast(lang === 'en' ? `${result.deleted.length} file(s) deleted` : `Διαγράφηκαν ${result.deleted.length} αρχεία`);

  const lastMode = document.getElementById('scanContentBtn').classList.contains('active') ? 'content' : 'name';
  await scanDuplicates(lastMode);
}

async function undoDuplicates() {
  if (!lastDeletedDups.length) return;
  const result = await window.api.restoreDuplicates(lastDeletedDups);
  lastDeletedDups = [];
  document.getElementById('undoDupBtn').style.display = 'none';
  showToast(lang === 'en' ? `Restored ${result.restored.length} file(s)` : `Επαναφορά ${result.restored.length} αρχείων`);
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
  if (!folder) { showToast(lang === 'en' ? 'Select a folder first!' : 'Επιλέξτε φάκελο πρώτα!'); return; }

  const result = await window.api.startWatcher(folder);
  if (result.ok) {
    setWatcherActive(true);
    if (!document.getElementById('page-watcher').classList.contains('hidden')) {
  document.getElementById('watcherLogCard').classList.remove('hidden');
  }
    showToast(lang === 'en' ? 'Watching for new files...' : 'Παρακολούθηση ενεργή...');
  } else {
    showToast(lang === 'en' ? 'Failed to start watcher' : 'Αποτυχία εκκίνησης');
  }
}

async function stopWatcher() {
  await window.api.stopWatcher();
  setWatcherActive(false);
  showToast(lang === 'en' ? 'Watcher stopped' : 'Παρακολούθηση διακόπηκε');
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
  if (!currentCleanupFolder) { showToast(lang === 'en' ? 'Select a folder first!' : 'Επιλέξτε φάκελο πρώτα!'); return; }
  showToast(lang === 'en' ? 'Scanning...' : 'Σάρωση...');

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

  const maxSize = Math.max(results.installers.totalSize, results.junk.totalSize, results.duplicates.totalSize, results.oldFiles?.totalSize || 0, 1);

  const sections = [
    {
      id: 'installers', icon: '⚙️',
      title: lang === 'en' ? 'Installers' : 'Εγκαταστάτες',
      desc: '.exe .msi .pkg .dmg',
      size: results.installers.totalSize,
      count: results.installers.files.length,
      label: lang === 'en' ? 'files' : 'αρχεία'
    },
    {
      id: 'junk', icon: '🗑️',
      title: lang === 'en' ? 'Temp and Junk' : 'Προσωρινά αρχεία',
      desc: '.tmp .log .cache .bak',
      size: results.junk.totalSize,
      count: results.junk.files.length,
      label: lang === 'en' ? 'files' : 'αρχεία'
    },
    {
      id: 'duplicates', icon: '📄',
      title: lang === 'en' ? 'Duplicate Files' : 'Διπλότυπα αρχεία',
      desc: lang === 'en' ? 'Identical files by content' : 'Ίδιο περιεχόμενο',
      size: results.duplicates.totalSize,
      count: results.duplicates.files.length,
      label: lang === 'en' ? 'files' : 'αρχεία'
    },
    {
      id: 'oldFiles', icon: '🕒',
      title: lang === 'en' ? 'Old Files' : 'Παλιά αρχεία',
      desc: lang === 'en' ? `Not used in ${ageThresholdMonths} month(s)` : `Αχρησιμοποίητα ${ageThresholdMonths} μήνες`,
      size: results.oldFiles?.totalSize || 0,
      count: results.oldFiles?.files.length || 0,
      label: lang === 'en' ? 'files' : 'αρχεία'
    },
    {
      id: 'emptyFolders', icon: '📁',
      title: lang === 'en' ? 'Empty Folders' : 'Άδειοι φάκελοι',
      desc: lang === 'en' ? 'Folders with no files' : 'Φάκελοι χωρίς αρχεία',
      size: 0,
      count: results.emptyFolders.count,
      label: lang === 'en' ? 'folders' : 'φάκελοι'
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
  document.getElementById('cleanupSelectedSize').textContent = formatSize(total) + ' selected';

  const allChecked = ['installers','junk','duplicates','oldFiles','emptyFolders'].every(id => document.getElementById(`check-${id}`)?.checked);
  document.getElementById('selectAllCleanup').checked = allChecked;
}

function previewCleanup() {
  if (!cleanupScanResults) return;
  const lines = [];
  if (document.getElementById('check-installers')?.checked)
    cleanupScanResults.installers.files.forEach(f => lines.push(`${f.name} (${formatSize(f.size)})`));
  if (document.getElementById('check-junk')?.checked)
    cleanupScanResults.junk.files.forEach(f => lines.push(`${f.name} (${formatSize(f.size)})`));
  if (document.getElementById('check-duplicates')?.checked)
    cleanupScanResults.duplicates.files.forEach(f => lines.push(`${f.name} (${formatSize(f.size)})`));
  if (document.getElementById('check-oldFiles')?.checked)
    (cleanupScanResults.oldFiles?.files || []).forEach(f => lines.push(`${f.name} (${formatSize(f.size)})`));
  if (document.getElementById('check-emptyFolders')?.checked)
    cleanupScanResults.emptyFolders.folders.forEach(f => lines.push(`${f.name} (empty folder)`));

  alert(lines.length ? lines.join('\n') : 'Nothing selected');
}

async function runCleanup() {
  if (!cleanupScanResults) return;

  const toDelete = {
    installers:   document.getElementById('check-installers')?.checked   ? cleanupScanResults.installers.files : null,
    junk:         document.getElementById('check-junk')?.checked         ? cleanupScanResults.junk.files : null,
    duplicates:   document.getElementById('check-duplicates')?.checked   ? cleanupScanResults.duplicates.files : null,
    oldFiles:     document.getElementById('check-oldFiles')?.checked     ? (cleanupScanResults.oldFiles?.files || []) : null,
    emptyFolders: document.getElementById('check-emptyFolders')?.checked ? cleanupScanResults.emptyFolders.folders : null,
  };

  const totalCount = [toDelete.installers, toDelete.junk, toDelete.duplicates, toDelete.oldFiles, toDelete.emptyFolders]
    .filter(Boolean).reduce((s, arr) => s + arr.length, 0);

  if (totalCount === 0) { showToast(lang === 'en' ? 'Nothing selected!' : 'Τίποτα επιλεγμένο!'); return; }
  if (!await showConfirm(tr('confirmDeleteItems').replace('{count}', totalCount))) return;

  const result = await window.api.runCleanup(toDelete);
  lastCleanupDeleted = result.deleted;

  document.getElementById('undoCleanupBtn').style.display = result.deleted.length ? 'flex' : 'none';
  showToast(lang === 'en' ? `${result.deleted.length} item(s) cleaned!` : `Καθαρίστηκαν ${result.deleted.length} στοιχεία!`);
  await scanCleanup();
}

async function undoCleanup() {
  if (!lastCleanupDeleted.length) return;
  const result = await window.api.restoreCleanup(lastCleanupDeleted);
  lastCleanupDeleted = [];
  document.getElementById('undoCleanupBtn').style.display = 'none';
  showToast(lang === 'en' ? `Restored ${result.restored.length} item(s)` : `Επαναφορά ${result.restored.length} στοιχείων`);
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
        <i data-lucide="bookmark-plus"></i> ${lang === 'en' ? 'Bookmark current folder' : 'Αποθήκευση τρέχοντος φακέλου'}
      </button>
    </div>`;

  if (!bookmarksList.length) {
    html += `<div class="bookmark-empty">${lang === 'en' ? 'No bookmarks yet.' : 'Δεν υπάρχουν σελιδοδείκτες ακόμα.'}</div>`;
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
  if (!folder) { showToast(lang === 'en' ? 'Select a folder first!' : 'Επιλέξτε φάκελο πρώτα!'); return; }

  bookmarksList = await window.api.addBookmark(folder);
  showToast(lang === 'en' ? 'Bookmark added!' : 'Προστέθηκε σελιδοδείκτης!');
  renderBookmarkPanel(context);
}

async function removeBookmarkItem(id, context) {
  bookmarksList = await window.api.removeBookmark(id);
  renderBookmarkPanel(context);
  showToast(lang === 'en' ? 'Bookmark removed' : 'Αφαιρέθηκε');
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
      <span class="recent-folders-label">${lang === 'en' ? 'Recent:' : 'Πρόσφατα:'}</span>
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

async function checkForUpdates() {
  const btn = document.getElementById('checkUpdatesBtn');
  const msg = document.getElementById('updateStatusMsg');
  if (btn) btn.disabled = true;
  if (msg) { msg.className = 'status-msg'; msg.textContent = tr('checkingForUpdates'); }

  const result = await window.api.checkForUpdates();
  if (btn) btn.disabled = false;
  if (!msg) return;

  if (!result.ok) {
    msg.className = 'status-msg err';
    msg.textContent = tr('updateCheckFailed');
    return;
  }
  if (result.updateAvailable) {
    latestReleaseUrl = result.releaseUrl;
    msg.className = 'status-msg ok';
    msg.textContent = tr('updateAvailableMsg').replace('{version}', result.latestVersion);
    showUpdateBanner(result);
  } else {
    msg.className = 'status-msg ok';
    msg.textContent = tr('upToDate');
  }
}

function showUpdateBanner(result) {
  latestReleaseUrl = result.releaseUrl;
  const banner = document.getElementById('updateBanner');
  const text = document.getElementById('updateBannerText');
  if (text) text.textContent = tr('updateAvailableMsg').replace('{version}', result.latestVersion);
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

// ── Helpers ───────────────────────────────────────────────────────
function getCatIcon(cat) {
  const map = { Images:'image', Videos:'video', Audio:'music', Documents:'file-text', Archives:'archive', Code:'code', Installers:'package', Fonts:'type', Torrents:'download' };
  return map[cat] || 'folder';
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
      inner.innerHTML = `<img src="${result.src}" alt="preview"/>`;
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _confirmResolve) resolveConfirm(false);
  if (e.key === 'Enter' && _confirmResolve) resolveConfirm(true);
});

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Start ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);