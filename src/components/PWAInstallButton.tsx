import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isIOS, canShowControl, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!canShowControl) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="oc-btn-secondary !border-[#007aff] !text-[#007aff] whitespace-nowrap shrink-0 cursor-pointer"
      >
        [PWA] نصب برنامه
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="oc-btn-secondary whitespace-nowrap shrink-0 cursor-pointer"
        >
          [PWA] نصب در آیفون
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#201d1d]/65 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-pwa-title"
          >
            <div className="oc-elevated-emphasis w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-hairline)]">
                <h2 id="ios-pwa-title" className="text-[14px] font-bold text-[var(--text-primary)]">
                  <span dir="ltr" className="text-[#007aff] ml-1.5">[PWA]</span>
                  نصب برنامه در آیفون و آیپد
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="بستن راهنمای نصب"
                  className="oc-btn-secondary !px-2 !py-1 !text-[11px]"
                >
                  <span dir="ltr">[x]</span>
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-3 text-[12px] leading-6 text-[var(--text-secondary)]">
                <p>۱. در نوار مرورگر Safari دکمه اشتراک‌گذاری (Share) را لمس کنید.</p>
                <p>۲. به پایین اسکرول کرده و گزینه <strong>Add to Home Screen</strong> را انتخاب نمایید.</p>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="oc-btn-primary mt-2 w-full py-2 cursor-pointer"
                >
                  [OK] متوجه شدم
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
