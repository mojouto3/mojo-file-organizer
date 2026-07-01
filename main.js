const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification, nativeImage } = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const https = require('https');

const APP_VERSION = require('./package.json').version;
const UPDATE_REPO = 'mojouto3/mojo-file-organizer';

let mainWindow;
let tray = null;
let trayStatsInterval = null;

// ── Data files ────────────────────────────────────────────────────
// ── Portable mode detection ───────────────────────────────────────
// electron-builder sets PORTABLE_EXECUTABLE_DIR for portable builds
const IS_PORTABLE = !!process.env.PORTABLE_EXECUTABLE_DIR;
const DATA_DIR = IS_PORTABLE
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'MojoData')
  : os.homedir();

// Ensure data directory exists (needed for portable mode)
if (IS_PORTABLE && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LOG_FILE        = path.join(DATA_DIR, 'mojo-organizer.log.json');
const GROUPS_FILE     = path.join(DATA_DIR, 'mojo-organizer.groups.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'mojo-organizer.categories.json');
const SETTINGS_FILE   = path.join(DATA_DIR, 'mojo-organizer.settings.json');
const RULES_FILE      = path.join(DATA_DIR, 'mojo-organizer.rules.json');

// ── Default settings ──────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  language: 'en',
  minimizeToTray: true,
  startWithWindows: false,
  defaultFolder: '',
  onboardingComplete: false,
  schedule: {
    enabled: false,
    days: ['MON'],
    time: '09:00',
    folder: ''
  },
  cleanupSchedule: {
    enabled: false,
    days: ['MON'],
    time: '10:00',
    folder: '',
    sections: ['installers', 'junk', 'oldFiles', 'emptyFolders']
  },
  sizeFilter: {
    minKB: 0,
    maxKB: 0
  },
  renameRules: {
    datePrefix: false,
    dateSuffix: false,
    spacesToUnderscores: false,
    lowercaseAll: false,
    removeSpecialChars: false
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
  const s = readSettings();
  const downloadsFolder = path.join(os.homedir(), 'Downloads');
  const lastFolder = s.defaultFolder || '';

  // Get quick stats for tooltip label
  let statsLabel = 'Mojo File Organizer';
  try {
    const logData = readLog();
    const total = logData.reduce((acc, session) => acc + (session.total || 0), 0);
    if (total > 0) statsLabel = `Mojo File Organizer — ${total} files organized`;
  } catch (e) {}

  const menuTemplate = [
    { label: statsLabel, enabled: false },
    { type: 'separator' },
    {
      label: '⚡ Organize Downloads',
      click: async () => {
        showWindow();
        setTimeout(() => {
          if (mainWindow) mainWindow.webContents.send('tray-action', { action: 'organize', folder: downloadsFolder });
        }, 500);
      }
    },
    ...(lastFolder ? [{
      label: `⚡ Organize Last Folder`,
      sublabel: path.basename(lastFolder),
      click: async () => {
        showWindow();
        setTimeout(() => {
          if (mainWindow) mainWindow.webContents.send('tray-action', { action: 'organize', folder: lastFolder });
        }, 500);
      }
    }] : []),
    { type: 'separator' },
    {
      label: '🕐 Open History',
      click: () => { showWindow(); setTimeout(() => mainWindow?.webContents.send('tray-action', { action: 'tab', tab: 'history' }), 500); }
    },
    {
      label: '🗑 Open Cleanup',
      click: () => { showWindow(); setTimeout(() => mainWindow?.webContents.send('tray-action', { action: 'tab', tab: 'cleanup' }), 500); }
    },
    {
      label: '📊 Open Stats',
      click: () => { showWindow(); setTimeout(() => mainWindow?.webContents.send('tray-action', { action: 'tab', tab: 'stats' }), 500); }
    },
    { type: 'separator' },
    { label: 'Open', click: () => showWindow() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(menu);
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── Notification ──────────────────────────────────────────────────
function sendNotification(title, body, { silent = false, urgency = 'normal' } = {}) {
  if (!Notification.isSupported() || silent) return;
  new Notification({
    title,
    body,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    urgency,
    timeoutType: 'default'
  }).show();
}

function formatOrganizeNotification(moved) {
  if (!moved || moved.length === 0) return null;
  const byCategory = {};
  moved.forEach(m => { byCategory[m.category] = (byCategory[m.category] || 0) + 1; });
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const breakdown = top.map(([cat, count]) => `${count} ${cat}`).join(', ');
  return {
    title: `✓ ${moved.length} file${moved.length !== 1 ? 's' : ''} organized`,
    body: breakdown + (Object.keys(byCategory).length > 3 ? ' and more' : '')
  };
}

// ── Check for Updates ────────────────────────────────────────────
function compareVersions(a, b) {
  // Returns 1 if a > b, -1 if a < b, 0 if equal. Ignores leading "v".
  const pa = a.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${UPDATE_REPO}/releases/latest`,
      headers: { 'User-Agent': 'mojo-file-organizer' },
      timeout: 8000
    };
    const req = https.get(options, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`GitHub API returned ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

// ── Auto Updater ─────────────────────────────────────────────────
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false; // user decides when to download
autoUpdater.autoInstallOnAppQuit = true;

function initAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', {
      status: 'available',
      version: info.version,
      releaseNotes: (info.releaseNotes || '').toString().slice(0, 500)
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-status', {
      status: 'downloaded',
      version: info.version
    });
  });

  autoUpdater.on('error', (err) => {
    // Only show error to user during download, not during check
    // Missing latest.yml is expected when not released via electron-builder publish
    const isCheckError = err.message?.includes('latest.yml') ||
                         err.message?.includes('404') ||
                         err.message?.includes('Cannot find latest');
    if (!isCheckError && mainWindow) {
      mainWindow.webContents.send('updater-status', {
        status: 'error',
        message: err.message
      });
    }
  });
}

async function checkForUpdates() {
  const isDev = !app.isPackaged;

  if (!isDev) {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result) {
        const latestVersion = result.updateInfo?.version || '';
        const updateAvailable = compareVersions(latestVersion, APP_VERSION) > 0;
        return {
          ok: true, updateAvailable, source: 'autoUpdater',
          currentVersion: APP_VERSION, latestVersion,
          releaseUrl: `https://github.com/${UPDATE_REPO}/releases/tag/v${latestVersion}`,
          releaseNotes: (result.updateInfo?.releaseNotes || '').toString().slice(0, 500),
        };
      }
    } catch (e) { /* fall through to GitHub API */ }
  }

  // Fallback: manual GitHub API check
  try {
    const release = await fetchLatestRelease();
    const latestVersion = (release.tag_name || '').replace(/^v/i, '');
    if (!latestVersion) return { ok: false, error: 'No release tag found' };
    const updateAvailable = compareVersions(latestVersion, APP_VERSION) > 0;
    return {
      ok: true, updateAvailable, source: 'github',
      currentVersion: APP_VERSION, latestVersion,
      releaseUrl: release.html_url || `https://github.com/${UPDATE_REPO}/releases/latest`,
      releaseNotes: (release.body || '').slice(0, 500),
    };
  } catch (e) {
    return { ok: false, error: e.message };
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

app.whenReady().then(async () => {
  createTray();
  createWindow();
  initAutoUpdater();
  const s = readSettings();
  applyStartWithWindows(s.startWithWindows);

  // Handle context menu launch: --organize "folder"
  const organizeIdx = process.argv.indexOf('--organize');
  if (organizeIdx !== -1 && !process.argv.includes('--hidden')) {
    const folder = process.argv[organizeIdx + 1];
    if (folder) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('context-menu-organize', folder);
      });
    }
  }
  const cleanupIdx = process.argv.indexOf('--cleanup');
  if (cleanupIdx !== -1) {
    const folder = process.argv[cleanupIdx + 1];
    const sectionsIdx = process.argv.indexOf('--sections');
    const sections = sectionsIdx !== -1 ? process.argv[sectionsIdx + 1].split(',') : ['installers','junk','oldFiles','emptyFolders'];
    if (folder) {
      mainWindow.webContents.once('did-finish-load', async () => {
        const months = s.cleanupSchedule?.oldFilesMonths || 6;
        const results = await ipcMain.emit('run-cleanup-silent', null, { folderPath: folder, sections, oldFilesMonths: months });
        sendNotification('✓ Scheduled cleanup complete', 'Your folder has been cleaned automatically');
      });
    }
  }

  // Silent startup check (only notifies renderer if a newer version exists)
  setTimeout(async () => {
    const result = await checkForUpdates();
    // Only send update-available if autoUpdater didn't already handle it
    // (autoUpdater sends updater-status:available via its own event listener)
    if (result.ok && result.updateAvailable && result.source === 'github' && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', result);
    }
  }, 4000);
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

