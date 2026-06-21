const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

let mainWindow;
let tray = null;
let trayStatsInterval = null;

// ── Data files ────────────────────────────────────────────────────
const LOG_FILE        = path.join(os.homedir(), 'mojo-organizer.log.json');
const GROUPS_FILE     = path.join(os.homedir(), 'mojo-organizer.groups.json');
const CATEGORIES_FILE = path.join(os.homedir(), 'mojo-organizer.categories.json');
const SETTINGS_FILE   = path.join(os.homedir(), 'mojo-organizer.settings.json');

// ── Default settings ──────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  language: 'en',
  minimizeToTray: true,
  startWithWindows: false,
  defaultFolder: '',
  schedule: {
    enabled: false,
    days: ['MON'],
    time: '09:00',
    folder: ''
  }
};

// ── Settings helpers ──────────────────────────────────────────────
function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

function writeSettings(s) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

// ── Start with Windows ────────────────────────────────────────────
function applyStartWithWindows(enabled) {
  const exePath = process.execPath;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: exePath,
    args: ['--hidden']
  });
}

// ── Tray stats helpers ────────────────────────────────────────────
function formatTraySize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFolderQuickStats(folderPath) {
  let fileCount = 0;
  let totalSize = 0;
  try {
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const item of items) {
      if (!item.isFile()) continue;
      fileCount++;
      try {
        totalSize += fs.statSync(path.join(folderPath, item.name)).size;
      } catch (e) {}
    }
    return { ok: true, fileCount, totalSize };
  } catch (e) {
    return { ok: false };
  }
}

function updateTrayTooltip() {
  if (!tray) return;
  const s = readSettings();
  const folder = s.defaultFolder;

  if (!folder) {
    tray.setToolTip('Mojo File Organizer');
    return;
  }

  const stats = getFolderQuickStats(folder);
  if (!stats.ok) {
    tray.setToolTip('Mojo File Organizer');
    return;
  }

  const folderName = path.basename(folder) || folder;
  const fileLabel = stats.fileCount === 1 ? 'file' : 'files';
  tray.setToolTip(`Mojo File Organizer\n${folderName}: ${stats.fileCount} ${fileLabel}, ${formatTraySize(stats.totalSize)}`);
}

function startTrayStatsRefresh() {
  updateTrayTooltip();
  if (trayStatsInterval) clearInterval(trayStatsInterval);
  trayStatsInterval = setInterval(updateTrayTooltip, 60000);
}

// ── Tray ──────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  tray = new Tray(iconPath);
  tray.setToolTip('Mojo File Organizer');
  updateTrayMenu();
  tray.on('double-click', () => showWindow());
  startTrayStatsRefresh();
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Mojo File Organizer', enabled: false },
    { type: 'separator' },
    { label: 'Open', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── Notification ──────────────────────────────────────────────────
function sendNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, 'assets', 'icon.ico') }).show();
  }
}

// ── Window ────────────────────────────────────────────────────────
function createWindow() {
  const settings = readSettings();
  const startHidden = process.argv.includes('--hidden');

  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: false,
    backgroundColor: '#111111',
    show: !startHidden
  });

  mainWindow.loadFile('index.html');

  if (!startHidden) {
    mainWindow.once('ready-to-show', () => mainWindow.show());
  }

  // Minimize to tray or close
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      const s = readSettings();
      if (s.minimizeToTray) {
        e.preventDefault();
        mainWindow.hide();
        if (tray) {
          tray.displayBalloon?.({ title: 'Mojo File Organizer', content: 'Running in background' });
        }
      }
    }
  });
}

app.whenReady().then(() => {
  createTray();
  createWindow();
  const s = readSettings();
  applyStartWithWindows(s.startWithWindows);
});

app.on('window-all-closed', () => {});
app.on('before-quit', () => { app.isQuitting = true; if (trayStatsInterval) clearInterval(trayStatsInterval); });

