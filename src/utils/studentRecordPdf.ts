import { jsPDF } from 'jspdf';
import latinFontUrl from '../assets/fonts/NotoSans-Regular.ttf?url';
import ethiopicFontUrl from '../assets/fonts/NotoSansEthiopic-Regular.ttf?url';
import type { ExcelSheet } from './exportUtils';

const LATIN_FONT = 'RecordNotoSans';
const ETHIOPIC_FONT = 'RecordNotoEthiopic';
type FontName = typeof LATIN_FONT | typeof ETHIOPIC_FONT;
type TextRun = { font: FontName; text: string };

let fontDataPromise: Promise<[string, string]> | undefined;

const fetchFont = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Unable to load the student record PDF font.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  // jsPDF accepts a binary string. Small chunks avoid argument-size limits.
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  return chunks.join('');
};

const loadFonts = (): Promise<[string, string]> => {
  fontDataPromise ??= Promise.all([fetchFont(latinFontUrl), fetchFont(ethiopicFontUrl)])
    .catch(error => {
      fontDataPromise = undefined;
      throw error;
    });
  return fontDataPromise;
};

const fontFor = (character: string): FontName => {
  const code = character.codePointAt(0)!;
  return (code >= 0x1200 && code <= 0x139f)
    || (code >= 0x2d80 && code <= 0x2ddf)
    || (code >= 0xab00 && code <= 0xab2f) ? ETHIOPIC_FONT : LATIN_FONT;
};

const textRuns = (value: string): TextRun[] => {
  const runs: TextRun[] = [];
  for (const character of value) {
    const font = fontFor(character);
    const previous = runs[runs.length - 1];
    if (previous?.font === font) previous.text += character;
    else runs.push({ font, text: character });
  }
  return runs;
};

const plainText = (value: unknown): string => String(value ?? '')
  .replace(/\r\n?/g, '\n').replace(/\t/g, '    ')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

