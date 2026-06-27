# Changelog

All notable changes to Mojo File Organizer are documented here.

---

## [3.16.3] - 2026-06-27

### Fixed
- Suggestions: View Stats button now correctly opens the Stats tab

---

## [3.16.2] - 2026-06-26

### Fixed
- Auto-updater: restored v3.12.0 working implementation - download progress bar and Restart & Update button work correctly again

---

## [3.16.1] - 2026-06-26

### Fixed
- Auto-updater: Download Update button now works correctly when update is found on startup

---

## [3.16.0] - 2026-06-26

### Added
- Settings backup and restore: export all settings, categories, groups, ignore list and rules to JSON, and import from backup file
- History date range filter: From/To date inputs next to search box with clear button
- Duplicates smart suggestion: suggests which file to keep based on modification date, shows date next to each file
- Smart Group import/export: export groups to JSON, import and merge from file

---

## [3.15.2] - 2026-06-26

### Fixed
- Auto-updater: Download Update button now works correctly
- Auto-updater: progress bar shows during download
- Auto-updater: Restart & Update button appears after download completes

---

## [3.15.1] - 2026-06-26

### Fixed
- Update checker: dev mode now uses GitHub API directly instead of autoUpdater (which only works in production)
- Update checker: fallback to GitHub API when autoUpdater fails in production
- Update banner: no longer shows when user is already on the latest version
- Rules engine: destination path validation prevents path traversal attacks
- File preview: XSS protection on image src attribute

---

## [3.15.0] - 2026-06-26

### Added
- File Rules Engine: new Rules tab with preset and custom rules for automating file actions.
- Preset rules: 6 ready-to-use rules (delete old installers, clean temp files, archive large videos, organize old downloads, remove old backups, archive old documents).
- Custom rule builder: define conditions (name, extension, age, size), logic (ALL/ANY), and actions (move, delete, rename).
- Run Rules: select any folder and run all active rules with live results per file.
- Undo any session from History tab: each session now has an undo button, not just the most recent.
- Batch organize: organize multiple folders at once from the Organize tab.
- Improved tray menu: quick organize Downloads/Last Folder, direct links to History, Cleanup and Stats tabs.

### Changed
- Keyboard shortcuts: Ctrl+8 now opens Rules tab, Ctrl+9 opens Settings.

---

## [3.14.1] - 2026-06-26

### Changed
- Tray menu: header now shows total files organized count
- Tray menu: quick Organize Downloads action
- Tray menu: quick Organize Last Used Folder action
- Tray menu: direct links to History, Cleanup and Stats tabs

---

## [3.14.0] - 2026-06-26

### Changed
- Onboarding tour expanded from 5 to 7 steps
- Step 3: Rename rules replaces Auto-schedule
- New Step 4: Smart features (cleanup suggestions, duplicate app versions, auto-updater)
- New Step 5: Built for power users (keyboard shortcuts, Explorer context menu, ? button)
- Step 6: Track everything (previously Step 4)
- Step 7: Make it yours (previously Step 5)

---

## [3.13.1] - 2026-06-26

### Fixed
- Keyboard shortcuts: Ctrl+1-8 now call correct showTab() function
- Keyboard shortcuts: Ctrl+2 now correctly opens Smart Group tab
- Keyboard shortcuts: Ctrl+O calls organize() directly instead of querySelector
- Keyboard shortcuts: Ctrl+P calls showPreview() directly instead of querySelector
- Keyboard shortcuts: Ctrl+F block scope issue fixed
- Keyboard shortcuts: Ctrl+O and Ctrl+P show toast if no folder selected

### Changed
- Notifications: Organize now shows file count with category breakdown
- Notifications: Smart Group shows grouped file breakdown
- Notifications: Cleanup shows items removed, silent if 0 items
- Notifications: Scheduled cleanup shows friendlier message
- Notifications: Watcher shows filename and destination category

---

## [3.13.0] - 2026-06-26

### Fixed
- Light theme: toggle off state now has distinct grey background with white knob
- Light theme: Disable/danger buttons use subtle red styling instead of aggressive outline
- Light theme: keyboard shortcut chips look like actual keys (white background, shadow)
- Light theme: day pills and section check pills consistent styling
- Light theme: card and session hover shadows more subtle

---

## [3.12.1] - 2026-06-25

