import { BarChart3, Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyProgressPoint, WeeklyProgressSummary } from '../utils/analytics';
import { toPersianDigits } from '../utils/jalali';
import type { ThemeMode } from '../utils/theme';

interface WeeklyProgressChartProps {
  summary: WeeklyProgressSummary;
  theme: ThemeMode;
  onAddTask: () => void;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: DailyProgressPoint;
  }>;
}

function CustomProgressTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      dir="rtl"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 min-w-[175px]"
    >
      <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          {point.dayName} · {point.jalaliShort}
        </p>
        <p dir="ltr" className="text-[11px] font-mono-nums text-slate-500 dark:text-slate-400 text-right">
          {point.gregorianShort}
        </p>
      </div>

      <div className="space-y-1 tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-xs bg-emerald-500 shrink-0" aria-hidden="true" />
            تکمیل‌شده
          </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {toPersianDigits(point.completed)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-xs bg-amber-500 shrink-0" aria-hidden="true" />
            باقی‌مانده
          </span>
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {toPersianDigits(point.remaining)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">پیشرفت روز</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {toPersianDigits(point.completionPercent)}٪
          </span>
        </div>
      </div>
    </div>
  );
}

export function WeeklyProgressChart({
  summary,
  theme,
  onAddTask,
}: WeeklyProgressChartProps) {
  const isDark = theme === 'dark';

  return (
    <section
      id="analytics-section"
      aria-label="نمودار تحلیلی پیشرفت هفتگی"
      className="bg-[#F4F4F6]/80 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            نمودار تحلیلی پیشرفت هفتگی
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            مقایسه تکالیف تکمیل‌شده در برابر باقی‌مانده از شنبه تا جمعه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 tabular-nums shrink-0">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            نرخ تکمیل هفته: {toPersianDigits(summary.completionRatePercent)}٪
          </span>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shrink-0" aria-hidden="true" />
            تکمیل‌شده ({toPersianDigits(summary.completedTasks)})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 shrink-0" aria-hidden="true" />
            باقی‌مانده ({toPersianDigits(summary.remainingTasks)})
          </span>
        </div>
      </div>

      {summary.totalTasks === 0 ? (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl py-10 px-4 text-center space-y-3 bg-white/70 dark:bg-zinc-950/30">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            هنوز تکلیفی برای این هفته ثبت نشده است تا روند پیشرفت روزانه نمایش داده شود.
          </p>
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            افزودن تکلیف در این هفته
          </button>
        </div>
      ) : (
        <div
          dir="ltr"
          className="w-full h-[230px] min-w-0"
          data-testid="weekly-progress-chart"
        >
          <ResponsiveContainer width="100%" height={230} minWidth={0}>
            <BarChart
              data={summary.points}
              margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
              barGap={5}
              barCategoryGap="24%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
              />
              <XAxis
                dataKey="dayName"
                reversed
                tick={{
                  fill: isDark ? '#cbd5e1' : '#475569',
                  fontSize: 12,
                }}
                axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                width={36}
                tickFormatter={(value: number) => toPersianDigits(value)}
                tick={{
                  fill: isDark ? '#94a3b8' : '#64748b',
                  fontSize: 12,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomProgressTooltip />}
                cursor={{
                  fill: isDark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.85)',
                }}
              />
              <Bar
                dataKey="completed"
                name="تکمیل‌شده"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="remaining"
                name="باقی‌مانده"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
