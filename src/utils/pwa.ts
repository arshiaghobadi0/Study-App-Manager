export function isIOSUserAgent(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function isElectronUserAgent(userAgent: string): boolean {
  return /electron/i.test(userAgent);
}

export function shouldShowPWAInstallControl(args: {
  isInstalled: boolean;
  isElectron: boolean;
  hasDeferredPrompt: boolean;
  isIOS: boolean;
}): boolean {
  if (args.isInstalled || args.isElectron) {
    return false;
  }
  return args.hasDeferredPrompt || args.isIOS;
}
