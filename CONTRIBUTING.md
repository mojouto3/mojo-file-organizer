# Contributing to Mojo File Organizer

Thank you for your interest in improving this project!

---

## How to Contribute

1. Fork this repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/mojo-file-organizer.git`
3. Install dependencies: `npm install`
4. Run the app: `npm start`
5. Create a branch: `git checkout -b feature/my-improvement`
6. Make your changes
7. Test on Windows
8. Submit a Pull Request with a clear description

---

## Project Structure

```
mojo-file-organizer/
├── assets/icon.ico       # MFO app icon
├── main.js               # Electron main — file ops, IPC, tray, scheduling
├── preload.js            # Secure bridge between main and renderer
├── renderer.js           # UI logic — all tab interactions
├── index.html            # App layout and tabs
├── style.css             # Dark/light themes, components
├── translations.js       # All UI strings for EN, GR, DE, ES, RU
└── package.json          # Config and electron-builder settings
```

---

## Adding New File Categories

Open `main.js` and find `DEFAULT_CATEGORIES`:

```javascript
const DEFAULT_CATEGORIES = [
  { id: 'images', name: 'Images', icon: 'image', enabled: true, extensions: ['.jpg', ...] },
  // Add your new category here:
  { id: 'my-category', name: 'My Category', icon: 'folder', enabled: true, extensions: ['.abc', '.xyz'] },
];
```

Then add an icon mapping in `renderer.js` inside `getCatIcon()`:

```javascript
function getCatIcon(cat) {
  const map = {
    ...
    'My Category': 'folder',
  };
}
```

---

## Adding a New Language

Open `translations.js` and add a new language object following the same structure as the existing ones:

```javascript
const TRANSLATIONS = {
  en: { ... },
  gr: { ... },
  fr: {  // New language
    organize: 'Organiser',
    smartGroup: 'Groupe intelligent',
    // ... all keys
  }
};
```

Then add the option in `index.html` inside the language select:

```html
<option value="fr">Français</option>
```

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **Patch** (3.x.X): Bug fixes
- **Minor** (3.X.0): New features
- **Major** (X.0.0): Breaking changes

Always update `CHANGELOG.md` and `package.json` version before a release PR.

---

## Reporting Issues

Please open a GitHub Issue and include:
- Your Windows version
- App version
- Steps to reproduce
- What you expected vs what happened
- Any error messages

---

## Code Style

- Use `const` and `let` — no `var`
- Async/await for all IPC calls
- Keep functions small and focused
- Comment complex logic

---

## Pull Request Guidelines

- One feature or fix per PR
- Reference the related issue: `closes #X`
- Update `CHANGELOG.md`
- Test on Windows before submitting
