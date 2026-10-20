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

/** Builds the compact A4 admission form with selectable text and safe overflow pages. */
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

  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - margin * 2;
  const bottom = pageHeight - 15;
  const columnGap = 5;
  const columnWidth = (width - columnGap) / 2;
  const sectionGap = 3;
  const gutter = 2;
  const lineHeight = 4.2;
  const rowPadding = .85;
  const cellPadding = .6;
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
    y = margin + 4.5;
    doc.setTextColor(23, 37, 84);
    const titleSize = first ? 14 : 11;
    for (const line of headerLines(title, titleSize, 2)) {
      drawLine(line, margin, y, titleSize);
      y += first ? 6 : 5;
    }
    doc.setTextColor(71, 85, 105);
    for (const line of headerLines(identity, 9.5, 3)) {
      drawLine(line, margin, y, 9.5);
      y += lineHeight;
    }
    y += 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
    contentTop = y;
  };

  const startPage = () => {
    doc.addPage();
    drawHeader(false);
  };

  type Section = { title: string; fields: { label: string; value: string }[] };
  const sections: Section[] = [];
  for (const row of sheet.rows || []) {
    const sectionTitle = plainText(row.section);
    if (sections[sections.length - 1]?.title !== sectionTitle) {
      sections.push({ title: sectionTitle, fields: [] });
    }
    sections[sections.length - 1].fields.push({ label: plainText(row.field), value: plainText(row.value) });
  }

  const layoutSection = (section: Section, blockWidth: number) => {
    const fieldWidth = (blockWidth - cellPadding * 2 - gutter) / 2.4;
    const valueWidth = blockWidth - cellPadding * 2 - gutter - fieldWidth;
    const heading = wrap(section.title, blockWidth - 2.8, 9.5);
    const headingHeight = heading.length * lineHeight + 2.4;
    const fields = section.fields.map(field => {
      const labels = wrap(field.label, fieldWidth, 9);
      const values = wrap(field.value, valueWidth, 9.5);
      const totalLines = Math.max(labels.length, values.length);
      return { labels, values, totalLines, height: totalLines * lineHeight + rowPadding * 2 };
    });
    return {
      blockWidth, fieldWidth, heading, headingHeight, fields,
      height: headingHeight + fields.reduce((sum, field) => sum + field.height, 0),
    };
  };
  type SectionLayout = ReturnType<typeof layoutSection>;
  type FieldLayout = SectionLayout['fields'][number];

  const drawSectionHeading = (layout: SectionLayout, x: number, top: number) => {
    doc.setFillColor(239, 246, 255);
    doc.rect(x, top, layout.blockWidth, layout.headingHeight, 'F');
    doc.setTextColor(30, 64, 175);
    layout.heading.forEach((line, index) => drawLine(line, x + 1.4, top + 4.2 + index * lineHeight, 9.5));
  };

  const drawField = (layout: SectionLayout, field: FieldLayout, x: number, top: number, offset: number, count: number) => {
    for (let index = 0; index < count; index += 1) {
      const baseline = top + rowPadding + 3.2 + index * lineHeight;
      doc.setTextColor(71, 85, 105);
      const labelIndex = offset >= field.labels.length ? index : offset + index;
      drawLine(field.labels[labelIndex] || '', x + cellPadding, baseline, 9);
      doc.setTextColor(23, 32, 51);
      drawLine(field.values[offset + index] || '', x + cellPadding + layout.fieldWidth + gutter, baseline, 9.5);
    }
    const end = top + count * lineHeight + rowPadding * 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(x, end, x + layout.blockWidth, end);
    return end;
  };

  const drawCompactSection = (layout: SectionLayout, x: number, top: number) => {
    drawSectionHeading(layout, x, top);
    let fieldY = top + layout.headingHeight;
    for (const field of layout.fields) {
      fieldY = drawField(layout, field, x, fieldY, 0, field.totalLines);
    }
  };

  // Exceptional notes use the full width and can continue across pages. Never
  // shrink the whole form, truncate values, or leave a row below the page edge.
  const drawFlowingSection = (section: Section) => {
    const layout = layoutSection(section, width);
    const firstFieldHeight = layout.fields[0]?.height || 0;
    const firstFieldSpace = firstFieldHeight <= bottom - contentTop - layout.headingHeight
      ? firstFieldHeight : Math.min(firstFieldHeight, lineHeight * 2 + rowPadding * 2);
    if (y + layout.headingHeight + firstFieldSpace > bottom) startPage();
    drawSectionHeading(layout, margin, y);
    y += layout.headingHeight;
    for (const field of layout.fields) {
      if (y + field.height > bottom && field.height <= bottom - contentTop - layout.headingHeight
        && y > contentTop + layout.headingHeight) {
        startPage();
        drawSectionHeading(layout, margin, y);
        y += layout.headingHeight;
      }
      let offset = 0;
      while (offset < field.totalLines) {
        let availableLines = Math.floor((bottom - y - rowPadding * 2) / lineHeight);
        if (availableLines < 1) {
          startPage();
          drawSectionHeading(layout, margin, y);
          y += layout.headingHeight;
          availableLines = Math.floor((bottom - y - rowPadding * 2) / lineHeight);
        }
        const count = Math.min(field.totalLines - offset, availableLines);
        y = drawField(layout, field, margin, y, offset, count);
        offset += count;
      }
    }
    y += sectionGap;
  };

  drawHeader(true);
  for (let index = 0; index < sections.length; index += 2) {
    const pair = sections.slice(index, index + 2);
    const layouts = pair.map(section => layoutSection(section, columnWidth));
    const height = Math.max(...layouts.map(layout => layout.height));
    if (height > bottom - contentTop) {
      pair.forEach(drawFlowingSection);
      continue;
    }
    if (y + height > bottom) startPage();
    layouts.forEach((layout, column) => drawCompactSection(layout, margin + column * (columnWidth + columnGap), y));
    y += height + sectionGap;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    doc.setTextColor(100, 116, 139);
    const pageLabel = `${page} / ${pageCount}`;
    drawLine(pageLabel, (pageWidth - measure(pageLabel, 8)) / 2, pageHeight - 7, 8);
  }
  return doc.output('blob');
};
