# Security Policy

Mojo File Organizer moves, renames, and deletes files on your system based on
rules you configure. The main risk here isn't privilege escalation, it's
data loss: a rule or bug that touches files it shouldn't.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Instead, report it privately:

- Discord: DM the maintainer directly
- Or open a [private security advisory](https://github.com/mojouto3/mojo-file-organizer/security/advisories/new) on this repository

Include as much detail as you can: what happened, how to reproduce it, and
what you think the impact is.

## What counts as a security issue here

Examples of things worth a private report rather than a public issue:

- A rule, undo, or batch operation that deletes or overwrites files outside
  its intended scope
- Undo that doesn't fully restore a previous state, silently losing data
- The Watcher or scheduled rules doing something unexpected to files the
  user didn't select
- Any way imported settings, rule exports, or config files could be used to
  make the app perform unintended file operations

Regular bugs, crashes, or UI issues are not security issues. Please file
those as normal [issues](https://github.com/mojouto3/mojo-file-organizer/issues)
using the bug report template.

## Response

This is a small, actively maintained project. Reports are usually
acknowledged within a few days. Fixes ship in the next release, with credit
in the changelog unless you'd prefer to stay anonymous.
