export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyAccent(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--color-mfo-green', color);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  document.documentElement.style.setProperty('--color-mfo-green-hover', `rgba(${r}, ${g}, ${b}, 0.85)`);
}
