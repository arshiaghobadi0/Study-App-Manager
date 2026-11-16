import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isElectronUserAgent,
  isIOSUserAgent,
  shouldShowPWAInstallControl,
} from './pwa';

test('isIOSUserAgent and isElectronUserAgent identify platforms accurately', () => {
  assert.equal(isIOSUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
  assert.equal(isIOSUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0'), false);

  assert.equal(isElectronUserAgent('Mozilla/5.0 MyApp/1.0.0 Electron/35.0.0 Chrome/134.0.0.0'), true);
  assert.equal(isElectronUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/134.0.0.0'), false);
});

test('shouldShowPWAInstallControl suppresses button in standalone or Electron mode', () => {
  assert.equal(
    shouldShowPWAInstallControl({
      isInstalled: true,
      isElectron: false,
      hasDeferredPrompt: true,
      isIOS: false,
    }),
    false,
  );
  assert.equal(
    shouldShowPWAInstallControl({
      isInstalled: false,
      isElectron: true,
      hasDeferredPrompt: true,
      isIOS: false,
    }),
    false,
  );
  assert.equal(
    shouldShowPWAInstallControl({
      isInstalled: false,
      isElectron: false,
      isTauri: true,
      hasDeferredPrompt: true,
      isIOS: false,
    }),
    false,
  );
  assert.equal(
    shouldShowPWAInstallControl({
      isInstalled: false,
      isElectron: false,
      hasDeferredPrompt: true,
      isIOS: false,
    }),
    true,
  );
  assert.equal(
    shouldShowPWAInstallControl({
      isInstalled: false,
      isElectron: false,
      hasDeferredPrompt: false,
      isIOS: true,
    }),
    true,
  );
});
