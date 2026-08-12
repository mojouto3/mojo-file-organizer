let listener = null;

export function openOnboarding() {
  listener?.();
}

export function subscribeOnboarding(fn) {
  listener = fn;
  return () => { listener = null; };
}
