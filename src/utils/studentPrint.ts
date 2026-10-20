import { localeTag, uiText } from '../localization';
import type { ExcelReportColumn, ExcelReportGroup, ExcelSheet } from './exportUtils';

type PrintColumn = { column: ExcelReportColumn; group: ExcelReportGroup; groupIndex: number };

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const color = (value: string, fallback: string): string => {
  const hex = value.replace(/^#/, '');
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex}` : fallback;
};

const columnWidth = ({ column }: PrintColumn): number =>
  Math.max(18, Math.min(42, Number.isFinite(column.width) ? column.width! : 24));

/** Keep readable column widths on landscape paper, repeating only selected identity columns. */
const partitionColumns = (columns: PrintColumn[]): PrintColumn[][] => {
  const identity = columns.filter(({ column }) => column.key === 'studentId' || column.key === 'name');
  const details = columns.filter(({ column }) => column.key !== 'studentId' && column.key !== 'name');
  if (!details.length) return [identity];

  const bands: PrintColumn[][] = [];
  let band = [...identity];
  let width = identity.reduce((sum, item) => sum + columnWidth(item), 0);
  for (const item of details) {
    const nextWidth = columnWidth(item);
    if (band.length > identity.length && (width + nextWidth > 152 || band.length >= 6)) {
      bands.push(band);
      band = [...identity];
      width = identity.reduce((sum, identityColumn) => sum + columnWidth(identityColumn), 0);
    }
    band.push(item);
    width += nextWidth;
  }
  bands.push(band);
  return bands;
};

const valueMarkup = (value: unknown, hyperlink?: boolean): string => {
  const text = String(value ?? '');
  if (hyperlink && text) {
    try {
      const url = new URL(text);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
      }
    } catch {
      // Invalid links remain readable text, as do URLs with unsupported protocols.
    }
  }
  return escapeHtml(text);
};

/** Build a self-contained preview; all user-controlled content is escaped before insertion. */
export const buildStudentPrintHtml = (sheet: ExcelSheet): string => {
  const report = sheet.report;
  const columns = report?.groups.flatMap((group, groupIndex) =>
    group.columns.map(column => ({ column, group, groupIndex }))) || [];
  if (!report || !columns.length) throw new Error(uiText('Select at least one column to print.'));
  if (!sheet.rows?.length) throw new Error(uiText('No students to print.'));

  const rows = sheet.rows;
  const bands = partitionColumns(columns);
  const tables = bands.map((band, bandIndex) => {
    const section = uiText('Section {{current}} of {{total}}', { current: bandIndex + 1, total: bands.length });
    const totalWidth = band.reduce((sum, item) => sum + columnWidth(item), 0);
    const groupSpans: { group: ExcelReportGroup; groupIndex: number; length: number }[] = [];
    for (const item of band) {
      const previous = groupSpans[groupSpans.length - 1];
      if (previous?.groupIndex === item.groupIndex) previous.length += 1;
      else groupSpans.push({ group: item.group, groupIndex: item.groupIndex, length: 1 });
    }
    const groups = groupSpans.map(({ group, length }) =>
      `<th scope="colgroup" colspan="${length}" style="background:${color(group.color, '#475569')}">${escapeHtml(group.label)}</th>`).join('');
    const headers = band.map(({ column, group }) =>
      `<th scope="col" data-column-key="${escapeHtml(column.key)}" style="background:${color(group.tint, '#F8FAFC')}">${escapeHtml(column.header)}</th>`).join('');
    const body = rows.map(row => `<tr>${band.map(({ column, group }) =>
      `<td style="background:${color(group.tint, '#F8FAFC')}">${valueMarkup(row[column.key], column.hyperlink)}</td>`).join('')}</tr>`).join('');
    const widths = band.map(item => `<col style="width:${(columnWidth(item) / totalWidth * 100).toFixed(2)}%">`).join('');

    return `<section class="report-section" data-print-band="${bandIndex + 1}" aria-label="${escapeHtml(section)}">
      <div class="section-heading"><h2>${escapeHtml(section)}</h2><span class="scroll-hint">${escapeHtml(uiText('Scroll sideways to see all columns.'))}</span></div>
      <div class="table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(section)}">
        <table style="--table-min-width:${Math.min(1000, Math.max(240, totalWidth * 6))}px">
          <colgroup>${widths}</colgroup>
          <thead>
            <tr class="table-context"><th colspan="${band.length}">${escapeHtml(report.title)} <span>· ${escapeHtml(section)}</span></th></tr>
            <tr class="group-headers">${groups}</tr>
            <tr class="column-headers">${headers}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
  }).join('');

  return `<!doctype html>
<html lang="${escapeHtml(localeTag())}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(report.title)} — ${escapeHtml(uiText('Print preview'))}</title>
  <style>
    * { box-sizing: border-box; }
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #172033; background: #f1f5f9; }
    body { margin: 0; min-width: 0; }
    button { font: inherit; cursor: pointer; min-height: 44px; border-radius: 12px; padding: 10px 18px; font-weight: 650; }
    button:focus-visible, .table-scroll:focus-visible { outline: 3px solid #818cf8; outline-offset: 3px; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 78px; padding: 14px max(20px, env(safe-area-inset-left)); background: #fff; border-bottom: 1px solid #e2e8f0; box-shadow: 0 3px 18px #0f172a08; }
    .toolbar-title { font-size: 17px; font-weight: 750; min-width: 0; }
    .toolbar-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .close-button { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
    .print-button { border: 1px solid #4f46e5; background: #4f46e5; color: #fff; }
    .print-button:hover { background: #4338ca; }
    .close-button:hover { background: #f8fafc; }
    main { max-width: 1200px; margin: 0 auto; padding: 102px 24px max(32px, env(safe-area-inset-bottom)); min-width: 0; }
    .report-summary { margin: 0 0 22px; }
    h1 { font-size: 26px; line-height: 1.3; margin: 0 0 8px; letter-spacing: -.5px; overflow-wrap: anywhere; }
    .subtitle, .filters { font-size: 13px; line-height: 1.65; color: #526178; margin: 4px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .guidance { padding: 14px 16px; margin: 18px 0 0; border-radius: 12px; color: #3730a3; background: #e0e7ff; font-size: 13px; line-height: 1.7; }
    .guidance p { margin: 0; }
    .report-section { margin: 22px 0; padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 16px #0f172a04; min-width: 0; }
    .section-heading { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    h2 { font-size: 15px; margin: 0; color: #334155; }
    .scroll-hint { font-size: 12px; color: #64748b; }
    .table-scroll { max-width: 100%; overflow: auto; border: 1px solid #dbe3ec; border-radius: 10px; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; }
    table { border-collapse: collapse; table-layout: fixed; width: 100%; min-width: var(--table-min-width); font-size: 12px; line-height: 1.5; }
    th, td { padding: 10px 12px; text-align: left; vertical-align: top; border: 1px solid #dbe3ec; white-space: pre-wrap; overflow-wrap: anywhere; word-break: normal; }
    .table-context th { padding: 12px; background: #fff; color: #334155; font-size: 12px; }
    .table-context span { font-weight: 400; color: #64748b; }
    .group-headers th { color: #fff; font-size: 12px; font-weight: 750; }
    .column-headers th { font-size: 11px; font-weight: 750; }
    tbody tr:nth-child(even) td { background-image: linear-gradient(#ffffff55, #ffffff55); }
    td a { color: #1d4ed8; text-decoration: underline; overflow-wrap: anywhere; }
    @media (max-width: 600px) {
      .toolbar { min-height: 76px; padding: 12px 14px; gap: 8px; }
      .toolbar-title { font-size: 15px; }
      .toolbar-actions { gap: 6px; }
      button { padding: 10px 13px; font-size: 14px; }
      main { padding: 96px 12px max(20px, env(safe-area-inset-bottom)); }
      h1 { font-size: 23px; }
      .report-section { padding: 12px; border-radius: 14px; margin: 16px 0; }
      .guidance { font-size: 12px; padding: 12px; }
      .section-heading { align-items: flex-start; flex-direction: column; }
    }
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      :root, body { background: #fff; color: #172033; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .toolbar, .guidance, .section-heading { display: none !important; }
      main { max-width: none; margin: 0; padding: 0; }
      h1 { font-size: 18pt; margin-bottom: 2mm; }
      .report-summary { margin-bottom: 5mm; }
      .subtitle, .filters { font-size: 9pt; line-height: 1.4; }
      .report-section { border: 0; border-radius: 0; box-shadow: none; margin: 0; padding: 0; }
      .report-section + .report-section { break-before: page; page-break-before: always; }
      .table-scroll { overflow: visible; border: 0; border-radius: 0; max-width: none; }
      table { min-width: 0; width: 100%; font-size: 9pt; line-height: 1.4; }
      thead { display: table-header-group; }
      tbody { display: table-row-group; }
      tr, td { break-inside: auto; page-break-inside: auto; }
      th, td { padding: 2.2mm; overflow: visible; }
      thead th { break-inside: avoid; }
      .table-context th { padding: 2mm; font-size: 8pt; }
      .group-headers th, .column-headers th { font-size: 8pt; }
      a { text-decoration: none; }
    }
  </style>
</head>
<body>
  <header class="toolbar">
    <div class="toolbar-title">${escapeHtml(uiText('Print preview'))}</div>
    <div class="toolbar-actions">
      <button class="close-button" id="close-preview" type="button">${escapeHtml(uiText('Close'))}</button>
      <button class="print-button" id="print-preview" type="button">${escapeHtml(uiText('Print'))}</button>
    </div>
  </header>
  <main>
    <div class="report-summary">
      <h1>${escapeHtml(report.title)}</h1>
      <p class="subtitle">${escapeHtml(report.subtitle)}</p>
      ${report.filters ? `<p class="filters"><strong>${escapeHtml(uiText('Filters'))}:</strong> ${escapeHtml(report.filters)}</p>` : ''}
      <div class="guidance">
        <p>${escapeHtml(uiText('Choose Print to print these students or save them as a PDF.'))}</p>
        ${bands.length > 1 ? `<p>${escapeHtml(uiText('Wide reports are split into sections to keep every column readable.'))}</p>` : ''}
      </div>
    </div>
    ${tables}
  </main>
  <script>
    document.getElementById('print-preview').addEventListener('click', function () { window.print(); });
    document.getElementById('close-preview').addEventListener('click', function () { window.close(); });
  </script>
</body>
</html>`;
};

/** The caller opens this window during the initial click, before loading export data. */
export const renderStudentPrintPreview = (previewWindow: Window, sheet: ExcelSheet): void => {
  const html = buildStudentPrintHtml(sheet);
  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
};
