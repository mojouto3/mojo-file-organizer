const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

let mainWindow;
let tray = null;

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

// ── Tray ──────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  tray = new Tray(iconPath);
  tray.setToolTip('Mojo File Organizer');
  updateTrayMenu();
  tray.on('double-click', () => showWindow());
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
app.on('before-quit', () => { app.isQuitting = true; });

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

// ── IPC: Settings ─────────────────────────────────────────────────
ipcMain.handle('get-settings', async () => readSettings());
ipcMain.handle('save-settings', async (_, s) => {
  writeSettings(s);
  applyStartWithWindows(s.startWithWindows);
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
