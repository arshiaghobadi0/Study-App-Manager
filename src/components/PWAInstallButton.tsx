import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'menu' | 'button';
  onAfterAction?: () => void;
}

export function PWAInstallButton({ variant = 'button', onAfterAction }: PWAInstallButtonProps) {
  const { isInstallable, isIOS, canShowControl, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!canShowControl) {
    return null;
  }

  const baseClass =
    variant === 'menu'
      ? 'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-right'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
          onAfterAction?.();
        }}
        className={baseClass}
      >
        <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
        <span>نصب نسخه وب‌اپ</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setShowIOSGuide(true);
            onAfterAction?.();
          }}
          className={baseClass}
        >
          <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
          <span>نصب در آیفون</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-pwa-title"
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <h2 id="ios-pwa-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  نصب برنامه در آیفون و آیپد
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="بستن راهنمای نصب"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-3 text-xs leading-6 text-zinc-600 dark:text-zinc-300">
                <p>۱. در نوار مرورگر Safari دکمه اشتراک‌گذاری (Share) را لمس کنید.</p>
                <p>۲. به پایین اسکرول کرده و گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.</p>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-2 w-full py-2 text-xs font-semibold rounded-xl bg-[#E14E43] text-white hover:bg-[#CC3F35] transition-colors"
                >
                  متوجه شدم
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