// ── Default categories ────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'images',     name: 'Images',     icon: 'image',     enabled: true, extensions: ['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg','.ico','.tiff','.heic','.raw','.avif'] },
  { id: 'videos',     name: 'Videos',     icon: 'video',     enabled: true, extensions: ['.mp4','.mkv','.avi','.mov','.wmv','.flv','.webm','.m4v','.mpg','.mpeg'] },
  { id: 'audio',      name: 'Audio',      icon: 'music',     enabled: true, extensions: ['.mp3','.wav','.flac','.aac','.ogg','.m4a','.wma','.opus','.aiff'] },
  { id: 'documents',  name: 'Documents',  icon: 'file-text', enabled: true, extensions: ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.odt','.ods','.odp','.txt','.rtf','.epub','.mobi'] },
  { id: 'archives',   name: 'Archives',   icon: 'archive',   enabled: true, extensions: ['.zip','.rar','.7z','.tar','.gz','.bz2','.xz','.iso','.dmg','.cab'] },
  { id: 'code',       name: 'Code',       icon: 'code',      enabled: true, extensions: ['.py','.js','.ts','.html','.css','.json','.xml','.yaml','.yml','.sh','.bat','.ps1','.java','.cpp','.c','.h','.cs','.go','.rb','.php','.sql','.md','.ipynb'] },
  { id: 'installers', name: 'Installers', icon: 'package',   enabled: true, extensions: ['.exe','.msi','.msix','.appx','.apk','.deb','.rpm','.pkg'] },
  { id: 'fonts',      name: 'Fonts',      icon: 'type',      enabled: true, extensions: ['.ttf','.otf','.woff','.woff2','.eot'] },
  { id: 'torrents',   name: 'Torrents',   icon: 'download',  enabled: true, extensions: ['.torrent'] }
];

// ── Categories helpers ────────────────────────────────────────────
function readCategories() {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}
function writeCategories(c) { fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(c, null, 2)); }
function getCategory(ext, cats) {
  const e = ext.toLowerCase();
  for (const cat of cats) { if (cat.enabled && cat.extensions.includes(e)) return cat.name; }
  return null;
}

