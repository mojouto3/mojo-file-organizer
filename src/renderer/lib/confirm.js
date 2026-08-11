let listener = null;

export function confirm(message, opts = {}) {
  return new Promise((resolve) => {
    listener?.({ message, ...opts, resolve });
  });
}

export function subscribeConfirm(fn) {
  listener = fn;
  return () => { listener = null; };
}
