import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toPersianDigits } from '../utils/jalali';

interface ConfirmDeleteAllModalProps {
  isOpen: boolean;
  totalTaskCount: number;
  currentWeekTaskCount: number;
  weekJalaliSpan: string;
  onClose: () => void;
  onConfirm: (options: { scope: 'all' | 'week'; permanent: boolean }) => void;
}

export function ConfirmDeleteAllModal({
  isOpen,
  totalTaskCount,
  currentWeekTaskCount,
  weekJalaliSpan,
  onClose,
  onConfirm,
}: ConfirmDeleteAllModalProps) {
  const [scope, setScope] = useState<'all' | 'week'>('all');
  const [permanent, setPermanent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScope('all');
      setPermanent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasOtherWeeks = currentWeekTaskCount > 0 && currentWeekTaskCount < totalTaskCount;
  const targetCount = scope === 'all' ? totalTaskCount : currentWeekTaskCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 dark:bg-black/65 backdrop-blur-[3px] p-4 anim-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-all-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200/80 dark:border-zinc-800 rounded-[22px] w-full max-w-md shadow-2xl overflow-hidden anim-modal-enter">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </span>
            <h2 id="delete-all-modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              حذف همه تکالیف
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره تایید حذف"
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-6">
            آیا مطمئن هستید که می‌خواهید{' '}
            <strong className="text-zinc-900 dark:text-zinc-100 tabular-nums">
              {toPersianDigits(targetCount)} تکلیف
            </strong>{' '}
            را حذف کنید؟
          </p>

          {hasOtherWeeks && (
            <div className="space-y-2 rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/60 p-3">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">محدوده حذف:</p>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
                <input
                  type="radio"
                  name="delete-scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>
                  همه تکالیف کل برنامه ({toPersianDigits(totalTaskCount)} مورد)
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 cursor-pointer">
                <input
                  type="radio"
                  name="delete-scope"
                  checked={scope === 'week'}
                  onChange={() => setScope('week')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>
                  فقط تکالیف هفته جاری ({weekJalaliSpan} · {toPersianDigits(currentWeekTaskCount)} مورد)
                </span>
              </label>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-1.5">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={permanent}
                onChange={(e) => setPermanent(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 text-rose-600 focus:ring-rose-500"
              />
              حذف دائمی (بدون انتقال به «اخیراً حذف‌شده»)
            </label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pr-6 leading-5">
              {permanent
                ? 'با انتخاب این گزینه، تکالیف برای همیشه پاک می‌شوند و قابل بازیابی نخواهند بود.'
                : 'در حالت عادی، تکالیف به بخش «اخیراً حذف‌شده» در نوار کناری منتقل می‌شوند و قابل بازیابی هستند.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm({ scope, permanent });
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              {permanent ? 'حذف دائمی تکالیف' : 'تایید و حذف همه'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