// ── Log helpers ───────────────────────────────────────────────────
function readLog() {
  try { if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeLog(s) { fs.writeFileSync(LOG_FILE, JSON.stringify(s, null, 2)); }
function appendSession(session) {
  const sessions = readLog();
  sessions.unshift(session);
  if (sessions.length > 100) sessions.splice(100);
  writeLog(sessions);
}

// ── Groups helpers ────────────────────────────────────────────────
function readGroups() {
  try { if (fs.existsSync(GROUPS_FILE)) return JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeGroups(g) { fs.writeFileSync(GROUPS_FILE, JSON.stringify(g, null, 2)); }
function normalize(str) { return str.toLowerCase().replace(/[._\-,\s]+/g, ''); }
function filenameMatchesGroup(filename, groupName) {
  return normalize(path.basename(filename, path.extname(filename))).includes(normalize(groupName));
}
function getUniqueDest(destFolder, filename) {
  let dest = path.join(destFolder, filename);
  if (!fs.existsSync(dest)) return dest;
  const ext = path.extname(filename), base = path.basename(filename, ext);
  let i = 1;
  do { dest = path.join(destFolder, `${base}_${i}${ext}`); i++; } while (fs.existsSync(dest));
  return dest;
}
// ── Bookmarks helpers ─────────────────────────────────────────────
const BOOKMARKS_FILE = path.join(os.homedir(), 'mojo-organizer.bookmarks.json');

function readBookmarks() {
  try { if (fs.existsSync(BOOKMARKS_FILE)) return JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeBookmarks(b) { fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(b, null, 2)); }

// ── IPC: Bookmarks ────────────────────────────────────────────────
ipcMain.handle('get-bookmarks', async () => readBookmarks());

ipcMain.handle('add-bookmark', async (_, folderPath) => {
  const bookmarks = readBookmarks();
  if (bookmarks.find(b => b.path === folderPath)) return bookmarks;
  const name = path.basename(folderPath) || folderPath;
  bookmarks.push({ id: Date.now(), name, path: folderPath });
  writeBookmarks(bookmarks);
  return bookmarks;
});

ipcMain.handle('remove-bookmark', async (_, id) => {
  const bookmarks = readBookmarks().filter(b => b.id !== id);
  writeBookmarks(bookmarks);
  return bookmarks;
});

// ── Recent Folders helpers ───────────────────────────────────────
const RECENT_FILE = path.join(os.homedir(), 'mojo-organizer.recent.json');

function readRecent() {
  try { if (fs.existsSync(RECENT_FILE)) return JSON.parse(fs.readFileSync(RECENT_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeRecent(r) { fs.writeFileSync(RECENT_FILE, JSON.stringify(r, null, 2)); }

// ── IPC: Recent Folders ───────────────────────────────────────────
ipcMain.handle('get-recent-folders', async () => readRecent());

ipcMain.handle('add-recent-folder', async (_, folderPath) => {
  let recent = readRecent();
  recent = recent.filter(r => r.path !== folderPath);
  const name = path.basename(folderPath) || folderPath;
  recent.unshift({ path: folderPath, name, timestamp: Date.now() });
  if (recent.length > 5) recent = recent.slice(0, 5);
  writeRecent(recent);
  return recent;
});

// ── IPC: Settings ─────────────────────────────────────────────────
ipcMain.handle('get-settings', async () => readSettings());
ipcMain.handle('save-settings', async (_, s) => {
  writeSettings(s);
  applyStartWithWindows(s.startWithWindows);
  updateTrayTooltip();
  return true;
});

// ── IPC: Categories ───────────────────────────────────────────────
ipcMain.handle('get-categories',   async ()    => readCategories());
ipcMain.handle('save-categories',  async (_, c) => { writeCategories(c); return true; });
ipcMain.handle('reset-categories', async ()    => { writeCategories(DEFAULT_CATEGORIES); return DEFAULT_CATEGORIES; });

// ── IPC: Preview & Organize ───────────────────────────────────────
ipcMain.handle('preview', async (_, folderPath) => {
  const cats = readCategories();
  const results = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      const cat = getCategory(path.extname(f.name), cats);
      if (cat) results.push({ name: f.name, category: cat });
    }
  } catch (e) {}
  return results;
});

ipcMain.handle('organize', async (_, folderPath) => {
  const cats = readCategories();
  const moved = [], errors = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      const cat = getCategory(path.extname(f.name), cats);
      if (!cat) continue;
      const destFolder = path.join(folderPath, cat);
      if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
      const src = path.join(folderPath, f.name);
      const dest = getUniqueDest(destFolder, f.name);
      try { fs.renameSync(src, dest); moved.push({ name: f.name, category: cat, from: src, to: dest }); }
      catch (e) { errors.push({ name: f.name, error: e.message }); }
    }
    if (moved.length > 0 || errors.length > 0) {
      appendSession({ id: Date.now(), timestamp: new Date().toISOString(), folder: folderPath, type: 'organize', moved: moved.map(m => ({ name: m.name, category: m.category })), errors, total: moved.length });
      sendNotification('Mojo File Organizer', `${moved.length} file${moved.length !== 1 ? 's' : ''} organized successfully`);
      updateTrayTooltip();
    }
  } catch (e) { errors.push({ name: 'General', error: e.message }); }
  return { moved, errors };
});

ipcMain.handle('undo', async (_, moves) => {
  const restored = [], errors = [];
  for (const m of [...moves].reverse()) {
    try {
      if (fs.existsSync(m.to)) {
        fs.renameSync(m.to, m.from);
        restored.push(m.name);
        const dir = path.dirname(m.to);
        if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      }
    } catch (e) { errors.push({ name: m.name, error: e.message }); }
  }
  updateTrayTooltip();
  return { restored, errors };
});

// ── IPC: Smart Group ──────────────────────────────────────────────
ipcMain.handle('get-groups',  async ()     => readGroups());
ipcMain.handle('save-groups', async (_, g) => { writeGroups(g); return true; });

ipcMain.handle('preview-groups', async (_, folderPath) => {
  const groups = readGroups();
  if (!groups.length) return [];
  const results = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      for (const g of groups) {
        if (filenameMatchesGroup(f.name, g.name)) { results.push({ name: f.name, group: g.name }); break; }
      }
    }
  } catch (e) {}
  return results;
});

ipcMain.handle('organize-groups', async (_, folderPath) => {
  const groups = readGroups();
  const moved = [], errors = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      for (const g of groups) {
        if (filenameMatchesGroup(f.name, g.name)) {
          const folderName = g.name.charAt(0).toUpperCase() + g.name.slice(1);
          const destFolder = path.join(folderPath, folderName);
          if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
          const src = path.join(folderPath, f.name);
          const dest = getUniqueDest(destFolder, f.name);
          try { fs.renameSync(src, dest); moved.push({ name: f.name, group: folderName, from: src, to: dest }); }
          catch (e) { errors.push({ name: f.name, error: e.message }); }
          break;
        }
      }
    }
    if (moved.length > 0 || errors.length > 0) {
      appendSession({ id: Date.now(), timestamp: new Date().toISOString(), folder: folderPath, type: 'smart-group', moved: moved.map(m => ({ name: m.name, category: m.group })), errors, total: moved.length });
      sendNotification('Mojo File Organizer', `${moved.length} file${moved.length !== 1 ? 's' : ''} grouped successfully`);
      updateTrayTooltip();
    }
  } catch (e) { errors.push({ name: 'General', error: e.message }); }
  return { moved, errors };
});

// ── IPC: Log ──────────────────────────────────────────────────────
ipcMain.handle('get-log',        async ()      => readLog());
ipcMain.handle('clear-log',      async ()      => { writeLog([]); return true; });
ipcMain.handle('delete-session', async (_, id) => { writeLog(readLog().filter(s => s.id !== id)); return true; });

// ── IPC: Stats ────────────────────────────────────────────────────
ipcMain.handle('get-stats', async () => {
  const sessions = readLog();
  const byCategory = {};
  for (const s of sessions) {
    for (const m of s.moved) { byCategory[m.category] = (byCategory[m.category] || 0) + 1; }
  }
  return { totalFiles: sessions.reduce((sum, s) => sum + s.total, 0), totalSessions: sessions.length, byCategory };
});

// ── IPC: Schedule ─────────────────────────────────────────────────
ipcMain.handle('schedule', async (_, { days, time, folder }) => {
  const { exec } = require('child_process');
  const exePath = app.getPath('exe');
  const results = [];
  // Delete old tasks first
  await new Promise(r => exec('schtasks /delete /tn "MojoFileOrganizer" /f', r));

  for (const day of days) {
    const cmd = `schtasks /create /tn "MojoFileOrganizer_${day}" /tr "\\"${exePath}\\" --hidden --organize \\"${folder}\\"" /sc weekly /d ${day} /st ${time} /f`;
    await new Promise((resolve) => {
      exec(cmd, (err, _, stderr) => { results.push(err ? { ok: false, msg: stderr } : { ok: true }); resolve(); });
    });
  }
  return results.every(r => r.ok) ? { ok: true } : { ok: false };
});

ipcMain.handle('unschedule', async () => {
  const { exec } = require('child_process');
  const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  for (const day of days) {
    await new Promise(r => exec(`schtasks /delete /tn "MojoFileOrganizer_${day}" /f`, r));
  }
  await new Promise(r => exec('schtasks /delete /tn "MojoFileOrganizer" /f', r));
  return { ok: true };
});

// ── IPC: Folder & utils ───────────────────────────────────────────
ipcMain.handle('pick-folder',   async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], defaultPath: path.join(os.homedir(), 'Downloads') });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('get-downloads', async () => path.join(os.homedir(), 'Downloads'));

