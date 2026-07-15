# Changelog

All notable changes to Mojo File Organizer are documented here.

---

## [3.25.0] - 2026-07-15

### Added
- Tab bar: active tab now shows pill highlight with accent color instead of underline, making the current section immediately obvious
- Recent folder chips in Run Rules tab, consistent with all other tabs
- Scroll reset to top when switching tabs

### Fixed
- Organize All button was missing from single folder mode
- Batch folder mode HTML rendering issue
- Date inputs in Activity tab were stretching too wide
- Internal view buttons (Organize|Schedule|Batch, Scan|Schedule, Run|My Rules|Templates, Sessions|Stats) now use a neutral active state so they don't compete visually with the main tab highlight
- Input, recent chips, and action buttons now aligned to the same left edge across all tabs
- "Stores / Clients" label renamed to "Groups" for generality
- "Mojo" changed to "MFO" in the Organize empty state hint

---

## [3.24.0] - 2026-07-14

### Added
- Tab grouping: subtle dividers separate Daily (Organize, Duplicates, Cleanup), Automate (Rules, Watcher, Smart Group), and Review (Activity) tab groups
- Activity tab: merged History and Stats into one tab with Sessions/Stats toggle in the card header
- Organize tab: Organize, Schedule, and Batch as internal views
- Cleanup tab: Scan and Schedule as internal views
- Rules tab: Run, My Rules, and Templates as internal views
- Schedule: moved from Settings to each tab's own view (Organize, Cleanup, Rules)
- Settings: replaced accordion stack with sidebar navigation (Appearance, General, Categories, Rename, Ignore List, Backup, Notifications, About)
- Icon-only secondary buttons in Rules card header with dividers grouping related actions
- Folder input: path uses direction:rtl so the last segment is always visible

### Fixed
- Window default width increased to 1100px (min 1000px) so Settings tab is never cut off on launch
- Button consistency across all tabs
- Empty states unified pattern across all tabs

---

## [3.23.0] - 2026-07-09

### Added
- File Watcher: "Also run Rules" toggle to apply enabled Rules to new files before category organize
- Onboarding tour: new step covering the File Rules Engine (tour is now 8 steps)
- Rules tab: improved empty state with Add Rule and Browse Templates buttons
- Rules tab: Backup button in the card header for quick full backup
- Settings: export and import descriptions now explicitly mention Rules
- Cleanup tab: Ctrl+Shift+S keyboard shortcut for Scan Folder

### Fixed
- Rules move action no longer silently overwrites existing files at destination — conflicting files are automatically renamed with a suffix (e.g. filename_1.ext)
- Preview mode now shows a red "conflict" badge when a destination file already exists
- File Watcher Start Watching button was not visible due to inline style conflict with hidden class

---

## [3.22.0] - 2026-07-07

### Added
- Rules tab: Rule Templates library with 4 ready-made rule sets (Downloads Cleanup, Developer Workspace, Photo Organizer, Old Files Archiver)
- Rules tab: file content condition, match text files containing a keyword
- Rules tab: date range condition, match files modified between two dates
- Rules tab: global dry-run mode, Run Rules shows preview first and requires confirmation
- Rules tab: drag and drop to reorder rules
- Rules tab: search/filter rules by name (shown when 4 or more rules exist)
- Rules tab: multi-folder support, run rules on multiple folders at once
- Rules tab: last run timestamp and recent folder chips below the folder input
- Rules tab: notifications history log in Settings tab
- History tab: compact mode for denser single-line session view
- History tab: notes on sessions, editable inline
- Tray menu: Run Rules on Downloads and Run Rules on Last Folder quick actions

---

## [3.21.0] - 2026-07-04

### Added
- Rules tab: bulk enable/disable all rules at once with All On / All Off buttons
- Rules tab: keyboard shortcuts Ctrl+R (Run Rules) and Ctrl+Shift+P (Preview Rules)
- Rules tab: Run Rules with Mojo option in Windows Explorer context menu
- History tab: session count badge on the tab icon showing new sessions since last visit
- Stats tab: dedicated Rules section with total files processed, sessions count, and breakdown by action type

### Fixed
- schtasks path escaping in Organize and Cleanup scheduling, fixes failure when app is installed in a path with spaces
- Stats tab crash when Rules sessions were present in the log

---

## [3.20.0] - 2026-07-03

### Added
- Rules tab: progress indicator and disabled buttons during a run to prevent double-clicks
- Rules tab: warning when multiple enabled rules match the same file, shown in both Preview and Run Rules results
- Rules tab: scheduling support, run all enabled rules automatically on selected days and time
- History tab: session type filter chips (All, Organize, Rules, Smart Group, Watcher)
- Settings tab: Rules Schedule card, same pattern as Cleanup Schedule

### Fixed
- History tab: session badge now correctly shows "1 file" instead of "1 files" for single-file Rules sessions

---

## [3.19.0] - 2026-07-01

### Added
- File Rules Engine: create custom rules to move, copy, rename, or delete files based on conditions (name, extension, size, age)
- Rules tab: 6 built-in preset rules ready to enable with one click
- Rules tab: run rules on a selected folder with Preview and Run Rules buttons
- Rules tab: per-rule enable/disable toggle and edit/delete actions
- Rules tab: keyboard shortcut Ctrl+5 to jump to Rules tab
- Onboarding tour: updated to 7 steps, added Rules Engine step

---

## [3.18.0] - 2026-06-28

### Added
- Portable mode: app can run from a USB drive or any folder without installation, data stored next to the executable
- Settings: Backup and Restore — export all settings, categories, groups, and rules to a JSON file and import them back
- History tab: date range filter to show sessions between two dates

---

## [3.17.0] - 2026-06-24

### Added
- Smart Group: import and export group configurations as JSON
- Rename Rules: 5 automatic rename rules applied during Organize and Smart Group (date prefix/suffix, underscores, lowercase, remove special chars) with live preview
- Ignore List: ignored extensions and folders are now shown as removable chips
- Settings: reset Ignore List to defaults button

---

## [3.16.0] - 2026-06-20

### Added
- File Watcher: monitor a folder in real-time and automatically organize new files as they arrive
- Tray menu: Start Watcher and Stop Watcher quick actions

---

## [3.15.0] - 2026-06-17

### Added
- Cleanup tab: Suggested Cleanup card with quick-action buttons for common cleanup tasks
- Cleanup tab: treemap visualization showing disk usage by file type
- Cleanup tab: scheduled cleanup, run automatically on selected days and time

---
