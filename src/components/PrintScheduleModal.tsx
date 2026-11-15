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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 id="print-modal-title" className="text-base font-semibold text-slate-900">
              پیش‌نمایش چاپ و خروجی PDF برنامه هفتگی
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              در پنجره چاپ مرورگر، برای ذخیره فایل می‌توانید گزینه Save as PDF را انتخاب کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پیش‌نمایش چاپ"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-5">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeCompleted}
                onChange={(e) =>
                  onChangeOptions({ ...options, includeCompleted: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              نمایش تکالیف انجام‌شده
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeNotes}
                onChange={(e) =>
                  onChangeOptions({ ...options, includeNotes: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              نمایش یادداشت‌ها
            </label>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              بستن
            </button>
            <button
              type="button"
              onClick={onTriggerPrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              چاپ یا ذخیره PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs max-w-[210mm] mx-auto">
            <PrintableWeekSheet data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
