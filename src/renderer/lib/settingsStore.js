let settings = null;
let loadPromise = null;
let listeners = [];

function notify() {
  listeners.forEach((l) => l(settings));
}

export function getSettings() {
  if (settings) return Promise.resolve(settings);
  if (!loadPromise) {
    loadPromise = window.api.getSettings().then((s) => {
      settings = s;
      notify();
      return settings;
    });
  }
  return loadPromise;
}

export function subscribeSettings(fn) {
  listeners.push(fn);
  if (settings) fn(settings);
  else getSettings();
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  window.api.saveSettings(settings);
  notify();
  return settings;
}
