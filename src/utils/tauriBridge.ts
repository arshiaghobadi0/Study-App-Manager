interface TauriInternals {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    Boolean(window.__TAURI_INTERNALS__?.invoke) ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost'
  );
}

export async function invokeTauriCommand<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__?.invoke) {
    return null;
  }
  return window.__TAURI_INTERNALS__.invoke<T>(cmd, args);
}
