import { lazy, type ComponentType } from 'react';

let refreshAttempted = false;
const recoveryKey = 'ziquala_chunk_recovery';

export const lazyWithRetry = (load: () => Promise<{ default: ComponentType<any> }>) => lazy(async () => {
  try {
    return await load();
  } catch (error) {
    // A deployed entry bundle has a distinct URL. Refresh at most once per build,
    // even when another lazy component loads successfully before the broken one.
    if (!refreshAttempted && navigator.onLine) {
      refreshAttempted = true;
      try {
        if (sessionStorage.getItem(recoveryKey) !== import.meta.url) {
          sessionStorage.setItem(recoveryKey, import.meta.url);
          if (sessionStorage.getItem(recoveryKey) === import.meta.url) {
            window.location.reload();
            return new Promise<never>(() => {});
          }
        }
      } catch { /* Blocked storage must not cause a refresh loop. */ }
    }
    throw error;
  }
});
