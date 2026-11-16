export function isIOSUserAgent(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function isElectronUserAgent(userAgent: string): boolean {
  return /electron/i.test(userAgent);
}

export function shouldShowPWAInstallControl(args: {
  isInstalled: boolean;
  isElectron: boolean;
  isTauri?: boolean;
  hasDeferredPrompt: boolean;
  isIOS: boolean;
}): boolean {
  if (args.isInstalled || args.isElectron || args.isTauri) {
    return false;
  }
  return args.hasDeferredPrompt || args.isIOS;
}
