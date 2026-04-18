import { defineBoot } from '#q-app/wrappers';
import bundledVersion from '../version.json';

/**
 * Runtime cache-bust guard.
 *
 * GitHub Pages serves index.html with a 10-minute max-age and does not allow
 * custom cache headers, which means returning users (especially on iOS Safari)
 * can get stuck on a stale index.html that references long-gone hashed bundles.
 *
 * On every app start we fetch /version.json with a cache-busting query string
 * and no-store headers. If it does not match the version baked into the bundle,
 * we force a hard reload. A sessionStorage guard prevents reload loops in the
 * (unlikely) case the server keeps returning a different version.
 */

const RELOAD_GUARD_KEY = 'eventcollect:version-reload-guard';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 minutes while tab is open

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const url = `${import.meta.env.BASE_URL || '/'}version.json?t=${Date.now()}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string; commit?: string };
    // Prefer commit (always unique per deploy) but fall back to version.
    return data.commit || data.version || null;
  } catch (err) {
    console.warn('[version-check] Failed to fetch remote version', err);
    return null;
  }
}

function bundledIdentifier(): string {
  const info = bundledVersion as { version?: string; commit?: string };
  return info.commit || info.version || '';
}

function forceReload() {
  // Mark so we don't spin if the remote keeps winning.
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, Date.now().toString());
  } catch {
    // sessionStorage may be unavailable (private mode quotas); proceed anyway.
  }
  // Cache-bust the URL itself so index.html re-fetches on reload.
  const url = new URL(window.location.href);
  url.searchParams.set('_v', Date.now().toString());
  window.location.replace(url.toString());
}

async function runCheck() {
  const remote = await fetchRemoteVersion();
  if (!remote) return;

  const local = bundledIdentifier();
  if (!local || remote === local) return;

  // We have a mismatch. Honor the guard so we don't reload forever.
  const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
  if (Date.now() - lastReload < 30_000) {
    console.warn('[version-check] Skipping reload — guard recently triggered', {
      local,
      remote,
    });
    return;
  }

  console.info('[version-check] New version detected, reloading', { local, remote });
  forceReload();
}

export default defineBoot(() => {
  // Kick off immediately (don't block boot on network).
  void runCheck();

  // Also re-check when the tab is focused after being backgrounded,
  // and on an interval in case the user leaves the tab open all day.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void runCheck();
    });
  }
  setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
});
