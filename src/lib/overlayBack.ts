const KEY = '__weatherNowOverlay';
type Host = Pick<Window, 'history' | 'addEventListener' | 'removeEventListener'>;

// History contains only opaque IDs, never journal text or photo data.
export function createOverlayBack(host: Host) {
  const session = `${Date.now()}-${Math.random()}`;
  let sequence = 0;
  let pending = false;
  let disposed = false;
  const layers: { id: string; close: () => void; tracked: boolean }[] = [];
  const currentId = () => host.history.state?.[KEY];
  const pop = () => {
    pending = false;
    const index = layers.findIndex(layer => layer.id === currentId());
    while (layers.length > index + 1) layers.pop()!.close();
  };
  host.addEventListener('popstate', pop);
  return {
    open(close: () => void) {
      if (pending || disposed) return false;
      const id = `${session}:${++sequence}`;
      let tracked = false;
      try {
        const state = host.history.state;
        host.history.pushState({ ...(state && typeof state === 'object' ? state : {}), [KEY]: id }, '');
        tracked = true;
      } catch { /* Close buttons and Escape still work if history is unavailable. */ }
      layers.push({ id, close, tracked });
      return true;
    },
    closeTop() {
      if (pending || !layers.length) return;
      const top = layers[layers.length - 1];
      if (top.tracked && currentId() === top.id) {
        pending = true;
        host.history.back();
      } else layers.pop()!.close();
    },
    dispose() {
      disposed = true;
      host.removeEventListener('popstate', pop);
      // Tab changes must not leave extra Back presses in the dashboard.
      if (!pending && layers.some(layer => layer.id === currentId())) {
        const count = layers.filter(layer => layer.tracked).length;
        if (count) host.history.go(-count);
      }
      layers.length = 0;
    },
  };
}