// ── Ignore list helpers ───────────────────────────────────────────
const IGNORE_FILE = path.join(DATA_DIR, 'mojo-organizer.ignore.json');
const DEFAULT_IGNORE = { folders: ['node_modules', '.git', '.svn', '.venv', '__pycache__', '.DS_Store'], extensions: ['.sys', '.dll', '.lnk', '.ini', '.db', '.log'] };

function readIgnoreList() {
  try { if (fs.existsSync(IGNORE_FILE)) return JSON.parse(fs.readFileSync(IGNORE_FILE, 'utf8')); } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_IGNORE));
}
function writeIgnoreList(list) { fs.writeFileSync(IGNORE_FILE, JSON.stringify(list, null, 2)); }

function shouldIgnore(filename, ignoreList) {
  const ext = path.extname(filename).toLowerCase();
  const nameLower = filename.toLowerCase();
  if (ignoreList.extensions.some(e => e.toLowerCase() === ext)) return true;
  if (ignoreList.folders.some(f => f.toLowerCase() === nameLower)) return true;
  return false;
}

function applyRenameRules(filename, rules) {
  if (!rules) return filename;
  const ext  = path.extname(filename);
  let base   = path.basename(filename, ext);
  const today = new Date().toISOString().slice(0, 10);

  if (rules.datePrefix)           base = `${today}_${base}`;
  if (rules.dateSuffix)           base = `${base}_${today}`;
  if (rules.spacesToUnderscores)  base = base.replace(/ /g, '_');
  if (rules.lowercaseAll)         base = base.toLowerCase();
  if (rules.removeSpecialChars)   base = base.replace(/[^\w\-\u0370-\u03FF\u1F00-\u1FFF]/g, '');

  return base + ext;
}

