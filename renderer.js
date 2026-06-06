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
async function init() {
  lucide.createIcons();
  appSettings = await window.api.getSettings();
  categories  = await window.api.getCategories();
  groups      = await window.api.getGroups();

  applyLanguage(appSettings.language);
  renderGroupChips();

  // Set default folder if configured
  if (appSettings.defaultFolder) {
    currentFolder = appSettings.defaultFolder;
    document.getElementById('folderInput').value = appSettings.defaultFolder;
  }

  document.getElementById('groupNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGroup(); });
  document.getElementById('newCatName').addEventListener('keydown',     e => { if (e.key === 'Enter') addCategory(); });
}

// ── Language ──────────────────────────────────────────────────────
function applyLanguage(l) {
  lang = l;
  document.querySelectorAll('[data-en]').forEach(el => { el.textContent = el.dataset[lang] || el.dataset['en']; });
}

function toggleLang() {
  lang = lang === 'en' ? 'gr' : 'en';
  applyLanguage(lang);
  saveSetting('language', lang);
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
}

// ── Organize ──────────────────────────────────────────────────────
async function pickFolder()    { const f = await window.api.pickFolder();    if (f) setFolder(f); }
async function useDownloads()  { const f = await window.api.getDownloads();  if (f) setFolder(f); }

async function setFolder(folder) {
  currentFolder = folder;
  document.getElementById('folderInput').value = folder;
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
      grouped[f.category].push(f.name);
    }

    const groupsHTML = Object.entries(grouped).map(([cat, names]) => `
      <div class="session-cat">
        <div class="session-cat-label"><i data-lucide="${getCatIcon(cat)}"></i>${cat} (${names.length})</div>
        <div class="file-chips">${names.map(n => `<span class="file-chip" title="${n}">${n}</span>`).join('')}</div>
      </div>`).join('');

    const el = document.createElement('div');
    el.className = 'session';
    el.innerHTML = `
      <div class="session-header" onclick="toggleSession(this)">
        <div class="session-date">${dateStr} ${timeStr}</div>
        <div class="session-folder" title="${s.folder}">${s.folder}</div>
        <span class="session-type">${s.type === 'smart-group' ? 'Smart Group' : 'Organize'}</span>
        <span class="session-badge">${s.total} moved</span>
        <button class="session-del" onclick="deleteSession(event,${s.id})"><i data-lucide="x"></i></button>
        <span class="session-chevron"><i data-lucide="chevron-down"></i></span>
      </div>
      <div class="session-body">${groupsHTML}</div>`;
    list.appendChild(el);
  }
  lucide.createIcons();
}

function toggleSession(header) { header.closest('.session').classList.toggle('open'); }

async function deleteSession(e, id) {
  e.stopPropagation();
  await window.api.deleteSession(id);
  loadHistory();
  showToast(lang === 'en' ? 'Session deleted' : 'Διαγράφηκε');
}

async function clearLog() {
  if (!confirm(lang === 'en' ? 'Clear all history?' : 'Διαγραφή όλου του ιστορικού;')) return;
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
  if (!confirm(`Delete "${categories[i].name}"?`)) return;
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
  if (!confirm(lang === 'en' ? 'Reset to default categories?' : 'Επαναφορά στις προεπιλογές;')) return;
  categories = await window.api.resetCategories();
  renderCatSettings();
  showToast(lang === 'en' ? 'Reset to defaults' : 'Επαναφορά');
}

// ── Helpers ───────────────────────────────────────────────────────
function getCatIcon(cat) {
  const map = { Images:'image', Videos:'video', Audio:'music', Documents:'file-text', Archives:'archive', Code:'code', Installers:'package', Fonts:'type', Torrents:'download' };
  return map[cat] || 'folder';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Start ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
