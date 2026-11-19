import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSchedulePdfFilename } from './pdfExport';
import {
  ANDROID_EXPORT_FOLDER_DISPLAY,
  saveExportFile,
  uint8ArrayToBase64,
  utf8ToBase64,
} from './tauriBridge';

test('utf8ToBase64 encodes Persian UTF-8 JSON content losslessly', () => {
  const sample = JSON.stringify({ title: 'مرور فصل حرکت‌شناسی', count: 3 });
  const encoded = utf8ToBase64(sample);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  assert.equal(decoded, sample);
});

test('uint8ArrayToBase64 encodes binary PDF bytes accurately', () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
  const encoded = uint8ArrayToBase64(bytes);
  const decoded = Buffer.from(encoded, 'base64');
  assert.deepEqual(new Uint8Array(decoded), bytes);
});

test('buildSchedulePdfFilename formats valid ISO dates and falls back safely', () => {
  assert.equal(
    buildSchedulePdfFilename('2026-11-19'),
    'study-planner-week-2026-11-19.pdf',
  );
  assert.equal(buildSchedulePdfFilename('invalid'), 'study-planner-week-schedule.pdf');
});

test('saveExportFile routes JSON and PDF to AndroidStudyExports bridge when available', async () => {
  const calls: Array<{ filename: string; mimeType: string; base64Data: string }> = [];
  const originalWindow = (globalThis as Record<string, unknown>).window;

  (globalThis as Record<string, unknown>).window = {
    location: { protocol: 'https:', hostname: 'tauri.localhost' },
    AndroidStudyExports: {
      getExportFolderPath: () => ANDROID_EXPORT_FOLDER_DISPLAY,
      saveBase64File: (filename: string, mimeType: string, base64Data: string) => {
        calls.push({ filename, mimeType, base64Data });
        return JSON.stringify({
          ok: true,
          folder: ANDROID_EXPORT_FOLDER_DISPLAY,
          path: `${ANDROID_EXPORT_FOLDER_DISPLAY}/${filename}`,
        });
      },
    },
  };

  try {
    let fallbackCalled = false;
    const jsonRes = await saveExportFile({
      filename: 'study-planner-backup-2026-11-19.json',
      mimeType: 'application/json',
      data: '{"ok":"بله"}',
      fallbackBrowserDownload: () => {
        fallbackCalled = true;
      },
    });

    assert.equal(fallbackCalled, false);
    assert.equal(jsonRes.destination, 'android-downloads');
    assert.equal(jsonRes.folder, 'Download/WeeklyStudyPlanner');
    assert.equal(jsonRes.path, 'Download/WeeklyStudyPlanner/study-planner-backup-2026-11-19.json');

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const pdfRes = await saveExportFile({
      filename: 'study-planner-week-2026-11-19.pdf',
      mimeType: 'application/pdf',
      data: pdfBytes,
      fallbackBrowserDownload: () => {
        fallbackCalled = true;
      },
    });

    assert.equal(fallbackCalled, false);
    assert.equal(pdfRes.destination, 'android-downloads');
    assert.equal(pdfRes.path, 'Download/WeeklyStudyPlanner/study-planner-week-2026-11-19.pdf');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].mimeType, 'application/json');
    assert.equal(Buffer.from(calls[0].base64Data, 'base64').toString('utf8'), '{"ok":"بله"}');
    assert.equal(calls[1].mimeType, 'application/pdf');
    assert.deepEqual(new Uint8Array(Buffer.from(calls[1].base64Data, 'base64')), pdfBytes);
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  }
});

test('saveExportFile falls back to Tauri Rust commands on desktop and browser download on web', async () => {
  const invoked: Array<{ cmd: string; args?: Record<string, unknown> }> = [];
  const originalWindow = (globalThis as Record<string, unknown>).window;

  (globalThis as Record<string, unknown>).window = {
    location: { protocol: 'tauri:', hostname: 'localhost' },
    __TAURI_INTERNALS__: {
      invoke: async (cmd: string, args?: Record<string, unknown>) => {
        invoked.push({ cmd, args });
        return `/Users/demo/Downloads/WeeklyStudyPlanner/${String(args?.filename ?? '')}`;
      },
    },
  };

  try {
    const res = await saveExportFile({
      filename: 'study-planner-week-2026-11-19.pdf',
      mimeType: 'application/pdf',
      data: new Uint8Array([1, 2, 3]),
      fallbackBrowserDownload: () => {
        throw new Error('Should not use browser fallback when Tauri succeeds');
      },
    });

    assert.equal(res.destination, 'tauri-downloads');
    assert.equal(invoked.length, 1);
    assert.equal(invoked[0].cmd, 'save_pdf_export');
    assert.deepEqual(invoked[0].args?.bytes, [1, 2, 3]);
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  }

  // Browser fallback when neither Android bridge nor Tauri is present
  let downloaded = false;
  const webRes = await saveExportFile({
    filename: 'backup.json',
    mimeType: 'application/json',
    data: '{}',
    fallbackBrowserDownload: () => {
      downloaded = true;
    },
  });
  assert.equal(downloaded, true);
  assert.equal(webRes.destination, 'browser-download');
  assert.equal(webRes.path, 'backup.json');
});
