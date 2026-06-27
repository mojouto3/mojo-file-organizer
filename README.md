<div align="center">

<img src="assets/icon.ico" width="80" height="80" alt="Mojo File Organizer"/>

# Mojo File Organizer

**A modern, elegant file organizer desktop app for Windows**

[![Version](https://img.shields.io/badge/version-3.16.0-brightgreen?style=flat-square)](https://github.com/mojouto3/mojo-file-organizer/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](https://github.com/mojouto3/mojo-file-organizer/releases)
[![Electron](https://img.shields.io/badge/electron-42.x-47848F?style=flat-square)](https://electronjs.org)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Made by](https://img.shields.io/badge/made%20by-mojomultimedia-black?style=flat-square)](https://github.com/mojouto3)

[Download](#installation) · [Features](#features) · [Usage](#usage) · [Build from Source](#building-from-source)

---

![Mojo File Organizer Screenshot](assets/screenshot.png)

</div>

---

## What is Mojo File Organizer?

Mojo File Organizer is a free, open-source Windows desktop application that automatically sorts any folder into clean, organized subfolders with a single click.

Unlike basic file sorters, Mojo File Organizer gives you full control: customize your own categories, define which file extensions belong where, group files by client or store name, find and remove duplicates, clean up wasted disk space, monitor folders in real-time, and track statistics over time. All wrapped in a clean, modern interface with dark and light themes.

---

## Features

### Core
- One-click organize: select any folder and sort all files instantly
- Smart Preview: see exactly what will move and where, before committing
- Undo: instantly restore all moved files back to their original location
- Progress bar: real-time feedback showing which file is being moved

### Smart Group
- Group by store or client name: files matched by name regardless of separators or case
- Persistent groups: add your stores/clients once, remembered forever
- Unlimited groups: add as many as you need

### Duplicate Finder
- Scan by content: MD5 hash comparison finds identical files regardless of name
- Scan by name: finds files with the same filename
- Visual indicators: KEEP and DELETE badges for clear decision making
- Undo: restore deleted files instantly

### Cleanup Tab
- Scan any folder for wasted disk space
- Select All checkbox with total size calculation
- Five sections: Installers, Temp and Junk, Duplicate Files, Old Files, Empty Folders
- Old Files threshold: 3, 6, 12 months or a custom value
- Progress bar per section showing relative size
- Preview before deletion with styled in-app modal grouped by section
- Undo support: restore cleaned files instantly
- Folder size treemap: visual proportional blocks after scan with hover tooltips
- Smart suggestions based on session history at the top of the tab
- Scheduled cleanup via Windows Task Scheduler with selectable sections

### Duplicate App Version Detection
- Automatically detects older versions of the same installer during Cleanup scan
- Groups installers by app name, marks newest as KEEP and older ones as DELETE
- Appears as a dedicated section in the Cleanup tab

### Empty Recycle Bin
- Empty the Windows Recycle Bin directly from the Cleanup tab
- Shows current size and item count, disabled when empty
- Confirmation dialog before emptying

### Rename Rules
- Define optional rename rules applied automatically during Organize and Smart Group
- Rules: add date prefix, add date suffix, replace spaces with underscores, lowercase all, remove special characters
- Rules are composable and applied in order
- Live preview in Settings shows result before organizing

### File Rules Engine
- New Rules tab (Ctrl+8) with preset and custom rules for automating file actions
- 6 preset rules ready to enable with one click
- Custom rule builder: conditions (name, extension, age, size), logic (ALL/ANY), actions (move, delete, rename)
- Run rules on any folder with live results per file

### Batch Organize
- Organize multiple folders at once from the Organize tab
- Add folders one by one, click Organize All to process sequentially
- Live status per folder showing files moved or errors

### Undo Any Session
- Undo button on every session in History tab, not just the most recent
- Partial undo support: shows restored and not-found counts separately

### Windows Explorer Context Menu
- Right-click any folder in Windows Explorer to see "Organize with Mojo"
- No admin rights required (uses HKCU registry)
- Toggle in Settings > General
- Registry keys cleaned up automatically on uninstall

### Keyboard Shortcuts
- `Ctrl+1` through `Ctrl+8`: switch tabs instantly
- `Ctrl+O`: Organize Now
- `Ctrl+Z`: Undo
- `Ctrl+P`: Preview
- `Ctrl+F`: focus search or folder input
- `Esc`: close any open dialog
- `?`: show keyboard shortcuts help
- Click the `?` button in the titlebar to see all shortcuts at any time

### Folder Bookmarks
- Star icon to bookmark frequently used folders
- Available across Organize, Smart Group, Duplicates, Cleanup and Watcher tabs
- One click to load a bookmarked folder
- Bookmarks saved persistently and shared across all tabs

### Recent Folders
- Automatically tracks the last 5 folders used across all tabs
- Quick-select chips shown below the folder input
- Separate from manual Bookmarks, no setup needed

### Drag and Drop
- Drag a folder from File Explorer directly onto the app instead of using Browse
- Works across Organize, Smart Group, Duplicates, Cleanup and Watcher tabs
- Visual "Drop folder here" overlay while dragging over the drop zone

### File Watcher
- Real-time monitoring: watches a folder and auto-organizes new files as they arrive
- Activity log: see every file organized with timestamp and destination
- Windows notifications: get notified when files are auto-organized

### History and Stats
- Session history: every organize session saved with date, time, folder and file details
- Search: filter sessions in real time by folder name or filename
- Export: download any session as a .txt file with one click
- Open location and Undo this file actions for individual files within a session
- Open folder action to jump straight to the organized folder
- Drag and drop a file chip between category sections to recategorize it on disk
- Statistics dashboard: total files, sessions count, breakdown by category with chart
- Export to CSV: full session history as spreadsheet
- Export to PDF: professional statistics report with branding

### Appearance and Languages
- Dark and Light themes switchable in real time
- Eight preset accent colors plus custom color picker
- Active tab and accent elements follow the selected color throughout the app
- Five languages: English, Greek, German, Spanish, Russian
- Smooth tab transition animations

### File Preview on Hover
- Hover over any file chip in History to see a floating preview tooltip
- Images: rendered as thumbnail
- Text and code files: first lines shown in monospace
- Other file types: file icon, extension and size

### Ignore List
- Define folders and extensions to skip across all operations
- Applied to: Organize, Smart Group, Watcher, Cleanup and Duplicates
- Configurable from Settings with chip interface
- Default rules cover common system and development files

### Size Filter
- Set minimum and/or maximum file size thresholds with KB or MB selector
- Files outside the range are silently skipped during Organize and Smart Group
- Configurable from Settings > General (0 = disabled)

### Onboarding
- 5-step welcome tour shown automatically on first launch
- Covers core features, tools, customization, history and theme/language setup
- Reopenable from Settings > About & Updates

### Suggested Cleanup
- Smart suggestions appear at the top of the Cleanup tab based on session history
- Suggests re-organizing frequently used folders, deleting old installers, and viewing stats for busy categories
- Each suggestion is dismissable and stored in localStorage

### Settings and Customization
- Custom categories and extensions with category icons
- Enable/disable categories
- Default folder on startup
- Start with Windows
- Minimize to Tray
- Windows Explorer context menu toggle
- Auto-schedule organize with custom days and time
- Scheduled cleanup with selectable sections, days and time
- Rename rules with live preview
- Size filter with KB/MB selector
- Ignore List: skip specific folders and extensions from all operations
- Tray Quick Actions: organize without opening the app
- Tray tooltip shows quick stats (file count and size) for the default folder
- Check for Updates: click the version badge or use the button in Settings

---

## File Categories (Default)

| Category | File Types |
|---|---|
| Images | jpg, jpeg, png, gif, bmp, webp, svg, ico, tiff, heic, raw, avif |
| Videos | mp4, mkv, avi, mov, wmv, flv, webm, m4v, mpg, mpeg |
| Audio | mp3, wav, flac, aac, ogg, m4a, wma, opus, aiff |
| Documents | pdf, doc, docx, xls, xlsx, ppt, pptx, odt, txt, rtf, epub, mobi |
| Archives | zip, rar, 7z, tar, gz, bz2, xz, iso, dmg, cab |
| Code | py, js, ts, html, css, json, xml, yaml, sh, bat, ps1, java, cpp, cs, go, php, sql, md |
| Installers | exe, msi, msix, appx, apk, deb, rpm, pkg |
| Fonts | ttf, otf, woff, woff2, eot |
| Torrents | torrent |

All categories can be customized, enabled/disabled, or deleted from the Settings tab.

---

## Installation

### Option 1: Installer (Recommended)

1. Go to the [Releases](../../releases) page
2. Download the latest **`Mojo File Organizer Setup X.X.X.exe`**
3. Run the installer and follow the steps
4. A Mojo File Organizer shortcut will appear on your Desktop

### Option 2: Portable

Coming soon.

---

## Usage

### Organize Tab
1. Click Downloads to auto-detect your Downloads folder, or Browse to choose any folder
2. Review the Preview, files grouped by category with counts
3. Click Organize Now
4. Use Undo to reverse if needed

### Smart Group Tab
1. Add your store or client names (e.g. Nike, store1, ClientABC)
2. Select a folder
3. Preview which files match which group
4. Click Organize Now

### Cleanup Tab
1. Select a folder
2. Choose an Old Files threshold (3, 6, 12 months or custom)
3. Click Scan Folder
4. Review the treemap and sections to see how much space each category takes
5. Check or uncheck what you want to remove
6. Click Preview to see exactly what will be deleted
7. Click Clean Selected to remove
8. Use Undo to restore if needed

### Duplicates Tab
1. Select a folder
2. Click Scan by Content or Scan by Name
3. Review duplicates: first file is marked KEEP, others as DELETE
4. Select files to delete and click Delete Selected

### Watcher Tab
1. Select a folder to monitor
2. Click Start Watching
3. New files are automatically organized as they arrive

### Stats Tab
- View total files organized and breakdown by category
- Export to CSV or PDF with one click

### Settings Tab
- Appearance: switch Dark/Light theme and accent color
- Language: EN, GR, DE, ES, RU
- General: Default Folder, Start with Windows, Minimize to Tray, Windows Explorer context menu, Size Filter
- Auto-Schedule: organize automatically on chosen days and time
- Cleanup Schedule: run cleanup automatically with selectable sections
- Rename Rules: configure automatic file renaming with live preview
- Categories: customize extensions, add icons, enable/disable or create new ones
- Ignore List: add folders and extensions to skip during all operations
- About and Updates: click the version badge or use Check for Updates button, auto-downloads and installs new versions

### Keyboard Shortcuts
Press `?` or click the `?` button in the titlebar to see all shortcuts.

### Tray Quick Actions
Right-click the tray icon to organize without opening the app.

---

## Building from Source

### Requirements
- [Node.js](https://nodejs.org) v18 or later
- npm (included with Node.js)
- Windows

### Run in development

```bash
git clone https://github.com/mojouto3/mojo-file-organizer.git
cd mojo-file-organizer
npm install
npm start
```

### Build installer

Open PowerShell as Administrator:

```bash
npm run build
```

---

## Project Structure

```
mojo-file-organizer/
├── assets/icon.ico       # MFO app icon
├── main.js               # Electron main process
├── preload.js            # Secure bridge between main and renderer
├── renderer.js           # UI logic
├── index.html            # App layout and tabs
├── style.css             # Dark/light themes and components
├── translations.js       # UI strings for EN, GR, DE, ES, RU
└── package.json          # Config and build settings
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

---

## Roadmap

### v3.16
- [ ] Portable version (no installer needed)
- [ ] Windows Widget for quick stats

---

## Related Projects

- [downloads-organizer](https://github.com/mojouto3/downloads-organizer): Ultra-lightweight PowerShell version
- [downloads-organizer-v2](https://github.com/mojouto3/downloads-organizer-v2): Electron lite edition, Downloads folder only

---

## Contributing

Pull requests are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License, free to use, modify, and share. See [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ☕ by [mojomultimedia](https://github.com/mojouto3) · [Constantinos-T](https://github.com/Constantinos-T)

</div>