function shouldIgnoreSize(filePath, sizeFilter) {
  if (!sizeFilter || (!sizeFilter.minKB && !sizeFilter.maxKB)) return false;
  try {
    const sizeKB = fs.statSync(filePath).size / 1024;
    if (sizeFilter.minKB > 0 && sizeKB < sizeFilter.minKB) return true;
    if (sizeFilter.maxKB > 0 && sizeKB > sizeFilter.maxKB) return true;
  } catch (e) {}
  return false;
}
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
  let i = 2;
  do { dest = path.join(destFolder, `${base} (${i})${ext}`); i++; } while (fs.existsSync(dest));
  return dest;
}
// ── Bookmarks helpers ─────────────────────────────────────────────
const BOOKMARKS_FILE = path.join(DATA_DIR, 'mojo-organizer.bookmarks.json');

function readBookmarks() {
  try { if (fs.existsSync(BOOKMARKS_FILE)) return JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeBookmarks(b) { fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(b, null, 2)); }

// ── IPC: Updates ──────────────────────────────────────────────────
ipcMain.handle('get-app-version', async () => APP_VERSION);
ipcMain.handle('check-for-updates', async () => checkForUpdates());
ipcMain.handle('download-update', async () => {
  try { await autoUpdater.downloadUpdate(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});
ipcMain.handle('open-release-page', async (_, url) => {
  const safeUrl = (url && typeof url === 'string' && /^https:\/\/github\.com\//.test(url))
    ? url
    : `https://github.com/${UPDATE_REPO}/releases/latest`;
  shell.openExternal(safeUrl);
  return true;
});

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
const RECENT_FILE = path.join(DATA_DIR, 'mojo-organizer.recent.json');

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
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  // Whitelist allowed keys
  const allowed = ['language','minimizeToTray','startWithWindows','defaultFolder',
    'onboardingComplete','theme','schedule','cleanupSchedule','sizeFilter',
    'renameRules','contextMenuEnabled'];
  const clean = {};
  for (const key of allowed) { if (key in s) clean[key] = s[key]; }
  writeSettings(clean);
  applyStartWithWindows(clean.startWithWindows);
  updateTrayTooltip();
  return true;
});

// ── IPC: Categories ───────────────────────────────────────────────
ipcMain.handle('get-ignore-list',   async ()      => readIgnoreList());
ipcMain.handle('save-ignore-list',  async (_, l)  => { writeIgnoreList(l); return true; });
ipcMain.handle('reset-ignore-list', async ()      => { writeIgnoreList(DEFAULT_IGNORE); return DEFAULT_IGNORE; });

ipcMain.handle('get-categories',   async ()    => readCategories());
ipcMain.handle('save-categories',  async (_, c) => { writeCategories(c); return true; });
ipcMain.handle('reset-categories', async ()    => { writeCategories(DEFAULT_CATEGORIES); return DEFAULT_CATEGORIES; });

// ── IPC: Preview & Organize ───────────────────────────────────────
ipcMain.handle('preview', async (_, folderPath) => {
  const cats = readCategories();
  const ignore = readIgnoreList();
  const { sizeFilter, renameRules } = readSettings();
  const results = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      if (shouldIgnore(f.name, ignore)) continue;
      const fullPath = path.join(folderPath, f.name);
      if (shouldIgnoreSize(fullPath, sizeFilter)) continue;
      const cat = getCategory(path.extname(f.name), cats);
      if (cat) results.push({ name: f.name, newName: applyRenameRules(f.name, renameRules), category: cat });
    }
  } catch (e) {}
  return results;
});

