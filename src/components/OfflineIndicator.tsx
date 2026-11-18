import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="oc-elevated-emphasis accent-bar-coral fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 px-3.5 py-2 text-[11.5px] font-medium text-[var(--text-primary)] print:hidden"
    >
      <span dir="ltr" className="font-bold text-[#ff9f0a]">
        [OFFLINE]
      </span>
      <span>برنامه با داده‌های ذخیره‌شده در دستگاه کار می‌کند</span>
    </div>
  );
}