// ── IPC: Export Stats ─────────────────────────────────────────────
ipcMain.handle('export-csv', async (_, exportPath) => {
  try {
    const sessions = readLog();
    const rows = ['Date,Time,Folder,Type,File,Category'];
    for (const s of sessions) {
      const date = new Date(s.timestamp);
      const dateStr = date.toLocaleDateString('en-GB');
      const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      for (const m of s.moved) {
        rows.push(`"${dateStr}","${timeStr}","${s.folder}","${s.type}","${m.name}","${m.category}"`);
      }
    }
    fs.writeFileSync(exportPath, rows.join('\n'), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('export-pdf', async (_, exportPath) => {
  try {
    const sessions = readLog();
    const byCategory = {};
    for (const s of sessions) {
      for (const m of s.moved) {
        byCategory[m.category] = (byCategory[m.category] || 0) + 1;
      }
    }
    const totalFiles = sessions.reduce((sum, s) => sum + s.total, 0);

    const categoryRows = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `<tr><td>${cat}</td><td>${count}</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #888; font-size: 13px; margin-bottom: 30px; }
  .stats { display: flex; gap: 20px; margin-bottom: 30px; }
  .stat { background: #f5f5f5; border-radius: 8px; padding: 16px 24px; text-align: center; }
  .stat-num { font-size: 32px; font-weight: 800; color: #3ddb3d; }
  .stat-label { font-size: 11px; color: #888; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #f5f5f5; padding: 10px 14px; text-align: left; font-size: 12px; }
  td { padding: 8px 14px; border-bottom: 1px solid #eee; font-size: 12px; }
  h2 { font-size: 16px; color: #1a1a1a; margin-bottom: 8px; }
</style>
</head>
<body>
  <h1>Mojo File Organizer</h1>
  <div class="subtitle">Statistics Report - ${new Date().toLocaleDateString('en-GB')}</div>
  <div class="stats">
    <div class="stat"><div class="stat-num">${totalFiles}</div><div class="stat-label">Total Files Organized</div></div>
    <div class="stat"><div class="stat-num">${sessions.length}</div><div class="stat-label">Sessions</div></div>
    <div class="stat"><div class="stat-num">${Object.keys(byCategory).length}</div><div class="stat-label">Categories Used</div></div>
  </div>
  <h2>Files by Category</h2>
  <table>
    <tr><th>Category</th><th>Files</th></tr>
    ${categoryRows}
  </table>
</body>
</html>`;

    const pdfWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfData = await pdfWin.webContents.printToPDF({ marginsType: 1, printBackground: true });
    pdfWin.close();
    fs.writeFileSync(exportPath, pdfData);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('show-save-dialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result.canceled ? null : result.filePath;
});

// ── IPC: Cleanup ──────────────────────────────────────────────────
const INSTALLER_EXTS = ['.exe','.msi','.msix','.appx','.apk','.deb','.rpm','.pkg','.dmg'];
const JUNK_EXTS = ['.tmp','.log','.cache','.bak','.temp','.old','.DS_Store'];
const JUNK_NAMES = ['thumbs.db','desktop.ini','.ds_store'];

function getFileSize(filePath) {
  try { return fs.statSync(filePath).size; } catch (e) { return 0; }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function scanFolder(folderPath) {
  const installers = [], junk = [], emptyFolders = [];
  try {
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(folderPath, item.name);
      if (item.isDirectory()) {
        try {
          const contents = fs.readdirSync(fullPath);
          if (contents.length === 0) emptyFolders.push({ name: item.name, path: fullPath, size: 0 });
        } catch (e) {}
      } else {
        const ext = path.extname(item.name).toLowerCase();
        const nameLower = item.name.toLowerCase();
        const size = getFileSize(fullPath);
        if (INSTALLER_EXTS.includes(ext)) {
          installers.push({ name: item.name, path: fullPath, size });
        } else if (JUNK_EXTS.includes(ext) || JUNK_NAMES.includes(nameLower)) {
          junk.push({ name: item.name, path: fullPath, size });
        }
      }
    }
  } catch (e) {}
  return { installers, junk, emptyFolders };
}

function scanOldFiles(folderPath, monthsThreshold) {
  const oldFiles = [];
  const cutoff = Date.now() - (monthsThreshold * 30 * 24 * 60 * 60 * 1000);
  try {
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const item of items) {
      if (!item.isFile()) continue;
      const fullPath = path.join(folderPath, item.name);
      try {
        const stat = fs.statSync(fullPath);
        const lastUsed = Math.max(stat.mtimeMs, stat.atimeMs);
        if (lastUsed < cutoff) {
          oldFiles.push({ name: item.name, path: fullPath, size: stat.size, lastModified: stat.mtime.toISOString() });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return oldFiles;
}

ipcMain.handle('scan-cleanup', async (_, { folderPath, oldFilesMonths }) => {
  const { installers, junk, emptyFolders } = scanFolder(folderPath);

  // Duplicates
  const hashMap = {};
  const duplicates = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      const fullPath = path.join(folderPath, f.name);
      const hash = hashFile(fullPath);
      if (!hash) continue;
      if (hashMap[hash]) {
        duplicates.push({ name: f.name, path: fullPath, size: getFileSize(fullPath) });
      } else {
        hashMap[hash] = fullPath;
      }
    }
  } catch (e) {}

  // Old files
  const oldFiles = oldFilesMonths ? scanOldFiles(folderPath, oldFilesMonths) : [];

  return {
    installers: { files: installers, totalSize: installers.reduce((s, f) => s + f.size, 0) },
    junk:       { files: junk,       totalSize: junk.reduce((s, f) => s + f.size, 0) },
    duplicates: { files: duplicates, totalSize: duplicates.reduce((s, f) => s + f.size, 0) },
    emptyFolders: { folders: emptyFolders, count: emptyFolders.length },
    oldFiles: { files: oldFiles, totalSize: oldFiles.reduce((s, f) => s + f.size, 0) }
  };
});

ipcMain.handle('run-cleanup', async (_, { installers, junk, duplicates, emptyFolders, oldFiles }) => {
  const trashDir = path.join(os.homedir(), '.mojo-trash');
  if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir);
  const deleted = [], errors = [];

  const deleteFile = (file) => {
    try {
      const trashPath = path.join(trashDir, `${Date.now()}_${file.name}`);
      fs.renameSync(file.path, trashPath);
      deleted.push({ ...file, trashPath });
    } catch (e) { errors.push({ name: file.name, error: e.message }); }
  };

  const deleteFolder = (folder) => {
    try { fs.rmdirSync(folder.path); deleted.push(folder); }
    catch (e) { errors.push({ name: folder.name, error: e.message }); }
  };

  if (installers) installers.forEach(deleteFile);
  if (junk)       junk.forEach(deleteFile);
  if (duplicates) duplicates.forEach(deleteFile);
  if (emptyFolders) emptyFolders.forEach(deleteFolder);
  if (oldFiles) oldFiles.forEach(deleteFile);

  sendNotification('Mojo File Organizer', `Cleanup complete - ${deleted.length} items removed`);
  updateTrayTooltip();
  return { deleted, errors };
});

ipcMain.handle('restore-cleanup', async (_, files) => {
  const restored = [], errors = [];
  for (const f of files) {
    try {
      if (f.trashPath && fs.existsSync(f.trashPath)) {
        fs.renameSync(f.trashPath, f.path);
        restored.push(f.name);
      }
    } catch (e) { errors.push({ name: f.name, error: e.message }); }
  }
  updateTrayTooltip();
  return { restored, errors };
});

// ── IPC: Window ───────────────────────────────────────────────────
ipcMain.on('minimize', () => mainWindow.minimize());
ipcMain.on('maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('close',    () => {
  const s = readSettings();
  if (s.minimizeToTray) { mainWindow.hide(); }
  else { app.isQuitting = true; mainWindow.close(); }
});

// ── IPC: Duplicate Finder ─────────────────────────────────────────
const crypto = require('crypto');

function hashFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  } catch (e) { return null; }
}

ipcMain.handle('scan-duplicates', async (_, { folderPath, mode }) => {
  const results = {};
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(f => f.isFile())
      .map(f => ({ name: f.name, path: path.join(folderPath, f.name), size: fs.statSync(path.join(folderPath, f.name)).size }));

    for (const file of files) {
      let key;
      if (mode === 'name') {
        key = file.name.toLowerCase();
      } else {
        const hash = hashFile(file.path);
        if (!hash) continue;
        key = hash;
      }
      if (!results[key]) results[key] = [];
      results[key].push({ name: file.name, path: file.path, size: file.size });
    }

    const duplicates = Object.values(results).filter(g => g.length > 1);
    return { duplicates, totalGroups: duplicates.length, totalFiles: duplicates.reduce((s, g) => s + g.length, 0) };
  } catch (e) {
    return { duplicates: [], totalGroups: 0, totalFiles: 0, error: e.message };
  }
});

ipcMain.handle('delete-duplicates', async (_, files) => {
  const deleted = [], errors = [];
  const trashDir = path.join(os.homedir(), '.mojo-trash');
  if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir);
  for (const file of files) {
    try {
      const trashPath = path.join(trashDir, `${Date.now()}_${file.name}`);
      fs.renameSync(file.path, trashPath);
      deleted.push({ ...file, trashPath });
    } catch (e) { errors.push({ name: file.name, error: e.message }); }
  }
  updateTrayTooltip();
  return { deleted, errors };
});

ipcMain.handle('restore-duplicates', async (_, files) => {
  const restored = [], errors = [];
  for (const file of files) {
    try {
      if (fs.existsSync(file.trashPath)) {
        fs.renameSync(file.trashPath, file.path);
        restored.push(file.name);
      }
    } catch (e) { errors.push({ name: file.name, error: e.message }); }
  }
  updateTrayTooltip();
  return { restored, errors };
});

// ── File Watcher ──────────────────────────────────────────────────
let activeWatcher = null;
let watcherFolder = null;

ipcMain.handle('start-watcher', async (_, folderPath) => {
  try {
    if (activeWatcher) {
      activeWatcher.close();
      activeWatcher = null;
    }

    watcherFolder = folderPath;
    const cats = readCategories();
    const recentlyProcessed = new Set();

    activeWatcher = fs.watch(folderPath, async (eventType, filename) => {
      if (!filename || eventType !== 'rename') return;
      if (recentlyProcessed.has(filename)) return;
      recentlyProcessed.add(filename);
      setTimeout(() => recentlyProcessed.delete(filename), 3000);

      setTimeout(async () => {
        const filePath = path.join(folderPath, filename);
        try {
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) return;
        } catch (e) { return; }

        const cat = getCategory(path.extname(filename), cats);
        if (!cat) return;

        const destFolder = path.join(folderPath, cat);
        if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });

        const dest = getUniqueDest(destFolder, filename);
        try {
          fs.renameSync(filePath, dest);
          appendSession({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            folder: folderPath,
            type: 'watcher',
            moved: [{ name: filename, category: cat }],
            errors: [],
            total: 1
          });
          sendNotification('Mojo File Organizer', `Auto-organized: ${filename} -> ${cat}/`);
          if (mainWindow) mainWindow.webContents.send('watcher-event', { filename, category: cat });
          updateTrayTooltip();
        } catch (e) {}
      }, 1000);
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('stop-watcher', async () => {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
    watcherFolder = null;
  }
  return { ok: true };
});

ipcMain.handle('get-path-for-file', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isDirectory() ? filePath : path.dirname(filePath);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('get-watcher-status', async () => {
  return { active: !!activeWatcher, folder: watcherFolder };
});