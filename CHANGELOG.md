# Changelog

All notable changes to Mojo File Organizer are documented here.

---

## [4.0.0] - 2026-08-12

### Changed
- Full rewrite of the app's interface on React, Tailwind, and Framer Motion, replacing the previous plain HTML/CSS/JS renderer. Every tab (Home, Organize, Duplicates, Cleanup, Activity, Smart Group, Rules, Watcher, Settings) keeps the same features and flows, with a glassier, more animated look: an ambient background glow that follows your chosen accent color, cards that fade and rise in as you switch tabs, and a smoother sidebar.
- The file-organizing logic itself, and everything it reads and writes (settings, categories, rules, history, bookmarks), is unchanged.

### Fixed
- Several buttons that quietly did nothing because their wiring was missing a step: the Recycle Bin's "Open" button, Rules' schedule Enable/Disable and export/import, notes on Activity sessions, and the Notifications log
- The Organize > Schedule tab didn't show your saved schedule until you'd visited Settings at least once in the session
- Duplicates' Undo always re-scanned in "by content" mode even if you'd been scanning "by name"
- Cleanup's preview list left out duplicate app versions even though they were included in the actual cleanup
- Editing a rule with 2 or more conditions in the Rule Editor could silently reset every condition after the first back to its default on save
- Your chosen accent color never actually survived an app restart
- The packaged, installable app failed to start (a build configuration issue, not something you'd have hit in the previous release)

---

## [3.26.5] - 2026-07-29

### Added
- Visual polish pass across the app: subtle depth on cards, gradient accents on Home's stat numbers, glassmorphism blur on all modals and dialogs, an animated count-up for Home's stats, hover feedback on buttons and chips, a skeleton loading placeholder for Home, colored icon badges on all empty states, scrollbar hover feedback, an on-brand keyboard focus ring, staggered fade-in for lists, and a success checkmark bounce after Organize completes

### Fixed
- The Activity tab's unread-count badge could overlap the "Activity" label text for higher counts instead of sitting next to it
- After completing an Organize, the "Select a folder to get started" hero was shown again at the same time as the results, pushing the actual results below the fold and making it easy to miss that Organize had finished without scrolling down

---

## [3.26.4] - 2026-07-28

### Fixed
- Rules "Rename" action never actually renamed anything - the Rule Editor never saved the data it needed, so Preview always showed the same name and running the rule silently did nothing. It now correctly applies your current Rename Rules from Settings, including proper handling of Greek characters.
- Sanitized user-controlled text (category names, ignore list entries, rule condition values, folder paths, bookmarks, recent folders) in 8 more places across Settings, Rules, Home, and Duplicates that could otherwise render as HTML instead of plain text
- Smart Group preview showed the group name in lowercase, but the actual folder created is capitalized (e.g. previewing "netflix" while actually creating "Netflix") - preview now matches what's actually created
- "Show guide" could silently revert your theme and language back to dark/English if you clicked through to the end without touching those specific steps
- Removed a duplicate internal function definition that could have caused incorrect version comparisons in the future

---

## [3.26.3] - 2026-07-27

### Added
- Search box in the Organize preview: filters the file list live, shows all matches per category
- Version badge (e.g. "v3.26.0") on each file in the Duplicate App Versions section of Cleanup
- Weekly activity trend: a sparkline with trend percentage on the Home dashboard, and a detailed weekly breakdown on the Stats tab

### Fixed
- Home's "Organize Now" button now pre-fills and previews the last-organized folder instead of opening an empty Organize tab
- Placeholder text (e.g. the Activity search box) now translates correctly with the selected language; it was never being translated before
- Type and count badges in the Activity session list are now consistently aligned into columns across all session types, and action buttons no longer overlap the expand arrow on hover

---

## [3.26.2] - 2026-07-24

### Fixed
- `undo`, `organize-groups`, `delete-duplicates`, `restore-duplicates`, and `preview-rules` now use async file operations instead of blocking the main process on large folders
- Resolved a high-severity `brace-expansion` dependency vulnerability and three other pre-existing vulnerabilities (fast-uri, js-yaml, tar) flagged by Dependabot; `npm audit` now reports 0 vulnerabilities

---

## [3.26.1] - 2026-07-16

### Added
- ESLint setup with `npm run lint` / `npm run lint:fix`

### Fixed
- Category and group names are now sanitized before being rendered in the UI and in exported PDF/CSV, preventing HTML injection via a custom category or group name
- CSV export now escapes embedded double quotes in exported fields
- Missing `actions`/`delete`/`navigation` translation keys added for de/es/ru
- Cleanup scanning (installers, junk, old files, duplicates, empty folders) is now recursive, so it finds items inside category subfolders created by Organize instead of only the top-level folder
- The "hasn't been cleaned" reminder on Home no longer shows a fabricated duration for folders that were never cleaned, and matches folders correctly regardless of a trailing slash
- Scheduled/CLI cleanup (`--cleanup`) now actually scans and deletes for real and logs a session, instead of silently doing nothing while reporting success
- Cleanup deletion errors are now shown to the user instead of being hidden behind a generic success message
- Activity list now shows the correct type and count for Cleanup sessions, lists the cleaned files when expanded, and Undo works correctly on them
- `window.api.previewRules` was missing from the preload bridge - the Rules "Preview" button and Dry-run mode have been non-functional since they were built; both now work
- "Run all" on the Home Rules card now respects the global Dry-run setting instead of running for real regardless of it, and reliably targets the last-organized folder instead of an unrelated stale folder
- Per-rule "last run" time on Home was always blank; now shows the correct time
- Home's Watcher card now reflects the real watcher status instead of stale local UI state
- "Scan by Name" in the Duplicates tab could never find anything (it compared exact filenames within one folder, which are always unique); now normalizes common copy-suffix patterns (`_1`, ` (1)`, ` - Copy`) and scans recursively
- Fixed the Scan by Content/Scan by Name toggle button not reflecting the active mode
- `organize`, `run-rules`, `scan-cleanup`, `scan-duplicates`, and the file watcher now use async file operations instead of blocking the main process on large folders

---

## [3.26.0] - 2026-07-15

### Added
- Home tab as default landing page with full dashboard (Ctrl+1)
- Quick Organize card with folder info, stats and one-click organize
- Rules card showing enabled rules with Run all button
- Watcher card showing active/inactive status
- Recent Activity card showing last 3 meaningful sessions
- Smart cleanup reminder for Downloads/Desktop/Documents folders
- Personalized greeting using Windows username
- Refresh button to reload Home data
- Cleanup sessions now logged for reminder tracking

### Changed
- Keyboard shortcuts updated: Ctrl+1 for Home, Ctrl+2-9 for tabs
- Onboarding tour updated with Home tab and Activity tab highlights
- All "Mojo" references renamed to "MFO" across all 5 languages
- "Stores / Clients" renamed to "Groups" in all languages
- Removed all em-dashes from UI text and translations

### Fixed
- 16 missing translation keys added to EN and GR
- 0-file sessions hidden from Home recent activity

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
