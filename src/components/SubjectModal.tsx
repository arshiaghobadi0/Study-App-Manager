import { Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { SubjectCategory } from '../types/study';
import { SUBJECT_COLOR_SWATCHES } from '../utils/tasks';

interface SubjectModalProps {
  isOpen: boolean;
  subjects: SubjectCategory[];
  onClose: () => void;
  onAddSubject: (name: string, color: string) => void;
  onDeleteSubject: (subjectId: string) => void;
}

export function SubjectModal({
  isOpen,
  subjects,
  onClose,
  onAddSubject,
  onDeleteSubject,
}: SubjectModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLOR_SWATCHES[0]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('نام درس را وارد کنید.');
      return;
    }
    if (subjects.some((s) => s.name === trimmed)) {
      setError('این درس قبلاً اضافه شده است.');
      return;
    }
    onAddSubject(trimmed, color);
    setName('');
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 id="subject-modal-title" className="text-base font-semibold text-slate-900">
            مدیریت دسته‌بندی درس‌ها
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن مدیریت درس‌ها"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="new-subject-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                افزودن درس جدید
              </label>
              <div className="flex gap-2">
                <input
                  id="new-subject-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="مثال: زیست‌شناسی"
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  ثبت درس
                </button>
              </div>
              {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-slate-500 whitespace-nowrap">رنگ درس:</span>
              <div className="flex items-center gap-2">
                {SUBJECT_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    aria-label={`انتخاب رنگ ${swatch}`}
                    aria-pressed={color === swatch}
                    className={`w-5 h-5 rounded-md transition-transform ${
                      color === swatch ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-xs font-medium text-slate-500 mb-2.5">درس‌های فعال</h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
              {subjects.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: sub.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-slate-800">{sub.name}</span>
                  </div>
                  <button
                    type="button"
                    disabled={subjects.length <= 1}
                    onClick={() => onDeleteSubject(sub.id)}
                    aria-label={`حذف درس '${sub.name}'`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