### Fixed
- Keyboard shortcuts: Ctrl+2 now correctly opens Smart Group tab
- Keyboard shortcuts: Ctrl+O and Ctrl+P fixed (JavaScript syntax error with const in switch/case)
- Keyboard shortcuts: Ctrl+O and Ctrl+P now switch to Organize tab first and show toast if no folder selected
- Security: URL validation in open-release-page (only github.com URLs accepted)
- Security: Command injection protection in schtasks handlers via sanitization helpers
- Security: save-settings now validates and whitelists allowed keys
- Performance: hashFile now streams in 64KB chunks instead of loading entire file into RAM
- Performance: ipcRenderer.on listeners use removeAllListeners to prevent accumulation
- Dependencies: updated undici to patch 2 high severity vulnerabilities

### Added
- Auto-updater: banner with Download Update button when new version available
- Auto-updater: real-time download progress with percentage
- Auto-updater: Restart & Update button after download completes

### Changed
- Organize tab: interactive empty state with folder icon, hint and shortcut chips
- Toggle switches: off state visually distinct from radio buttons
- Stats tab: per-category colors and percentages on bars
- Cleanup treemap: dark gradient overlay on blocks
- Cleanup scheduled pills: proper selected/unselected visual states

---

## [3.12.0] - 2026-06-25

### Added
- Auto-updater: when a new version is released, a banner appears automatically with a "Download Update" button. Shows real-time download progress with percentage. After download completes, a "Restart & Update" button installs the new version automatically on restart. No manual download needed.

### Changed
- npm run release now publishes installer and latest.yml to GitHub Releases for auto-update support.

---

## [3.11.0] - 2026-06-25

### Added
- Windows Explorer context menu: right-click any folder to see "Organize with Mojo". Uses HKCU registry — no admin rights required. Toggle in Settings > General. Registry keys removed automatically on uninstall via NSIS script.
- Keyboard shortcuts: Ctrl+1-8 (switch tabs), Ctrl+O (organize), Ctrl+Z (undo), Ctrl+P (preview), Ctrl+F (focus search), Esc (close dialog), ? (show shortcuts help).
- Keyboard shortcuts help modal: press ? or click the ? button in the titlebar to see all shortcuts at any time.
- History search: filter sessions in real time by folder name or filename.
- Export session: download any organize session as a formatted .txt file with one click.
- Version badge is now clickable and shows a toast: checking, up to date, or new version available.
- Recycle Bin card now shows item count alongside size (e.g. 2.4 MB - 15 items).

### Fixed
- Cleanup treemap legend now shows correct translated labels (Installers, Duplicate Files etc.) instead of raw translation keys.
- Organize preview count and label now appear on the same line (e.g. "3 files") instead of stacked.
- XSS prevention: all filenames sanitized with HTML escaping before inserting into innerHTML.

### Changed
- Tab switch now has a subtle fade and slide animation.
- Drag and drop drop zone now shows a "Drop folder here" visual overlay while dragging.
- Reset button in Categories now uses subtle neutral styling with accent color on hover only.

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
- Replaced all remaining hardcoded English/Greek string ternaries with tr() — app is now fully translated in all 5 languages across every scenario.
- Size filter now supports KB and MB units via a dropdown selector instead of plain KB only.

### Changed
- Update banner now slides in with animation and uses accent color border.
- Empty states across all tabs now fade in when they appear.
- Settings accordion cards show green glow border on hover and while open.

---

## [3.8.1] - 2026-06-23

### Fixed
- Cleanup Preview: replaced native browser alert() dialog with a styled in-app modal matching the app theme, grouped by section with file names and sizes.

---

## [3.8.0] - 2026-06-23

### Added
- Size filter: set minimum and/or maximum file size thresholds to skip files outside the range during Organize and Smart Group operations, configurable from Settings > General.
- Onboarding screen: 5-step welcome tour shown automatically on first launch, covering core features, tools, customization, history and theme/language setup. Reopenable from Settings > About & Updates.
- Scheduled cleanup: automatic cleanup operations via Windows Task Scheduler, with selectable sections (Installers, Temp/Junk, Old Files, Empty Folders), folder, days and time.

---

## [3.7.0] - 2026-06-22

### Added
- Check for Updates: automatic silent check on startup, manual button in Settings, update banner when a newer version is available, opens GitHub release page in browser.
- File preview on hover: hover over any file chip in History to see a floating preview tooltip with image thumbnails, first lines of text and code files, or file type and size for other formats.
- Ignore List: define folders and file extensions to skip across all operations (Organize, Smart Group, Watcher, Cleanup, Duplicates), configurable from Settings with chip interface and reset to defaults.
- Empty states: all tabs now show a friendly icon, message and hint when there is no content to display.
- Settings accordion: all Settings cards are now collapsible with chevron indicator, Appearance expanded by default, state persists across sessions.
- Custom confirm dialogs: all native browser confirm() dialogs replaced with styled in-app modals, fully translated in all 5 languages.

