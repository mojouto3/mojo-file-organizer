let listeners = [];

export function showToast(message) {
  listeners.forEach((l) => l(message));
}

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
