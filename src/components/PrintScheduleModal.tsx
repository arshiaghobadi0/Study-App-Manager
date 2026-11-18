import { Printer, X } from 'lucide-react';
import type { PrintScheduleOptions, PrintableWeekData } from '../utils/printSchedule';
import { PrintableWeekSheet } from './PrintableWeekSheet';

interface PrintScheduleModalProps {
  isOpen: boolean;
  options: PrintScheduleOptions;
  data: PrintableWeekData;
  onChangeOptions: (next: PrintScheduleOptions) => void;
  onClose: () => void;
  onTriggerPrint: () => void;
}

export function PrintScheduleModal({
  isOpen,
  options,
  data,
  onChangeOptions,
  onClose,
  onTriggerPrint,
}: PrintScheduleModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 dark:bg-black/70 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
    >
      <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 id="print-modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              پیش‌نمایش چاپ و خروجی PDF برنامه هفتگی
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              در پنجره چاپ مرورگر، برای ذخیره فایل می‌توانید گزینه Save as PDF را انتخاب کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پیش‌نمایش چاپ"
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[#F4F4F6] dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeCompleted}
                onChange={(e) =>
                  onChangeOptions({ ...options, includeCompleted: e.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 text-rose-600 focus:ring-rose-500"
              />
              نمایش تکالیف انجام‌شده
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeNotes}
                onChange={(e) =>
                  onChangeOptions({ ...options, includeNotes: e.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 text-rose-600 focus:ring-rose-500"
              />
              نمایش یادداشت‌ها
            </label>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              بستن
            </button>
            <button
              type="button"
              onClick={onTriggerPrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              چاپ یا ذخیره PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-950 p-4 sm:p-6">
          <div className="bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 sm:p-8 shadow-xs max-w-[210mm] mx-auto">
            <PrintableWeekSheet data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