### Fixed
- Filename conflict on organize: conflicting files now use Windows-style suffix (2), (3) instead of _1, _2.

### Changed
- Settings tab hover highlight now covers the full tab width with accent color tint.

---

## [3.6.1] - 2026-06-21

### Fixed
- Removed duplicate IPC handler causing a JavaScript error on startup.

---

## [3.6.0] - 2026-06-21

### Added
- Quick Stats in Tray: tooltip shows file count and total size of the default folder, refreshed every 60 seconds and after every action.
- Recent Folders: automatically tracks the last 5 folders used across all tabs, shown as quick-select chips.
- Drag and Drop folder selection: drag a folder from File Explorer directly onto the app.
- Enhanced History: Open location and Undo this file actions for individual files within a session.
- Open folder action on each session to jump to the organized folder.
- Drag and Drop to recategorize: drag a file chip between category sections in History to move it on disk.

---

## [3.5.0] - 2026-06-20

### Added
- Titlebar and tabbar redesigned with subtle gradients and depth.
- Active tab indicator now follows the selected accent color.
- Theme toggle redesigned as a smooth pill switch.
- Page transitions, card hover lift, refined toast notifications, and button press feedback.

### Fixed
- Accent color picker now shows a checkmark only on the selected color.
- Light theme rules implemented across all tabs.

---

## [3.4.0] - 2026-06-16

### Added
- Folder Bookmarks across Organize, Smart Group, Duplicates, Cleanup and Watcher tabs.
- Star icon to bookmark frequently used folders with one click.
- Bookmarks saved persistently and shared across all tabs.
- File Age Cleanup in the Cleanup tab.
- Old Files threshold selector: 3, 6, 12 months or custom value.
- Old Files fully integrated with Select All, Preview, Clean Selected and Undo.

---

## [3.3.0] - 2026-06-12

### Added
- Cleanup tab with folder size analyzer and smart cleanup.
- Scan any folder for wasted disk space.
- Select All checkbox with total size calculation.
- Four cleanup sections: Installers, Temp and Junk, Duplicate Files, Empty Folders.
- Progress bar per section showing relative size.
- Preview before deletion.
- Undo support for cleanup operations.
- Windows notification after cleanup completes.

---

## [3.2.1] - 2026-06-08

### Fixed
- Accent color not updating correctly in dark mode.
- Accent color selection indicator showing on multiple dots simultaneously.
- Light mode titlebar and tabbar now display correctly.

---

## [3.2.0] - 2026-06-07

### Added
- Duplicate Finder tab with scan by content (MD5) and scan by name.
- KEEP and DELETE visual indicators for duplicate files.
- File Watcher tab for real-time folder monitoring.
- Auto-organize new files as they arrive.
- Dark and Light themes switchable in real time.
- Eight preset accent colors plus custom color picker.
- Multilingual support: German, Spanish and Russian added (now EN, GR, DE, ES, RU).
- Export Stats to CSV and PDF.
- Tray Quick Actions: Organize Downloads and Organize Last Folder from system tray.
- Windows notifications for tray actions and file watcher events.

---

## [3.1.0] - 2026-06-05

### Added
- Built-in Log Viewer replaced plain text log.
- Session history with expandable details per session.
- Delete individual sessions or clear all history.
- Smart Group tab for grouping files by store or client name.
- Persistent groups saved permanently.
- Files matched regardless of separators and case.
- Auto-Schedule with custom days and time selection.
- Minimize to Tray option.
- Start with Windows option.
- Default folder on startup.
- Statistics dashboard with bar chart.

---

## [3.0.0] - 2026-06-03

### Added
- Initial release as Mojo File Organizer.
- Complete rewrite with modern Electron GUI.
- Horizontal tab navigation with Lucide icons.
- Organize any folder by file type with smart preview.
- Custom MFO icon and dark theme.
- Greek and English language support.
- Progress bar during organize.
- Undo support.
- Session history.
- Custom categories and extensions in Settings.
- Auto-schedule via Windows Task Scheduler.

---

## Previous versions

See the lite edition at [downloads-organizer-v2](https://github.com/mojouto3/downloads-organizer-v2) for v2.x history and [downloads-organizer](https://github.com/mojouto3/downloads-organizer) for v1.x history.
