export const APP_EXPORT_FOLDER_NAME = 'WeeklyStudyPlanner';
export const ANDROID_EXPORT_FOLDER_DISPLAY = `Download/${APP_EXPORT_FOLDER_NAME}`;

interface TauriInternals {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

export interface AndroidStudyExportsBridge {
  getExportFolderPath?: () => string;
  saveBase64File: (filename: string, mimeType: string, base64Data: string) => string;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
    AndroidStudyExports?: AndroidStudyExportsBridge;
  }
}

export type ExportSaveDestination = 'android-downloads' | 'tauri-downloads' | 'browser-download';

export interface ExportSaveResult {
  destination: ExportSaveDestination;
  path: string;
  folder: string;
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

export function isAndroidExportsBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.AndroidStudyExports?.saveBase64File === 'function';
}

export function getAndroidExportFolderPath(): string {
  if (typeof window !== 'undefined' && typeof window.AndroidStudyExports?.getExportFolderPath === 'function') {
    try {
      const folder = window.AndroidStudyExports.getExportFolderPath();
      if (folder && folder.trim()) {
        return folder.trim();
      }
    } catch {
      // fall back to default display path
    }
  }
  return ANDROID_EXPORT_FOLDER_DISPLAY;
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

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '';
  }
  if (typeof Buffer !== 'undefined' && typeof btoa !== 'function') {
    return Buffer.from(bytes).toString('base64');
  }
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return uint8ArrayToBase64(bytes);
}

export interface SaveExportFileOptions {
  filename: string;
  mimeType: 'application/json' | 'application/pdf';
  data: string | Uint8Array;
  fallbackBrowserDownload: () => void;
}

export async function saveExportFile({
  filename,
  mimeType,
  data,
  fallbackBrowserDownload,
}: SaveExportFileOptions): Promise<ExportSaveResult> {
  // 1. Native Android Tauri WebView bridge -> saves into public Download/WeeklyStudyPlanner/ via MediaStore
  if (isAndroidExportsBridgeAvailable() && window.AndroidStudyExports) {
    try {
      const base64Data = typeof data === 'string' ? utf8ToBase64(data) : uint8ArrayToBase64(data);
      const rawResponse = window.AndroidStudyExports.saveBase64File(filename, mimeType, base64Data);
      const parsed = JSON.parse(rawResponse) as {
        ok?: boolean;
        path?: string;
        folder?: string;
        error?: string;
      };
      if (parsed.ok) {
        const folder = parsed.folder || getAndroidExportFolderPath();
        return {
          destination: 'android-downloads',
          folder,
          path: parsed.path || `${folder}/${filename}`,
        };
      }
    } catch {
      // Fall through to Tauri Rust command or browser download
    }
  }

  // 2. Desktop Tauri (or Android Rust fallback) -> saves into Downloads/WeeklyStudyPlanner/ via Rust
  if (isTauriRuntime()) {
    try {
      const savedPath =
        mimeType === 'application/json' && typeof data === 'string'
          ? await invokeTauriCommand<string>('save_json_backup', {
              filename,
              content: data,
            })
          : await invokeTauriCommand<string>('save_pdf_export', {
              filename,
              bytes: Array.from(
                typeof data === 'string' ? new TextEncoder().encode(data) : data,
              ),
            });

      if (savedPath) {
        return {
          destination: 'tauri-downloads',
          folder: APP_EXPORT_FOLDER_NAME,
          path: savedPath,
        };
      }
    } catch {
      // Fall through to browser download
    }
  }

  // 3. Standard Web / PWA download
  fallbackBrowserDownload();
  return {
    destination: 'browser-download',
    folder: APP_EXPORT_FOLDER_NAME,
    path: filename,
  };
}
