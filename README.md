<div align="center">

<img src="assets/icon.ico" width="80" height="80" alt="Mojo File Organizer"/>

# Mojo File Organizer

**A modern, elegant file organizer desktop app for Windows**

[![Version](https://img.shields.io/badge/version-3.2.0-brightgreen?style=flat-square)](https://github.com/mojouto3/mojo-file-organizer/releases)
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

Unlike basic file sorters, Mojo File Organizer gives you **full control**: customize your own categories, define which file extensions belong where, group files by client or store name, find and remove duplicates, monitor folders in real-time, and track statistics over time - all wrapped in a clean, modern interface with dark and light themes.

---

## Features

### Core
- **One-click organize** ➔ select any folder and sort all files instantly
- **Smart Preview** ➔ see exactly what will move and where, before committing
- **Undo** ➔ instantly restore all moved files back to their original location
- **Progress bar** ➔ real-time feedback showing which file is being moved

### Smart Group
- **Group by store or client name** ➔ files matched by name regardless of separators (`.` `_` `-` `,` space) or case
- **Persistent groups** ➔ add your stores/clients once, remembered forever
- **Unlimited groups** ➔ add as many as you need, grow over time

### Duplicate Finder
- **Scan by content** ➔ MD5 hash comparison finds identical files regardless of name
- **Scan by name** ➔ finds files with the same filename
- **Visual indicators** ➔ KEEP and DELETE badges for clear decision making
- **Undo** ➔ restore deleted files instantly

### File Watcher
- **Real-time monitoring** ➔ watches a folder and auto-organizes new files as they arrive
- **Activity log** ➔ see every file organized with timestamp and destination
- **Windows notifications** ➔ get notified when files are auto-organized
- **Runs in background** ➔ keeps working even when minimized to tray

### History & Stats
- **Session history** ➔ every organize session saved with date, time, folder and file details
- **Expandable sessions** ➔ click any session to see exactly which files moved and where
- **Delete sessions** ➔ remove individual sessions or clear all history
- **Statistics dashboard** ➔ total files, sessions count, breakdown by category with chart
- **Export to CSV** ➔ full session history as spreadsheet
- **Export to PDF** ➔ professional statistics report with branding

### Appearance & Languages
- **Dark and Light themes** ➔ switchable in real time
- **8 preset accent colors** + custom color picker
- **5 languages** ➔ English, Greek, German, Spanish, Russian

### Settings & Customization
- **Custom categories** ➔ create your own file categories (e.g. "3D Models", "RAW Photos")
- **Custom extensions** ➔ add or remove file extensions from any category
- **Enable/disable categories** ➔ turn off categories you don't need
- **Reset to defaults** ➔ restore the original category configuration at any time
- **Default folder** ➔ auto-select a folder on startup
- **Start with Windows** ➔ launch automatically on startup
- **Minimize to Tray** ➔ keep running in background when closed
- **Auto-schedule** ➔ choose specific days and time for automatic organizing
- **Tray Quick Actions** ➔ organize without opening the app

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

> All categories can be customized, enabled/disabled, or deleted from the Settings tab.

---

## Installation

### Option 1 — Installer (Recommended)

1. Go to the [Releases](../../releases) page
2. Download the latest **`Mojo File Organizer Setup X.X.X.exe`**
3. Run the installer and follow the steps
4. A **Mojo File Organizer** shortcut will appear on your Desktop

### Option 2 — Portable

Coming soon.

---

## Usage

### Organize Tab
1. Click **Downloads** to auto-detect your Downloads folder, or **Browse** to choose any folder
2. Review the **Preview** ➔ files grouped by category with counts
3. Click **Organize Now**
4. Use **Undo** to reverse if needed

### Smart Group Tab
1. Add your store or client names (e.g. `Nike`, `store1`, `ClientABC`)
2. Select a folder
3. Preview which files match which group
4. Click **Organize Now** ➔ files go to their matching subfolder

> Files are matched regardless of separators or case:
> `logo_nike.jpg`, `NIKE-banner.png`, `nike.poster.mp4` → all go to `Nike/`

### Duplicates Tab
1. Select a folder
2. Click **Scan by Content** (identical files) or **Scan by Name** (same filename)
3. Review duplicates ➔ first file is marked **KEEP**, others as **DELETE**
4. Select files to delete and click **Delete Selected**
5. Use **Undo** to restore if needed

### Watcher Tab
1. Select a folder to monitor
2. Click **Start Watching**
3. New files dropped into the folder are automatically organized
4. Check the Activity Log to see what was moved

### History Tab
- View all past sessions with date, time and folder
- Click any session to expand and see file details
- Delete individual sessions or clear all history

### Stats Tab
- Total files organized across all sessions
- Bar chart breakdown by category
- Export to **CSV** or **PDF** with one click

### Settings Tab
- **Appearance** ➔ switch Dark/Light theme and accent color
- **Language** ➔ EN, GR, DE, ES, RU
- **Default Folder** ➔ auto-select on startup
- **Start with Windows** ➔ launch automatically
- **Minimize to Tray** ➔ keep running in background
- **Auto-Schedule** ➔ choose days and time for automatic runs
- **Categories** ➔ customize extensions or create new categories

### Tray Quick Actions
Right-click the tray icon to:
- **Organize Downloads** ➔ instantly organizes your Downloads folder
- **Organize Last Folder** ➔ organizes your default folder
- **Open** ➔ bring the app to focus
- **Quit** ➔ exit completely

---

## Building from Source

### Requirements
- [Node.js](https://nodejs.org) v18 or later
- npm (included with Node.js)
- Windows (for building the installer)

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

The installer will be created at `dist/Mojo File Organizer Setup X.X.X.exe`.

---

## Project Structure

```
mojo-file-organizer/
├── assets/
│   └── icon.ico              # MFO app icon
├── main.js                   # Electron main process — file ops, IPC, scheduling, tray
├── preload.js                # Secure bridge between main and renderer
├── renderer.js               # UI logic — all tab interactions
├── index.html                # App layout and tab structure
├── style.css                 # Dark/light themes, tabs, components
├── translations.js           # All UI strings for EN, GR, DE, ES, RU
└── package.json              # Project config and electron-builder settings
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

---

## Roadmap

- [ ] Portable version (no installer needed)
- [ ] French, Italian translations
- [ ] Folder size analyzer
- [ ] Cloud backup integration

---

## Related Projects

- [downloads-organizer](https://github.com/mojouto3/downloads-organizer) — Ultra-lightweight PowerShell version
- [downloads-organizer-v2](https://github.com/mojouto3/downloads-organizer-v2) — Electron lite edition, Downloads folder only

---

## Contributing

Pull requests are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License — free to use, modify, and share. See [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ☕ by [mojomultimedia](https://github.com/mojouto3) · [Constantinos-T](https://github.com/Constantinos-T)

</div>
