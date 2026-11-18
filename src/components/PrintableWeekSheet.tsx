import { toPersianDigits } from '../utils/jalali';
import type { PrintableWeekData } from '../utils/printSchedule';
import { PRIORITY_LABELS } from '../utils/tasks';

interface PrintableWeekSheetProps {
  data: PrintableWeekData;
}

export function PrintableWeekSheet({ data }: PrintableWeekSheetProps) {
  return (
    <div dir="rtl" className="bg-white text-[#201d1d] space-y-4">
      <div className="border-b-2 border-[#201d1d] pb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-[#6e6e73] font-bold">
            <span dir="ltr" className="ml-1">[+]</span>
            opencode // برنامه مطالعه هفتگی
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mt-0.5">
            <h2 className="text-[18px] font-bold text-[#201d1d] tabular-nums">{data.jalaliSpan}</h2>
            <span aria-hidden="true" className="text-[#6e6e73]">
              /
            </span>
            <span dir="ltr" className="text-[12.5px] font-mono-nums text-[#424245]">
              {data.gregorianSpan}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#424245] tabular-nums font-medium">
          <span>کل تکالیف: {toPersianDigits(data.totalCount)}</span>
          <span aria-hidden="true">|</span>
          <span>انجام‌شده: {toPersianDigits(data.completedCount)}</span>
          <span aria-hidden="true">|</span>
          <span>باقی‌مانده: {toPersianDigits(data.pendingCount)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {data.days.map(({ day, tasks }) => (
          <section
            key={day.dateISO}
            className="border border-[#201d1d]/30 rounded-[4px] overflow-hidden break-inside-avoid"
          >
            <div className="bg-[#f5f5f7] border-b border-[#201d1d]/20 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[13px] font-bold text-[#201d1d]">
                  <span dir="ltr" className="text-[#6e6e73] ml-1">[+]</span>
                  {day.persianWeekday}
                </h3>
                <span aria-hidden="true" className="text-[#6e6e73]">
                  //
                </span>
                <span className="text-[11.5px] font-medium text-[#424245] tabular-nums">
                  {day.jalaliFormatted}
                </span>
                <span aria-hidden="true" className="text-[#6e6e73]">
                  /
                </span>
                <span dir="ltr" className="text-[11px] font-mono-nums text-[#6e6e73]">
                  {day.gregorianFormattedEn}
                </span>
              </div>
              <span className="text-[11px] text-[#6e6e73] tabular-nums">
                [{toPersianDigits(tasks.length)} مورد]
              </span>
            </div>

            {tasks.length === 0 ? (
              <p className="px-3.5 py-2.5 text-[11px] text-[#6e6e73]">
                -- تکلیفی برای این روز ثبت نشده است.
              </p>
            ) : (
              <div className="divide-y divide-[#201d1d]/12">
                {tasks.map((task) => (
                  <div key={task.id} className="px-3.5 py-2 flex items-start gap-2.5">
                    <span
                      dir="ltr"
                      aria-hidden="true"
                      className={`mt-0.5 text-[11.5px] font-bold shrink-0 ${
                        task.completed ? 'text-[#201d1d]' : 'text-[#6e6e73]'
                      }`}
                    >
                      {task.completed ? '[x]' : '[ ]'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[12px] font-semibold leading-5 ${
                          task.completed ? 'line-through text-[#6e6e73]' : 'text-[#201d1d]'
                        }`}
                      >
                        {task.title}
                      </p>

                      {task.notes && (
                        <p className="text-[11px] text-[#6e6e73] mt-0.5">// {task.notes}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10.5px] text-[#424245]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <span
                            className="w-2 h-2 rounded-[2px] shrink-0"
                            style={{ backgroundColor: task.subjectColor }}
                            aria-hidden="true"
                          />
                          [{task.subjectName}]
                        </span>
                        <span>[{PRIORITY_LABELS[task.priority]}]</span>
                        {task.reminderText && (
                          <span className="font-mono-nums">
                            [BELL {toPersianDigits(task.reminderText)}]
                          </span>
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
