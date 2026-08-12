let events = [];
let listeners = [];

export function getWatcherEvents() {
  return events;
}

export function subscribeWatcherEvents(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function pushWatcherEvent(evt) {
  events = [{ ...evt, time: new Date().toLocaleTimeString() }, ...events];
  listeners.forEach((l) => l(events));
}

export function clearWatcherEvents() {
  events = [];
  listeners.forEach((l) => l(events));
}
