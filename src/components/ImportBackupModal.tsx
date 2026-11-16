import { AlertCircle, CheckCircle2, FileJson, Upload, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { SubjectCategory } from '../types/study';
import {
  parseBackupJson,
  type ImportMode,
  type ParsedBackupData,
} from '../utils/backup';
import { toPersianDigits } from '../utils/jalali';

interface ImportBackupModalProps {
  isOpen: boolean;
  existingSubjects: SubjectCategory[];
  onClose: () => void;
  onApplyImport: (args: {
    data: ParsedBackupData;
    mode: ImportMode;
    applyTheme: boolean;
  }) => void;
}

export function ImportBackupModal({
  isOpen,
  existingSubjects,
  onClose,
  onApplyImport,
}: ImportBackupModalProps) {
  const [rawJsonText, setRawJsonText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>('replace');
  const [applyTheme, setApplyTheme] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBackupData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRawJsonText('');
    setFileName(null);
    setMode('replace');
    setApplyTheme(true);
    setParseError(null);
    setParsedData(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const validateText = (text: string) => {
    if (!text.trim()) {
      setParseError(null);
      setParsedData(null);
      return;
    }
    const result = parseBackupJson(text, existingSubjects);
    if (result.ok) {
      setParseError(null);
      setParsedData(result.data);
    } else {
      setParseError(result.error);
      setParsedData(null);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const content = await file.text();
      setRawJsonText(content);
      validateText(content);
    } catch {
      setParseError('خواندن فایل انتخاب‌شده امکان‌پذیر نبود.');
      setParsedData(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsedData) {
      validateText(rawJsonText);
      if (!rawJsonText.trim()) {
        setParseError('لطفاً یک فایل JSON انتخاب کنید یا متن JSON را وارد نمایید.');
      }
      return;
    }
    onApplyImport({
      data: parsedData,
      mode,
      applyTheme,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="import-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            دریافت و بازیابی ورودی JSON
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره ورودی JSON"
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="json-backup-file"
              className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 rounded-lg px-4 py-5 cursor-pointer transition-colors text-center"
            >
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {fileName ? `فایل انتخاب‌شده: ${fileName}` : 'انتخاب فایل پشتیبان JSON از دستگاه'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  فرمت‌های پشتیبانی‌شده: فایل پشتیبان برنامه یا آرایه تکالیف (.json)
                </p>
              </div>
              <input
                id="json-backup-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          <div>
            <label
              htmlFor="json-raw-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              یا چسباندن مستقیم متن JSON
            </label>
            <textarea
              id="json-raw-input"
              dir="ltr"
              rows={5}
              value={rawJsonText}
              onChange={(e) => {
                const next = e.target.value;
                setRawJsonText(next);
                validateText(next);
              }}
              placeholder='{"tasks": [{"title": "مرور ریاضی", "dateISO": "2026-11-15"}]}'
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
            />
          </div>

          {parseError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedData && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>ساختار JSON معتبر است و آماده بازیابی می‌باشد</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <FileJson className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  تعداد تکالیف: {toPersianDigits(parsedData.tasks.length)}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span>تعداد درس‌ها: {toPersianDigits(parsedData.subjects.length)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-3">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              نحوه اعمال داده‌های ورودی
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('replace')}
                aria-pressed={mode === 'replace'}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-right transition-colors ${
                  mode === 'replace'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-800 dark:text-blue-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                جایگزینی کامل برنامه فعلی
              </button>
              <button
                type="button"
                onClick={() => setMode('merge')}
                aria-pressed={mode === 'merge'}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-right transition-colors ${
                  mode === 'merge'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-800 dark:text-blue-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                ادغام با تکالیف و درس‌های فعلی
              </button>
            </div>

            {parsedData?.theme && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={applyTheme}
                  onChange={(e) => setApplyTheme(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-600"
                />
                اعمال تم ذخیره‌شده ({parsedData.theme === 'dark' ? 'تاریک' : 'روشن'})
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!parsedData}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-45 disabled:pointer-events-none transition-colors"
            >
              اعمال و بازیابی داده‌ها
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
