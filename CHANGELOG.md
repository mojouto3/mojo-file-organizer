# Changelog

All notable changes to Mojo File Organizer are documented here.

---

## [3.10.0] - 2026-06-24

### Added
- Duplicate app version detection: the Cleanup tab automatically detects older versions of the same installer. Groups installers by app name, marks the newest as KEEP and older ones as DELETE. Integrated with Select All, Clean Selected and Undo.
- Suggested cleanup: smart suggestions appear at the top of the Cleanup tab based on session history. Three suggestion types: frequently organized folders, old installers that may be safe to delete, and categories with high file counts. Each suggestion is dismissable and persisted in localStorage.
- Empty Recycle Bin: users can now empty the Windows Recycle Bin directly from the Cleanup tab. Shows current size, button disabled when empty, confirmation dialog before emptying. Uses Windows Shell API via temp PowerShell script.

---

## [3.9.0] - 2026-06-24

### Added
- Rename rules: define optional rename rules applied automatically during Organize and Smart Group. Available rules: add date prefix, add date suffix, replace spaces with underscores, lowercase all, remove special characters. Rules are composable and applied in order. Live preview in Settings shows result before organizing.
- Folder size treemap: visual treemap in the Cleanup tab after every scan showing disk usage per category. Proportional blocks with hover tooltips showing name, size and percentage. Click a block to scroll to the corresponding cleanup section.
- Category icons in Settings: each category row now shows a relevant icon with accent color hover effect.

---

## [3.8.2] - 2026-06-24

### Fixed
- Replaced all remaining hardcoded English/Greek string ternaries with tr() — app is now fully translated in all 5 languages across every scenario
- Size filter now supports KB and MB units via a dropdown selector instead of plain KB only

### Changed
- Update banner now slides in with animation and uses accent color border
- Empty states across all tabs now fade in when they appear
- Settings accordion cards show green glow border on hover and while open

---

## [3.8.1] - 2026-06-23

### Fixed
- Cleanup Preview: replaced native browser alert() dialog with a styled in-app modal matching the app theme, grouped by section with file names and sizes

---

## [3.8.0] - 2026-06-23

### Added
- Size filter: set minimum and/or maximum file size thresholds to skip files outside the range during Organize and Smart Group operations, configurable from Settings > General
- Onboarding screen: 5-step welcome tour shown automatically on first launch, covering core features, tools, customization, history and theme/language setup. Reopenable from Settings > About & Updates
- Scheduled cleanup: automatic cleanup operations via Windows Task Scheduler, with selectable sections (Installers, Temp/Junk, Old Files, Empty Folders), folder, days and time

---

## [3.7.0] - 2026-06-22

### Added
- Check for Updates: automatic silent check on startup, manual button in Settings, update banner when a newer version is available, opens GitHub release page in browser
- File preview on hover: hover over any file chip in History to see a floating preview tooltip with image thumbnails, first lines of text and code files, or file type and size for other formats
- Ignore List: define folders and file extensions to skip across all operations (Organize, Smart Group, Watcher, Cleanup, Duplicates), configurable from Settings with chip interface and reset to defaults
- Empty states: all tabs now show a friendly icon, message and hint when there is no content to display (History, Stats, Duplicates, Cleanup, Watcher)
- Settings accordion: all Settings cards are now collapsible with chevron indicator, Appearance expanded by default, state persists across sessions
- Custom confirm dialogs: all native browser confirm() dialogs replaced with styled in-app modals matching the app theme, fully translated in all 5 languages

### Fixed
- Filename conflict on organize: conflicting files now use Windows-style suffix (2), (3) instead of _1, _2

### Changed
- Settings tab hover highlight now covers the full tab width with accent color tint
- Reset button in Categories uses accent color outline for better visibility

---

## [3.6.1] - 2026-06-21

### Fixed
- Removed duplicate IPC handler causing a JavaScript error on startup

---

## [3.6.0] - 2026-06-21

### Added
- Quick Stats in Tray: tooltip shows file count and total size of the default folder, refreshed automatically every 60 seconds and after every action
- Recent Folders: automatically tracks the last 5 folders used across all tabs, shown as quick-select chips
- Drag and Drop folder selection: drag a folder from File Explorer directly onto the app
- Enhanced History: Open location and Undo this file actions for individual files within a session
- Open folder action on each session to jump to the organized folder
- Drag and Drop to recategorize: drag a file chip between category sections in History to move it on disk and update the session log

---

## [3.5.0] - 2026-06-20

### Added
- Titlebar and tabbar redesigned with subtle gradients and depth
- Active tab indicator now follows the selected accent color instead of a hardcoded green
- Theme toggle redesigned as a smooth pill switch with gradient active state
- Page transitions, card hover lift, refined toast notifications, and button press feedback

### Fixed
- Accent color picker now shows a checkmark only on the selected color
- Light theme rules implemented across all tabs (previously incomplete)

---

## [3.4.0] - 2026-06-16

### Added
- Folder Bookmarks across Organize, Smart Group, Duplicates, Cleanup and Watcher tabs
- Star icon to bookmark frequently used folders with one click
- Bookmarks saved persistently and shared across all tabs
- File Age Cleanup in the Cleanup tab
- Old Files threshold selector: 3, 6, 12 months or custom value
- Old Files fully integrated with Select All, Preview, Clean Selected and Undo

---

## [3.3.0] - 2026-06-12

### Added
- Cleanup tab with folder size analyzer and smart cleanup
- Scan any folder for wasted disk space
- Select All checkbox with total size calculation
- Four cleanup sections: Installers, Temp and Junk, Duplicate Files, Empty Folders
- Progress bar per section showing relative size
- Preview before deletion
- Undo support for cleanup operations
- Windows notification after cleanup completes

---

## [3.2.1] - 2026-06-08

### Fixed
- Accent color not updating correctly in dark mode
- Accent color selection indicator showing on multiple dots simultaneously
- Light mode titlebar and tabbar now display correctly

---

## [3.2.0] - 2026-06-07

### Added
- Duplicate Finder tab with scan by content (MD5) and scan by name
- KEEP and DELETE visual indicators for duplicate files
- File Watcher tab for real-time folder monitoring
- Auto-organize new files as they arrive
- Dark and Light themes switchable in real time
- Eight preset accent colors plus custom color picker
- Multilingual support: German, Spanish and Russian added (now EN, GR, DE, ES, RU)
- Export Stats to CSV and PDF
- Tray Quick Actions: Organize Downloads and Organize Last Folder from system tray
- Windows notifications for tray actions and file watcher events

---

## [3.1.0] - 2026-06-05

### Added
- Built-in Log Viewer replaced plain text log
- Session history with expandable details per session
- Delete individual sessions or clear all history
- Smart Group tab for grouping files by store or client name
- Persistent groups saved permanently
- Files matched regardless of separators and case
- Auto-Schedule with custom days and time selection
- Minimize to Tray option
- Start with Windows option
- Default folder on startup
- Statistics dashboard with bar chart

---

## [3.0.0] - 2026-06-03

### Added
- Initial release as Mojo File Organizer
- Complete rewrite with modern Electron GUI
- Horizontal tab navigation with Lucide icons
- Organize any folder by file type with smart preview
- Custom MFO icon and dark theme
- Greek and English language support
- Progress bar during organize
- Undo support
- Session history
- Custom categories and extensions in Settings
- Auto-schedule via Windows Task Scheduler

---

## Previous versions

See the lite edition at [downloads-organizer-v2](https://github.com/mojouto3/downloads-organizer-v2) for v2.x history and [downloads-organizer](https://github.com/mojouto3/downloads-organizer) for v1.x history.
