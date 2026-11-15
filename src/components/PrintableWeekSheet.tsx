import { Check } from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';
import type { PrintableWeekData } from '../utils/printSchedule';
import { PRIORITY_LABELS } from '../utils/tasks';

interface PrintableWeekSheetProps {
  data: PrintableWeekData;
}

export function PrintableWeekSheet({ data }: PrintableWeekSheetProps) {
  return (
    <div dir="rtl" className="bg-white text-slate-900 space-y-4">
      <div className="border-b-2 border-slate-800 pb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 font-medium">برنامه مطالعه هفتگی</p>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mt-0.5">
            <h2 className="text-xl font-bold text-slate-900 tabular-nums">{data.jalaliSpan}</h2>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span dir="ltr" className="text-sm font-mono-nums text-slate-600">
              {data.gregorianSpan}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span>کل تکالیف: {toPersianDigits(data.totalCount)}</span>
          <span aria-hidden="true">·</span>
          <span>انجام‌شده: {toPersianDigits(data.completedCount)}</span>
          <span aria-hidden="true">·</span>
          <span>باقی‌مانده: {toPersianDigits(data.pendingCount)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {data.days.map(({ day, tasks }) => (
          <section
            key={day.dateISO}
            className="border border-slate-300 rounded-lg overflow-hidden break-inside-avoid"
          >
            <div className="bg-slate-100/80 border-b border-slate-300 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-bold text-slate-900">{day.persianWeekday}</h3>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="text-xs font-medium text-slate-700 tabular-nums">
                  {day.jalaliFormatted}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
                <span dir="ltr" className="text-xs font-mono-nums text-slate-600">
                  {day.gregorianFormattedEn}
                </span>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                {toPersianDigits(tasks.length)} مورد
              </span>
            </div>

            {tasks.length === 0 ? (
              <p className="px-3.5 py-2.5 text-xs text-slate-400">
                تکلیفی برای این روز ثبت نشده است.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {tasks.map((task) => (
                  <div key={task.id} className="px-3.5 py-2 flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 ${
                        task.completed
                          ? 'bg-slate-800 border-slate-800 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium leading-5 ${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>

                      {task.notes && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{task.notes}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <span
                            className="w-1.5 h-1.5 rounded-xs shrink-0"
                            style={{ backgroundColor: task.subjectColor }}
                            aria-hidden="true"
                          />
                          {task.subjectName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{PRIORITY_LABELS[task.priority]}</span>
                        {task.reminderText && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-nums">
                              یادآور {toPersianDigits(task.reminderText)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
