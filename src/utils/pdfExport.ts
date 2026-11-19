import { toPersianDigits } from './jalali';
import type { PrintableWeekData } from './printSchedule';
import { PRIORITY_LABELS } from './tasks';
import { saveExportFile, type ExportSaveResult } from './tauriBridge';

export function buildSchedulePdfFilename(weekStartISO: string): string {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(weekStartISO) ? weekStartISO : 'schedule';
  return `study-planner-week-${safeDate}.pdf`;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      // Handle exceptionally long single token safely
      if (ctx.measureText(word).width > maxWidth) {
        let partial = '';
        for (const ch of word) {
          if (ctx.measureText(partial + ch).width <= maxWidth) {
            partial += ch;
          } else {
            if (partial) lines.push(partial);
            partial = ch;
          }
        }
        current = partial;
      } else {
        current = word;
      }
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generatePrintableWeekPdfBytes(
  data: PrintableWeekData,
): Promise<Uint8Array> {
  if (typeof document === 'undefined') {
    throw new Error('PDF rendering requires a browser document context.');
  }

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed even if webfont readiness rejects
    }
  }

  // Crisp A4 portrait canvas (210mm x 297mm @ ~150 DPI -> 1240 x 1754 px)
  const PAGE_W = 1240;
  const PAGE_H = 1754;
  const MARGIN_X = 72;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const TOP_Y = 72;
  const BOTTOM_LIMIT = PAGE_H - 92;
  const FONT_FAMILY = 'Vazirmatn, Tahoma, "Segoe UI", Arial, sans-serif';

  const pages: HTMLCanvasElement[] = [];

  const createPageCanvas = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize 2D canvas context for PDF export.');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.direction = 'rtl';
    ctx.textBaseline = 'top';
    pages.push(canvas);
    return { canvas, ctx };
  };

  let { ctx } = createPageCanvas();
  let cursorY = TOP_Y;

  // Top Header Banner (First Page)
  ctx.fillStyle = '#D9443C';
  drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_W, 8, 4);
  ctx.fill();
  cursorY += 24;

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#D9443C';
  ctx.font = `800 36px ${FONT_FAMILY}`;
  ctx.fillText('برنامه درسی هفتگی', PAGE_W - MARGIN_X, cursorY);

  // Summary metrics on the left side of the header
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3F3F46';
  ctx.font = `600 20px ${FONT_FAMILY}`;
  const summaryLine = `کل هفته: ${toPersianDigits(data.totalCount)}   |   انجام‌شده: ${toPersianDigits(
    data.completedCount,
  )}   |   باقی‌مانده: ${toPersianDigits(data.pendingCount)}`;
  ctx.fillText(summaryLine, MARGIN_X, cursorY + 12);

  cursorY += 52;

  ctx.textAlign = 'right';
  ctx.fillStyle = '#52525B';
  ctx.font = `500 21px ${FONT_FAMILY}`;
  ctx.fillText(`${data.jalaliSpan}   /   ${data.gregorianSpan}`, PAGE_W - MARGIN_X, cursorY);

  cursorY += 42;

  // Divider
  ctx.strokeStyle = '#E4E4E7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, cursorY);
  ctx.lineTo(PAGE_W - MARGIN_X, cursorY);
  ctx.stroke();
  cursorY += 28;

  const ensureSpace = (neededHeight: number): void => {
    if (cursorY + neededHeight > BOTTOM_LIMIT) {
      const next = createPageCanvas();
      ctx = next.ctx;
      cursorY = TOP_Y;
    }
  };

  for (const { day, tasks } of data.days) {
    // Ensure at least day header + first row / empty state fit cleanly together
    const headerHeight = 56;
    const minBlockHeight = headerHeight + (tasks.length === 0 ? 58 : 90);
    ensureSpace(minBlockHeight);

    // Day Header Strip
    ctx.fillStyle = '#F4F4F6';
    drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_W, headerHeight, 12);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#18181B';
    ctx.font = `700 24px ${FONT_FAMILY}`;
    ctx.fillText(day.persianWeekday, PAGE_W - MARGIN_X - 20, cursorY + 13);

    const weekdayWidth = ctx.measureText(day.persianWeekday).width;
    ctx.fillStyle = '#52525B';
    ctx.font = `500 18px ${FONT_FAMILY}`;
    ctx.fillText(
      `${day.jalaliFormatted}  ·  ${day.gregorianFormattedEn}`,
      PAGE_W - MARGIN_X - 20 - weekdayWidth - 20,
      cursorY + 18,
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = '#71717A';
    ctx.font = `600 18px ${FONT_FAMILY}`;
    ctx.fillText(`${toPersianDigits(tasks.length)} مورد`, MARGIN_X + 20, cursorY + 18);

    cursorY += headerHeight + 12;

    if (tasks.length === 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#71717A';
      ctx.font = `400 18px ${FONT_FAMILY}`;
      ctx.fillText('تکلیفی برای این روز ثبت نشده است.', PAGE_W - MARGIN_X - 20, cursorY + 6);
      cursorY += 44;
      continue;
    }

    for (const task of tasks) {
      const textMaxW = CONTENT_W - 88;
      ctx.font = `600 21px ${FONT_FAMILY}`;
      const prefix =
        !task.completed && task.priority === 'high'
          ? '!!! '
          : !task.completed && task.priority === 'medium'
            ? '!! '
            : '';
      const titleLines = wrapCanvasText(ctx, `${prefix}${task.title}`, textMaxW);

      ctx.font = `400 17px ${FONT_FAMILY}`;
      const noteLines = task.notes ? wrapCanvasText(ctx, task.notes, textMaxW) : [];

      const rowHeight =
        20 +
        titleLines.length * 30 +
        (noteLines.length > 0 ? noteLines.length * 24 + 6 : 0) +
        30 +
        14;

      ensureSpace(rowHeight + 10);

      // Soft task card
      ctx.fillStyle = '#FAFAFB';
      drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_W, rowHeight, 12);
      ctx.fill();
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Circular checkbox on right side (RTL)
      const circleX = PAGE_W - MARGIN_X - 28;
      const circleY = cursorY + 32;
      ctx.beginPath();
      ctx.arc(circleX, circleY, 11, 0, Math.PI * 2);
      if (task.completed) {
        ctx.fillStyle = task.subjectColor || '#1E8A4C';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(circleX - 5, circleY);
        ctx.lineTo(circleX - 1, circleY + 4);
        ctx.lineTo(circleX + 6, circleY - 4);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#A1A1AA';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Task Title
      let innerY = cursorY + 18;
      const textRightX = PAGE_W - MARGIN_X - 56;
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `600 21px ${FONT_FAMILY}`;
      ctx.fillStyle = task.completed ? '#71717A' : '#18181B';
      for (const line of titleLines) {
        ctx.fillText(line, textRightX, innerY);
        if (task.completed) {
          const lineW = ctx.measureText(line).width;
          ctx.strokeStyle = '#71717A';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(textRightX, innerY + 13);
          ctx.lineTo(textRightX - lineW, innerY + 13);
          ctx.stroke();
        }
        innerY += 30;
      }

      // Notes
      if (noteLines.length > 0) {
        innerY += 4;
        ctx.font = `400 17px ${FONT_FAMILY}`;
        ctx.fillStyle = '#52525B';
        for (const line of noteLines) {
          ctx.fillText(line, textRightX, innerY);
          innerY += 24;
        }
      }

      // Metadata line: Subject dot + Subject name · Priority · Reminder
      innerY += 6;
      ctx.beginPath();
      ctx.arc(textRightX - 5, innerY + 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = task.subjectColor || '#64748B';
      ctx.fill();

      const metaParts = [task.subjectName, PRIORITY_LABELS[task.priority]];
      if (task.reminderText) {
        metaParts.push(`یادآور ${toPersianDigits(task.reminderText)}`);
      }
      ctx.font = `500 16px ${FONT_FAMILY}`;
      ctx.fillStyle = '#52525B';
      ctx.fillText(metaParts.join('   ·   '), textRightX - 18, innerY);

      cursorY += rowHeight + 10;
    }

    cursorY += 12;
  }

  // Draw clean page footers on all generated pages
  const totalPages = pages.length;
  pages.forEach((canvas, idx) => {
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return;
    pCtx.direction = 'rtl';
    pCtx.strokeStyle = '#E4E4E7';
    pCtx.lineWidth = 1.2;
    pCtx.beginPath();
    pCtx.moveTo(MARGIN_X, PAGE_H - 64);
    pCtx.lineTo(PAGE_W - MARGIN_X, PAGE_H - 64);
    pCtx.stroke();

    pCtx.fillStyle = '#71717A';
    pCtx.font = `500 16px ${FONT_FAMILY}`;
    pCtx.textAlign = 'right';
    pCtx.fillText('برنامه‌ریز درسی هفتگی — Weekly Study Planner', PAGE_W - MARGIN_X, PAGE_H - 46);

    pCtx.textAlign = 'left';
    pCtx.fillText(
      `صفحه ${toPersianDigits(idx + 1)} از ${toPersianDigits(totalPages)}`,
      MARGIN_X,
      PAGE_H - 46,
    );
  });

  // Assemble multi-page A4 PDF (dynamically load jsPDF on demand)
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((canvas, idx) => {
    if (idx > 0) {
      pdf.addPage('a4', 'portrait');
    }
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const arrayBuffer = pdf.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

function triggerBrowserPdfDownload(filename: string, pdfBytes: Uint8Array): void {
  const safeCopy = new Uint8Array(pdfBytes.byteLength);
  safeCopy.set(pdfBytes);
  const blob = new Blob([safeCopy.buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export async function exportSchedulePdfFile(
  data: PrintableWeekData,
  weekStartISO: string,
): Promise<ExportSaveResult> {
  const filename = buildSchedulePdfFilename(weekStartISO);
  const pdfBytes = await generatePrintableWeekPdfBytes(data);

  return saveExportFile({
    filename,
    mimeType: 'application/pdf',
    data: pdfBytes,
    fallbackBrowserDownload: () => triggerBrowserPdfDownload(filename, pdfBytes),
  });
}
