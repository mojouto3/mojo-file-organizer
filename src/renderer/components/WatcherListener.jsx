import { useEffect } from 'react';
import { pushWatcherEvent } from '../lib/watcherStore.js';

export default function WatcherListener() {
  useEffect(() => {
    window.api.onWatcherEvent((data) => pushWatcherEvent(data));
  }, []);

  return null;
}
