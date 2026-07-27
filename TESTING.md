# Pre-release smoke test checklist

Run through this manually before every release. It exists because most of these
items broke in production-looking ways during real testing for v3.26.1/v3.26.2,
despite looking fine in code review. Test against a real folder with a realistic
mix of files (subfolders, installers, duplicates, old files), not an empty one.

Run `npm run lint` and `npm audit` first; fix anything there before starting manual
testing.

## Organize

- [ ] Organize on a folder with 100+ files across several categories: app stays
      responsive during the run (try switching tabs while it's working)
- [ ] Files land in the correct category subfolders
- [ ] Home's Quick Organize card shows the folder you just organized, with an
      accurate "last organized" time (not a different/stale folder)

## Cleanup

- [ ] Scan a folder that has files inside subfolders (e.g. after running Organize
      on it first): confirm installers/junk/duplicates/old files/empty folders
      are found inside the subfolders too, not just the top level
- [ ] Clean Selected actually deletes the selected items and moves them to
      `.mojo-trash`
- [ ] Home's "hasn't been cleaned" reminder disappears after cleaning the folder
      it's referring to
- [ ] Scheduled/CLI cleanup works: run
      `<exe> --cleanup "<folder>" --sections installers,junk` directly, confirm a
      real Windows notification appears with an accurate item count, and a
      `cleanup` session shows up in Activity afterward
- [ ] If any deletions fail, the failure is shown in a toast, not swallowed silently

## Rules

- [ ] "Run all" on the Home Rules card runs on the folder you actually want,
      not a stale one, and reports how many files matched
- [ ] Preview (Rules tab) shows accurate results without deleting/moving anything
- [ ] Dry-run toggle is respected everywhere, including "Run all" from Home
- [ ] Per-rule "last run" time on Home updates correctly after a rule actually runs

## Duplicates

- [ ] Scan by Content finds real byte-identical duplicates
- [ ] Scan by Name finds related filenames (e.g. `file.zip` / `file_1.zip`), not
      just exact matches
- [ ] The active scan mode button visually reflects which mode is selected

## Watcher

- [ ] Start Watcher, drop a new file into the watched folder, confirm it's
      organized within ~1 second and a notification appears
- [ ] Home's Watcher card shows "Active"/folder correctly, even if you haven't
      visited the Watcher tab this session

## Activity

- [ ] Every session type (Organize, Rules, Cleanup, Smart Group, Watcher) shows
      the correct badge, color, and count, not a generic/wrong fallback
- [ ] Expanding a session of each type shows the actual list of affected files
- [ ] Undo works correctly for each session type that supports it

## Cross-cutting

- [ ] Switch the language to at least one of de/es/ru and confirm every label
      updates (no leftover text in the previous language)
- [ ] Export CSV and PDF from Activity when the log contains a mix of session
      types; confirm no crash and no `undefined` values
- [ ] `npm run lint` passes with 0 errors before merging