/** Builds a selectable-text PDF. Downloading and browser printing stay with the caller. */
export const buildStudentRecordPdf = async (sheet: ExcelSheet): Promise<Blob> => {
  const [latinFont, ethiopicFont] = await loadFonts();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', latinFont);
  doc.addFont('NotoSans-Regular.ttf', LATIN_FONT, 'normal');
  doc.addFileToVFS('NotoSansEthiopic-Regular.ttf', ethiopicFont);
  doc.addFont('NotoSansEthiopic-Regular.ttf', ETHIOPIC_FONT, 'normal');
  const title = plainText(sheet.report?.title || sheet.name);
  const identity = plainText(sheet.report?.subtitle);
  doc.setProperties({ title, subject: identity, creator: 'Ziquala Abo School Portal' });

  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - margin * 2;
  const bottom = pageHeight - 19;
  const fieldWidth = 52;
  const gutter = 6;
  const valueWidth = width - fieldWidth - gutter - 6;
  const lineHeight = 5;
  const rowPadding = 2.5;
  const widths = new Map<string, number>();

  const measure = (text: string, size: number): number => {
    let total = 0;
    doc.setFontSize(size);
    for (const character of text) {
      const font = fontFor(character);
      const key = `${size}:${character}`;
      let characterWidth = widths.get(key);
      if (characterWidth === undefined) {
        doc.setFont(font);
        characterWidth = doc.getTextWidth(character);
        widths.set(key, characterWidth);
      }
      total += characterWidth;
    }
    return total;
  };

  const wrap = (text: string, maxWidth: number, size: number): string[] => {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      let lineWidth = 0;
      for (const token of paragraph.match(/\s+|\S+/gu) || []) {
        const tokenWidth = measure(token, size);
        if (line && lineWidth + tokenWidth > maxWidth) {
          lines.push(line.trimEnd());
          line = '';
          lineWidth = 0;
        }
        if (!line && /^\s+$/u.test(token)) continue;
        if (tokenWidth <= maxWidth) {
          line += token;
          lineWidth += tokenWidth;
        } else {
          // Addresses, references and filenames may contain no breakable spaces.
          for (const character of token) {
            const characterWidth = measure(character, size);
            if (line && lineWidth + characterWidth > maxWidth) {
              lines.push(line.trimEnd());
              line = '';
              lineWidth = 0;
            }
            line += character;
            lineWidth += characterWidth;
          }
        }
      }
      lines.push(line.trimEnd());
    }
    return lines;
  };

  const drawLine = (text: string, x: number, y: number, size: number) => {
    doc.setFontSize(size);
    for (const run of textRuns(text)) {
      doc.setFont(run.font);
      doc.text(run.text, x, y);
      x += measure(run.text, size);
    }
  };

  const headerLines = (text: string, size: number, limit: number): string[] => {
    const lines = wrap(text, width, size);
    if (lines.length <= limit) return lines;
    const last = Array.from(lines[limit - 1]);
    while (last.length && measure(`${last.join('')}…`, size) > width) last.pop();
    return [...lines.slice(0, limit - 1), `${last.join('')}…`];
  };

  let y = margin;
  let contentTop = margin;
  const drawHeader = (first: boolean) => {
    y = margin + 4;
    doc.setTextColor(23, 37, 84);
    const titleSize = first ? 16 : 11;
    for (const line of headerLines(title, titleSize, 2)) {
      drawLine(line, margin, y, titleSize);
      y += first ? 7 : 5;
    }
    doc.setTextColor(71, 85, 105);
    for (const line of headerLines(identity, 9, 3)) {
      drawLine(line, margin, y, 9);
      y += 4.5;
    }
    y += 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    contentTop = y;
  };

  const startPage = () => {
    doc.addPage();
    drawHeader(false);
  };

  const sectionLines = (section: string) => wrap(section, width - 6, 10.5);
  const sectionHeight = (section: string) => sectionLines(section).length * 5 + 5;
  const drawSection = (section: string) => {
    const lines = sectionLines(section);
    const height = lines.length * 5 + 5;
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y, width, height, 'F');
    doc.setTextColor(30, 64, 175);
    lines.forEach((line, index) => drawLine(line, margin + 3, y + 6 + index * 5, 10.5));
    y += height;
  };

  drawHeader(true);
  let currentSection: string | undefined;
  for (const row of sheet.rows || []) {
    const section = plainText(row.section);
    const labels = wrap(plainText(row.field), fieldWidth, 9);
    const values = wrap(plainText(row.value), valueWidth, 10);
    const totalLines = Math.max(labels.length, values.length);
    const rowHeight = totalLines * lineHeight + rowPadding * 2;
    const headingHeight = sectionHeight(section);
    if (section !== currentSection) {
      if (currentSection !== undefined) y += 5;
      // Keep a heading with its first row, or two lines for a row taller than a page.
      const firstRowSpace = rowHeight <= bottom - contentTop - headingHeight
        ? rowHeight : Math.min(totalLines, 2) * lineHeight + rowPadding * 2;
      if (y + headingHeight + firstRowSpace > bottom) startPage();
      drawSection(section);
      currentSection = section;
    }

    // Move ordinary rows intact; exceptionally long notes are split over pages.
    if (y + rowHeight > bottom && rowHeight <= bottom - contentTop - headingHeight
      && y > contentTop + headingHeight) {
      startPage();
      drawSection(section);
    }
    let offset = 0;
    while (offset < totalLines) {
      let availableLines = Math.floor((bottom - y - rowPadding * 2) / lineHeight);
      if (availableLines < 1) {
        startPage();
        drawSection(section);
        availableLines = Math.floor((bottom - y - rowPadding * 2) / lineHeight);
      }
      const count = Math.min(totalLines - offset, availableLines);
      const height = count * lineHeight + rowPadding * 2;
      for (let index = 0; index < count; index += 1) {
        const baseline = y + rowPadding + 3.7 + index * lineHeight;
        doc.setTextColor(71, 85, 105);
        // Repeat a completed field label when its value continues on another page.
        const labelIndex = offset >= labels.length ? index : offset + index;
        drawLine(labels[labelIndex] || '', margin + 3, baseline, 9);
        doc.setTextColor(23, 32, 51);
        drawLine(values[offset + index] || '', margin + fieldWidth + gutter + 3, baseline, 10);
      }
      y += height;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      offset += count;
      if (offset < totalLines) {
        startPage();
        drawSection(section);
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(100, 116, 139);
    const pageLabel = `${page} / ${pageCount}`;
    drawLine(pageLabel, (pageWidth - measure(pageLabel, 8)) / 2, pageHeight - 9, 8);
  }
  return doc.output('blob');
};