ipcMain.handle('organize', async (_, folderPath) => {
  const cats = readCategories();
  const ignore = readIgnoreList();
  const { sizeFilter, renameRules } = readSettings();
  const moved = [], errors = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      if (shouldIgnore(f.name, ignore)) continue;
      const src = path.join(folderPath, f.name);
      if (shouldIgnoreSize(src, sizeFilter)) continue;
      const cat = getCategory(path.extname(f.name), cats);
      if (!cat) continue;
      const destFolder = path.join(folderPath, cat);
      if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
      const newName = applyRenameRules(f.name, renameRules);
      const dest = getUniqueDest(destFolder, newName);
      try { fs.renameSync(src, dest); moved.push({ name: f.name, category: cat, from: src, to: dest }); }
      catch (e) { errors.push({ name: f.name, error: e.message }); }
    }
    if (moved.length > 0 || errors.length > 0) {
      appendSession({ id: Date.now(), timestamp: new Date().toISOString(), folder: folderPath, type: 'organize', moved: moved.map(m => ({ name: m.name, category: m.category, from: m.from, to: m.to })), errors, total: moved.length });
      const notif = formatOrganizeNotification(moved);
        if (notif) sendNotification(notif.title, notif.body);
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

ipcMain.handle('export-groups', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Groups',
    defaultPath: `mojo-groups-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePath) return { ok: false, cancelled: true };
  try {
    fs.writeFileSync(filePath, JSON.stringify({ groups: readGroups(), exportedAt: new Date().toISOString() }, null, 2));
    return { ok: true, path: filePath };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('import-groups', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Groups',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (!filePaths?.length) return { ok: false, cancelled: true };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    const incoming = data.groups || (Array.isArray(data) ? data : null);
    if (!incoming) return { ok: false, error: 'Invalid groups file' };
    const existing = readGroups();
    // Merge: add groups that don't already exist by name
    const existingNames = new Set(existing.map(g => g.name.toLowerCase()));
    const merged = [...existing, ...incoming.filter(g => !existingNames.has(g.name.toLowerCase()))];
    writeGroups(merged);
    return { ok: true, added: merged.length - existing.length };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('preview-groups', async (_, folderPath) => {
  const groups = readGroups();
  const ignore = readIgnoreList();
  const { sizeFilter } = readSettings();
  if (!groups.length) return [];
  const results = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      if (shouldIgnore(f.name, ignore)) continue;
      const fullPath = path.join(folderPath, f.name);
      if (shouldIgnoreSize(fullPath, sizeFilter)) continue;
      for (const g of groups) {
        if (filenameMatchesGroup(f.name, g.name)) { results.push({ name: f.name, group: g.name }); break; }
      }
    }
  } catch (e) {}
  return results;
});

ipcMain.handle('organize-groups', async (_, folderPath) => {
  const groups = readGroups();
  const ignore = readIgnoreList();
  const { sizeFilter } = readSettings();
  const moved = [], errors = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      if (shouldIgnore(f.name, ignore)) continue;
      const src = path.join(folderPath, f.name);
      if (shouldIgnoreSize(src, sizeFilter)) continue;
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
      appendSession({ id: Date.now(), timestamp: new Date().toISOString(), folder: folderPath, type: 'smart-group', moved: moved.map(m => ({ name: m.name, category: m.group, from: m.from, to: m.to })), errors, total: moved.length });
      const gNotif = formatOrganizeNotification(moved);
      if (gNotif) sendNotification(gNotif.title, `Grouped: ${gNotif.body}`);
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

// ── Sanitization helpers ─────────────────────────────────────────
function sanitizePath(p) {
  if (typeof p !== 'string') return '';
  // Remove characters dangerous in shell contexts
  return p.replace(/[&|;`$<>'"]/g, '');
}

function sanitizeTime(t) {
  if (typeof t !== 'string') return '09:00';
  return /^\d{2}:\d{2}$/.test(t) ? t : '09:00';
}

function sanitizeSections(sections) {
  const allowed = ['installers','junk','oldFiles','emptyFolders','duplicates'];
  if (!Array.isArray(sections)) return [];
  return sections.filter(s => allowed.includes(s));
}

function sanitizeDay(day) {
  const allowed = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  return allowed.includes(day) ? day : null;
}

// ── IPC: Schedule ─────────────────────────────────────────────────
ipcMain.handle('schedule', async (_, { days, time, folder }) => {
  const { exec } = require('child_process');
  const exePath = app.getPath('exe').replace(/\\/g, '\\\\');
  const safeFolder = sanitizePath(folder);
  const safeTime = sanitizeTime(time);
  const safeDays = (Array.isArray(days) ? days : []).map(sanitizeDay).filter(Boolean);
  const results = [];
  await new Promise(r => exec('schtasks /delete /tn "MojoFileOrganizer" /f', r));
  for (const day of safeDays) {
    const cmd = `schtasks /create /tn "MojoFileOrganizer_${day}" /tr "\\"${exePath}\\" --hidden --organize \\"${safeFolder}\\"" /sc weekly /d ${day} /st ${safeTime} /f`;
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


ipcMain.handle('schedule-cleanup', async (_, { days, time, folder, sections }) => {
  const { exec } = require('child_process');
  const exePath = app.getPath('exe').replace(/\\/g, '\\\\');
  const safeFolder = sanitizePath(folder);
  const safeTime = sanitizeTime(time);
  const safeDays = (Array.isArray(days) ? days : []).map(sanitizeDay).filter(Boolean);
  const safeSections = sanitizeSections(sections);
  const sectionsArg = safeSections.join(',');
  const results = [];
  await new Promise(r => exec('schtasks /delete /tn "MojoCleanup" /f', r));
  for (const day of safeDays) {
    const cmd = `schtasks /create /tn "MojoCleanup_${day}" /tr "\"${exePath}\" --hidden --cleanup \"${safeFolder}\" --sections ${sectionsArg}" /sc weekly /d ${day} /st ${safeTime} /f`;
    await new Promise((resolve) => {
      exec(cmd, (err, _, stderr) => { results.push(err ? { ok: false, msg: stderr } : { ok: true }); resolve(); });
    });
  }
  return results.every(r => r.ok) ? { ok: true } : { ok: false };
});

ipcMain.handle('unschedule-cleanup', async () => {
  const { exec } = require('child_process');
  const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  for (const day of days) {
    await new Promise(r => exec(`schtasks /delete /tn "MojoCleanup_${day}" /f`, r));
  }
  await new Promise(r => exec('schtasks /delete /tn "MojoCleanup" /f', r));
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

// ── Duplicate app detection ───────────────────────────────────────
function parseInstallerInfo(filename) {
  const ext  = path.extname(filename);
  const base = path.basename(filename, ext);
  // Extract version number (e.g. 3.0.20, 115.0, 2024.1.2)
  const versionMatch = base.match(/[\._\-\s]v?(\d+[\.\d]+\d)/i);
  const version = versionMatch ? versionMatch[1] : null;
  // Normalize app name: remove version, common suffixes, separators
  let appName = base
    .replace(/[\._\-\s]v?\d+[\.\d]*\d/gi, '')
    .replace(/[\._\-\s]?(setup|install|installer|x64|x86|x32|win|win64|win32|amd64|portable|full|offline)/gi, '')
    .replace(/[\._\-\s]+/g, ' ')
    .trim()
    .toLowerCase();
  return { appName, version, filename };
}

function compareVersions(a, b) {
  if (!a) return -1;
  if (!b) return 1;
  const pa = a.split('.').map(n => parseInt(n) || 0);
  const pb = b.split('.').map(n => parseInt(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function detectDuplicateApps(installers) {
  // Group by normalized app name
  const groups = {};
  for (const file of installers) {
    const { appName, version } = parseInstallerInfo(file.name);
    if (!appName) continue;
    if (!groups[appName]) groups[appName] = [];
    groups[appName].push({ ...file, version });
  }
  // Only keep groups with 2+ versions
  const duplicateGroups = [];
  for (const [appName, files] of Object.entries(groups)) {
    if (files.length < 2) continue;
    // Sort by version descending
    files.sort((a, b) => compareVersions(b.version, a.version));
    duplicateGroups.push({
      appName,
      keep: files[0],
      delete: files.slice(1)
    });
  }
  return duplicateGroups;
}

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
  const ignore = readIgnoreList();
  const installers = [], junk = [], emptyFolders = [];
  try {
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(folderPath, item.name);
      if (item.isDirectory()) {
        if (shouldIgnore(item.name, ignore)) continue;
        try {
          const contents = fs.readdirSync(fullPath);
          if (contents.length === 0) emptyFolders.push({ name: item.name, path: fullPath, size: 0 });
        } catch (e) {}
      } else {
        if (shouldIgnore(item.name, ignore)) continue;
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
    oldFiles: { files: oldFiles, totalSize: oldFiles.reduce((s, f) => s + f.size, 0) },
    duplicateApps: detectDuplicateApps(installers)
  };
});

ipcMain.handle('run-cleanup', async (_, { installers, junk, duplicates, emptyFolders, oldFiles, dupApps }) => {
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
  if (dupApps)    dupApps.forEach(deleteFile);
  if (emptyFolders) emptyFolders.forEach(deleteFolder);
  if (oldFiles) oldFiles.forEach(deleteFile);

  if (deleted.length > 0) sendNotification(`✓ Cleanup complete`, `${deleted.length} item${deleted.length !== 1 ? 's' : ''} removed`);
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

// ── IPC: File Explorer ────────────────────────────────────────────
ipcMain.handle('open-file-location', async (_, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('open-folder', async (_, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('undo-single-file', async (_, { sessionId, fileName, from, to }) => {
  try {
    if (fs.existsSync(to)) {
      fs.renameSync(to, from);
      const dir = path.dirname(to);
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);

      // Update the session log
      const sessions = readLog();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.moved = session.moved.filter(m => m.name !== fileName);
        session.total = session.moved.length;
        writeLog(sessions);
      }
      return { ok: true };
    }
    return { ok: false, error: 'File not found' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── IPC: Rules Engine ─────────────────────────────────────────────
function readRules() {
  try { if (fs.existsSync(RULES_FILE)) return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeRules(r) { fs.writeFileSync(RULES_FILE, JSON.stringify(r, null, 2)); }

ipcMain.handle('get-rules', async () => readRules());
ipcMain.handle('save-rules', async (_, rules) => { writeRules(rules); return true; });

ipcMain.handle('export-rules', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Rules',
    defaultPath: `mojo-rules-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePath) return { ok: false, cancelled: true };
  try {
    fs.writeFileSync(filePath, JSON.stringify({ rules: readRules(), exportedAt: new Date().toISOString() }, null, 2));
    return { ok: true, path: filePath };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('import-rules', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Rules',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (!filePaths?.length) return { ok: false, cancelled: true };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    const incoming = data.rules || (Array.isArray(data) ? data : null);
    if (!incoming) return { ok: false, error: 'Invalid rules file' };
    const existing = readRules();
    const existingNames = new Set(existing.map(r => r.name?.toLowerCase()));
    const merged = [...existing, ...incoming.filter(r => !existingNames.has(r.name?.toLowerCase()))];
    writeRules(merged);
    return { ok: true, added: merged.length - existing.length };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('preview-rules', async (_, { folderPath, rules }) => {
  const results = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      const fullPath = path.join(folderPath, f.name);
      let stat;
      try { stat = fs.statSync(fullPath); } catch (e) { continue; }
      const ext = path.extname(f.name).toLowerCase().replace('.', '');
      const ageDays = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
      const sizeBytes = stat.size;

      for (const rule of rules) {
        if (!rule.enabled) continue;
        const matched = evaluateRuleConditions(rule, { name: f.name, ext, ageDays, sizeBytes });
        if (!matched) continue;

        const preview = { file: f.name, rule: rule.name, action: rule.action.type };
        if (rule.action.type === 'move') preview.dest = rule.action.dest || '';
        if (rule.action.type === 'rename') {
          preview.newName = applyRenameRulesToFile(f.name, rule.action.renameRules || {});
        }
        results.push(preview);
        break;
      }
    }
  } catch (e) { return { ok: false, error: e.message, results: [] }; }
  return { ok: true, results };
});

ipcMain.handle('run-rules', async (_, { folderPath, rules }) => {
  const results = [];
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(f => f.isFile());
    for (const f of files) {
      const fullPath = path.join(folderPath, f.name);
      let stat;
      try { stat = fs.statSync(fullPath); } catch (e) { continue; }
      const ext = path.extname(f.name).toLowerCase().replace('.', '');
      const ageDays = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
      const sizeBytes = stat.size;

      for (const rule of rules) {
        if (!rule.enabled) continue;
        const matched = evaluateRuleConditions(rule, { name: f.name, ext, ageDays, sizeBytes });
        if (!matched) continue;

        const actionResult = { file: f.name, rule: rule.name, action: rule.action.type, ok: false };
        try {
          if (rule.action.type === 'delete') {
            await shell.trashItem(fullPath);
            actionResult.ok = true;
          } else if (rule.action.type === 'move' && rule.action.dest) {
            // Validate destination path - must be absolute and not contain traversal
            const dest = path.resolve(rule.action.dest);
            if (!path.isAbsolute(dest)) { actionResult.error = 'Invalid destination'; results.push(actionResult); break; }
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            const moveTo = path.join(dest, f.name);
            fs.renameSync(fullPath, moveTo);
            actionResult.ok = true; actionResult.dest = dest; actionResult.from = fullPath; actionResult.to = moveTo;
          } else if (rule.action.type === 'rename') {
            const newName = applyRenameRulesToFile(f.name, rule.action.renameRules || {});
            if (newName !== f.name) {
              const renameTo = path.join(folderPath, newName);
              fs.renameSync(fullPath, renameTo);
              actionResult.ok = true; actionResult.newName = newName; actionResult.from = fullPath; actionResult.to = renameTo;
            }
          }
        } catch (e) { actionResult.error = e.message; }
        results.push(actionResult);
        break;
      }
    }
  } catch (e) { return { ok: false, error: e.message, results: [] }; }
  const matchedResults = results.filter(r => r.ok);
  if (matchedResults.length) {
    appendSession({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      folder: folderPath,
      type: 'rules',
      results: matchedResults,
      total: matchedResults.length
    });
  }
  return { ok: true, results };
});

function evaluateRuleConditions(rule, file) {
  const logic = rule.logic || 'AND';
  const results = (rule.conditions || []).map(c => evaluateCondition(c, file));
  return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

function evaluateCondition(c, file) {
  const { field, op, value, unit } = c;
  switch (field) {
    case 'name':
      if (op === 'contains')     return file.name.toLowerCase().includes(String(value).toLowerCase());
      if (op === 'starts')       return file.name.toLowerCase().startsWith(String(value).toLowerCase());
      if (op === 'ends')         return file.name.toLowerCase().endsWith(String(value).toLowerCase());
      if (op === 'not_contains') return !file.name.toLowerCase().includes(String(value).toLowerCase());
      break;
    case 'extension':
      return file.ext.toLowerCase() === String(value).toLowerCase().replace('.', '');
    case 'age': {
      const days = unit === 'months' ? Number(value) * 30 : Number(value);
      return op === 'gt' ? file.ageDays > days : file.ageDays < days;
    }
    case 'size': {
      const bytes = unit === 'GB' ? Number(value) * 1073741824 : unit === 'MB' ? Number(value) * 1048576 : Number(value) * 1024;
      return op === 'gt' ? file.sizeBytes > bytes : file.sizeBytes < bytes;
    }
  }
  return false;
}

function applyRenameRulesToFile(filename, rules) {
  const ext = path.extname(filename);
  let name = path.basename(filename, ext);
  if (rules.datePrefix) name = `${new Date().toISOString().slice(0,10)}_${name}`;
  if (rules.dateSuffix) name = `${name}_${new Date().toISOString().slice(0,10)}`;
  if (rules.underscores) name = name.replace(/\s+/g, '_');
  if (rules.lowercase) name = name.toLowerCase();
  if (rules.removeSpecial) name = name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  return name + ext;
}

// ── IPC: Data Backup & Restore ────────────────────────────────────
ipcMain.handle('export-app-data', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Mojo Settings',
    defaultPath: `mojo-backup-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePath) return { ok: false, cancelled: true };
  try {
    const data = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: readSettings(),
      categories: (() => { try { return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8')); } catch { return null; } })(),
      groups: (() => { try { return JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8')); } catch { return null; } })(),
      ignoreList: (() => { try { return JSON.parse(fs.readFileSync(IGNORE_FILE, 'utf8')); } catch { return null; } })(),
      rules: (() => { try { return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch { return null; } })(),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { ok: true, path: filePath };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('import-app-data', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Mojo Settings',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (!filePaths?.length) return { ok: false, cancelled: true };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (!data.settings) return { ok: false, error: 'Invalid backup file' };
    writeSettings(data.settings);
    if (data.categories) fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(data.categories, null, 2));
    if (data.groups) fs.writeFileSync(GROUPS_FILE, JSON.stringify(data.groups, null, 2));
    if (data.ignoreList) fs.writeFileSync(IGNORE_FILE, JSON.stringify(data.ignoreList, null, 2));
    if (data.rules) fs.writeFileSync(RULES_FILE, JSON.stringify(data.rules, null, 2));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ── IPC: Context Menu ────────────────────────────────────────────
ipcMain.handle('register-context-menu', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const exePath = app.getPath('exe').replace(/\\/g, '\\\\');
    const label = 'Organize with Mojo';

    const cmds = [
      // Folder right-click
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\MojoOrganize" /ve /d "${label}" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\MojoOrganize" /v "Icon" /d "${exePath},0" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\MojoOrganize\\command" /ve /d "\\"${exePath}\\" --organize \\"%1\\"" /f`,
      // Folder background right-click
      `reg add "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MojoOrganize" /ve /d "${label}" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MojoOrganize" /v "Icon" /d "${exePath},0" /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MojoOrganize\\command" /ve /d "\\"${exePath}\\" --organize \\"%V\\"" /f`,
    ];

    let i = 0;
    const runNext = () => {
      if (i >= cmds.length) { resolve({ ok: true }); return; }
      exec(cmds[i++], (err) => { if (err) { resolve({ ok: false }); return; } runNext(); });
    };
    runNext();
  });
});

ipcMain.handle('unregister-context-menu', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const cmds = [
      `reg delete "HKCU\\Software\\Classes\\Directory\\shell\\MojoOrganize" /f`,
      `reg delete "HKCU\\Software\\Classes\\Directory\\Background\\shell\\MojoOrganize" /f`,
    ];
    let i = 0;
    const runNext = () => {
      if (i >= cmds.length) { resolve({ ok: true }); return; }
      exec(cmds[i++], () => runNext());
    };
    runNext();
  });
});

// ── IPC: Recycle Bin ─────────────────────────────────────────────
ipcMain.handle('open-recycle-bin', async () => {
  await shell.openPath('shell:RecycleBinFolder');
  return true;
});

ipcMain.handle('get-recycle-bin-size', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const cmd = `powershell -NoProfile -Command "$shell = New-Object -ComObject Shell.Application; $items = $shell.NameSpace(10).Items(); $size = ($items | Measure-Object -Property Size -Sum).Sum; $count = $items.Count; Write-Output ($size.ToString() + ' ' + $count.ToString())"`;
    exec(cmd, (err, stdout) => {
      if (err) { resolve({ ok: false, size: 0, count: 0 }); return; }
      const parts = stdout.trim().split(' ');
      const size = parseInt(parts[0]) || 0;
      const count = parseInt(parts[1]) || 0;
      resolve({ ok: true, size, count });
    });
  });
});

ipcMain.handle('empty-recycle-bin', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const tmpScript = path.join(os.tmpdir(), 'mojo_empty_recycle.ps1');
    const script = `
$code = @'
using System;
using System.Runtime.InteropServices;
public class RecycleBin {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  public static extern uint SHEmptyRecycleBin(IntPtr hwnd, string pszRootPath, uint dwFlags);
}
'@
Add-Type -TypeDefinition $code
[RecycleBin]::SHEmptyRecycleBin([IntPtr]::Zero, $null, 7)
`;
    fs.writeFileSync(tmpScript, script, 'utf8');
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`, (err) => {
      try { fs.unlinkSync(tmpScript); } catch (e) {}
      resolve({ ok: !err });
    });
  });
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
    // Use streaming to avoid loading large files into memory
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(65536); // 64KB chunks
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length)) > 0) {
      hash.update(buf.slice(0, bytesRead));
    }
    fs.closeSync(fd);
    return hash.digest('hex');
  } catch (e) { return null; }
}

ipcMain.handle('scan-duplicates', async (_, { folderPath, mode }) => {
  const ignore = readIgnoreList();
  const results = {};
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(f => f.isFile() && !shouldIgnore(f.name, ignore))
      .map(f => {
        const fullPath = path.join(folderPath, f.name);
        const stat = fs.statSync(fullPath);
        return { name: f.name, path: fullPath, size: stat.size, mtime: stat.mtimeMs };
      });

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
      results[key].push({ name: file.name, path: file.path, size: file.size, mtime: file.mtime });
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

        const ignore = readIgnoreList();
        if (shouldIgnore(filename, ignore)) return;

        const { sizeFilter } = readSettings();
        if (shouldIgnoreSize(filePath, sizeFilter)) return;

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
          moved: [{ name: filename, category: cat, from: filePath, to: dest }],
          errors: [],
          total: 1
        });
          sendNotification(`→ ${filename}`, `Moved to ${cat}`);
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

// ── IPC: File Preview ─────────────────────────────────────────────
const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.bmp','.webp','.avif','.ico','.tiff']);
const TEXT_EXTS  = new Set(['.txt','.md','.js','.ts','.py','.css','.html','.json','.xml','.yaml','.yml','.sh','.bat','.ps1','.java','.cpp','.c','.h','.cs','.go','.rb','.php','.sql','.log','.ini','.env','.rtf']);

ipcMain.handle('file-preview', async (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { type: 'missing' };
    const stat = fs.statSync(filePath);
    const ext  = path.extname(filePath).toLowerCase();
    const size = stat.size;

    if (IMAGE_EXTS.has(ext)) {
      if (size > 10 * 1024 * 1024) return { type: 'info', ext, size }; // skip >10MB
      const data = fs.readFileSync(filePath).toString('base64');
      const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { type: 'image', src: `data:${mime};base64,${data}`, size };
    }

    if (TEXT_EXTS.has(ext)) {
      const buf   = Buffer.alloc(2048);
      const fd    = fs.openSync(filePath, 'r');
      const bytes = fs.readSync(fd, buf, 0, 2048, 0);
      fs.closeSync(fd);
      const text  = buf.slice(0, bytes).toString('utf8');
      const lines = text.split('\n').slice(0, 10).join('\n');
      return { type: 'text', ext, lines, size };
    }

    return { type: 'info', ext, size };
  } catch (e) {
    return { type: 'error', message: e.message };
  }
});

ipcMain.handle('get-path-for-file', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isDirectory() ? filePath : path.dirname(filePath);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('recategorize-file', async (_, { sessionId, fileName, oldPath, newCategory, sessionFolder }) => {
  try {
    const destFolder = path.join(sessionFolder, newCategory);
    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
    const newPath = getUniqueDest(destFolder, fileName);

    if (!fs.existsSync(oldPath)) return { ok: false, error: 'File not found' };

    fs.renameSync(oldPath, newPath);

    const oldDir = path.dirname(oldPath);
    try {
      if (fs.existsSync(oldDir) && fs.readdirSync(oldDir).length === 0) fs.rmdirSync(oldDir);
    } catch (e) {}

    const sessions = readLog();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const file = session.moved.find(m => m.name === fileName && m.to === oldPath);
      if (file) {
        file.category = newCategory;
        file.to = newPath;
      }
      writeLog(sessions);
    }

    return { ok: true, newPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('get-watcher-status', async () => {
  return { active: !!activeWatcher, folder: watcherFolder };
});
