import { uiText } from '../localization';

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(header => '"' + uiText(header).replace(/"/g, '""') + '"').join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export type ExcelReportColumn = {
  key: string;
  header: string;
  width?: number;
  hyperlink?: boolean;
};

export type ExcelReportGroup = {
  label: string;
  color: string;
  tint: string;
  columns: ExcelReportColumn[];
};

export type ExcelReport = {
  title: string;
  subtitle: string;
  filters: string;
  groups: ExcelReportGroup[];
  freezeColumns?: number;
};

export type ExcelSheet = {
  name: string;
  rows?: Record<string, any>[];
  matrix?: any[][];
  report?: ExcelReport;
};

const textEncoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const escapeXml = (value: string) =>
  value
    // XML 1.0 permits tabs/newlines, but not control characters or lone surrogates.
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const columnName = (index: number) => {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const toCellXml = (ref: string, value: any, style?: number) => {
  const attributes = `r="${ref}"${style === undefined ? '' : ` s="${style}"`}`;
  if (value === null || value === undefined || value === '') {
    return `<c ${attributes}/>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c ${attributes}><v>${value}</v></c>`;
  }

  if (typeof value === 'boolean') {
    return `<c ${attributes} t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return `<c ${attributes} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
};

const buildWorksheetXml = (sheet: ExcelSheet) => {
  let matrix: any[][] = [];

  if (sheet.matrix && sheet.matrix.length > 0) {
    matrix = sheet.matrix;
  } else if (sheet.rows && sheet.rows.length > 0) {
    const dataRows = sheet.rows;
    const headerSet = new Set<string>();
    dataRows.forEach((row) => {
      Object.keys(row).forEach((key) => headerSet.add(key));
    });
    const headers = Array.from(headerSet);
    matrix.push(headers.map(h => uiText(h)));
    dataRows.forEach(row => {
      matrix.push(headers.map(h => row[h] ?? ''));
    });
  } else {
    matrix = [['No Data']];
  }

  const maxCols = Math.max(...matrix.map(row => row.length), 1);
  const columnWidths: number[] = [];

  for (let c = 0; c < maxCols; c++) {
    let maxLen = 12;
    for (let r = 0; r < matrix.length; r++) {
      const val = matrix[r][c];
      if (val != null) {
        const strLen = String(val).length + 4;
        if (strLen > maxLen) maxLen = strLen;
      }
    }
    columnWidths.push(Math.min(maxLen, 40));
  }

  const colXml = columnWidths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');

  const xmlRows: string[] = [];
  matrix.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 1;
    const cellsXml = row.map((val, colIndex) => toCellXml(`${columnName(colIndex)}${excelRow}`, val)).join('');
    xmlRows.push(`<row r="${excelRow}">${cellsXml}</row>`);
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>${colXml}</cols>
  <sheetData>${xmlRows.join('')}</sheetData>
</worksheet>`;
};

const normalizeColor = (color: string, fallback: string) => {
  const hex = color.replace(/^#/, '');
  return /^[\da-f]{6}$/i.test(hex) ? hex.toUpperCase() : fallback;
};

const lighterColor = (color: string) =>
  [0, 2, 4].map(offset => {
    const channel = parseInt(color.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * 0.45).toString(16).padStart(2, '0');
  }).join('').toUpperCase();

const createWorkbookStyles = () => {
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>'
  ];
  const fillIds = new Map<string, number>();
  const addFill = (color: string) => {
    const existing = fillIds.get(color);
    if (existing !== undefined) return existing;
    const id = fills.length;
    fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`);
    fillIds.set(color, id);
    return id;
  };
  const styles = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const addStyle = (fontId: number, fillId: number, borderId: number, centered = false) => {
    const id = styles.length;
    styles.push(`<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="${centered ? 'center' : 'left'}" wrapText="1"/></xf>`);
    return id;
  };
  const title = addStyle(1, addFill('172554'), 0);
  const subtitle = addStyle(2, 0, 0);
  const filters = addStyle(2, addFill('F1F5F9'), 0);
  const addGroup = (group: ExcelReportGroup) => {
    const color = normalizeColor(group.color, '475569');
    const tint = normalizeColor(group.tint, 'F1F5F9');
    const headingFill = addFill(color);
    const bodyFills = [addFill(tint), addFill(lighterColor(tint))];
    return {
      group: addStyle(5, headingFill, 1, true),
      column: addStyle(3, headingFill, 1),
      body: bodyFills.map(fillId => addStyle(0, fillId, 1)),
      link: bodyFills.map(fillId => addStyle(4, fillId, 1))
    };
  };
  const toXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <font><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
    <font><u/><sz val="11"/><color rgb="FF1D4ED8"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="${fills.length}">${fills.join('')}</fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${styles.length}">${styles.join('')}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  return { title, subtitle, filters, addGroup, toXml };
};

const safeHyperlink = (value: unknown) => {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007F]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const reportGroups = (sheet: ExcelSheet) => sheet.report?.groups.filter(group => group.columns.length > 0) ?? [];

const buildReportWorksheet = (sheet: ExcelSheet, styles: ReturnType<typeof createWorkbookStyles>) => {
  const report = sheet.report!;
  const groups = reportGroups(sheet);
  const columns = groups.flatMap(group => {
    const groupStyles = styles.addGroup(group);
    return group.columns.map(column => ({
      ...column,
      width: Number.isFinite(column.width) ? Math.min(80, Math.max(10, column.width!)) : 24,
      styles: groupStyles
    }));
  });
  const lastColumn = columnName(columns.length - 1);
  const dataRows = sheet.rows ?? [];
  const lastRow = dataRows.length + 5;
  const freezeColumns = Math.min(columns.length, Math.max(0, Math.floor(report.freezeColumns ?? 2)));
  const firstVisibleCell = `${columnName(freezeColumns)}6`;
  const merges: string[] = [];
  const rows: string[] = [];
  const fullWidthRow = (rowNumber: number, value: string, style: number, height: number) => {
    rows.push(`<row r="${rowNumber}" ht="${height}" customHeight="1">${columns.map((_, index) => toCellXml(`${columnName(index)}${rowNumber}`, index === 0 ? value : '', style)).join('')}</row>`);
    if (columns.length > 1) merges.push(`A${rowNumber}:${lastColumn}${rowNumber}`);
  };
  fullWidthRow(1, report.title, styles.title, 36);
  fullWidthRow(2, report.subtitle, styles.subtitle, 26);
  fullWidthRow(3, report.filters, styles.filters, 28);
  let columnOffset = 0;
  const groupCells: string[] = [];
  groups.forEach(group => {
    const endOffset = columnOffset + group.columns.length - 1;
    if (endOffset > columnOffset) merges.push(`${columnName(columnOffset)}4:${columnName(endOffset)}4`);
    group.columns.forEach((_, index) => groupCells.push(toCellXml(`${columnName(columnOffset + index)}4`, index === 0 ? uiText(group.label) : '', columns[columnOffset].styles.group)));
    columnOffset = endOffset + 1;
  });
  rows.push(`<row r="4" ht="28" customHeight="1">${groupCells.join('')}</row>`);
  rows.push(`<row r="5" ht="42" customHeight="1">${columns.map((column, index) => toCellXml(`${columnName(index)}5`, uiText(column.header), column.styles.column)).join('')}</row>`);

  const links: { ref: string; target: string }[] = [];
  dataRows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 6;
    let height = 30;
    const cells = columns.map((column, columnIndex) => {
      const value = row[column.key] ?? '';
      const ref = `${columnName(columnIndex)}${rowNumber}`;
      const target = column.hyperlink ? safeHyperlink(value) : undefined;
      if (target) links.push({ ref, target });
      const lineCount = String(value).split(/\r?\n/).reduce((count, line) => count + Math.max(1, Math.ceil(line.length / (column.width - 2))), 0);
      height = Math.max(height, Math.min(108, lineCount * 15 + 10));
      return toCellXml(ref, value, (target ? column.styles.link : column.styles.body)[rowIndex % 2]);
    }).join('');
    rows.push(`<row r="${rowNumber}" ht="${height}" customHeight="1">${cells}</row>`);
  });
  const pane = freezeColumns > 0 ? 'bottomRight' : 'bottomLeft';
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ${freezeColumns > 0 ? `xSplit="${freezeColumns}" ` : ''}ySplit="5" topLeftCell="${firstVisibleCell}" activePane="${pane}" state="frozen"/>${freezeColumns > 0 ? `<selection pane="topRight" activeCell="${columnName(freezeColumns)}1" sqref="${columnName(freezeColumns)}1"/><selection pane="bottomLeft" activeCell="A6" sqref="A6"/>` : ''}<selection pane="${pane}" activeCell="${firstVisibleCell}" sqref="${firstVisibleCell}"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="30"/>
  <cols>${columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join('')}</cols>
  <sheetData>${rows.join('')}</sheetData>
  <autoFilter ref="A5:${lastColumn}${lastRow}"/>
  ${merges.length ? `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>` : ''}
  ${links.length ? `<hyperlinks>${links.map((link, index) => `<hyperlink ref="${link.ref}" r:id="rId${index + 1}"/>`).join('')}</hyperlinks>` : ''}
  <printOptions headings="0" gridLines="0"/>
  <pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" scale="85"/>
  <headerFooter><oddFooter>&amp;LZiquala Abo School Portal&amp;CPage &amp;P of &amp;N&amp;R&amp;D</oddFooter></headerFooter>
</worksheet>`;
  const relationships = links.length ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links.map((link, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(link.target)}" TargetMode="External"/>`).join('')}</Relationships>` : undefined;
  return { xml, relationships };
};

const buildZip = (files: { name: string; content: Uint8Array }[]) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  const pushU16 = (arr: number[], value: number) => {
    arr.push(value & 0xff, (value >>> 8) & 0xff);
  };

  const pushU32 = (arr: number[], value: number) => {
    arr.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  };

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const crc = crc32(file.content);
    const localHeader: number[] = [];
    pushU32(localHeader, 0x04034b50);
    pushU16(localHeader, 20);
    pushU16(localHeader, 0);
    pushU16(localHeader, 0);
    pushU16(localHeader, 0);
    pushU16(localHeader, 0);
    pushU32(localHeader, crc);
    pushU32(localHeader, file.content.length);
    pushU32(localHeader, file.content.length);
    pushU16(localHeader, nameBytes.length);
    pushU16(localHeader, 0);

    const localHeaderBytes = new Uint8Array(localHeader);
    localParts.push(localHeaderBytes, nameBytes, file.content);

    const centralHeader: number[] = [];
    pushU32(centralHeader, 0x02014b50);
    pushU16(centralHeader, 20);
    pushU16(centralHeader, 20);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU32(centralHeader, crc);
    pushU32(centralHeader, file.content.length);
    pushU32(centralHeader, file.content.length);
    pushU16(centralHeader, nameBytes.length);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU32(centralHeader, 0);
    pushU32(centralHeader, offset);

    centralParts.push(new Uint8Array(centralHeader), nameBytes);
    offset += localHeaderBytes.length + nameBytes.length + file.content.length;
  }

  const centralDirectory = new Uint8Array(centralParts.reduce((sum, part) => sum + part.length, 0));
  let centralOffset = 0;
  for (const part of centralParts) {
    centralDirectory.set(part, centralOffset);
    centralOffset += part.length;
  }

  const localData = new Uint8Array(localParts.reduce((sum, part) => sum + part.length, 0));
  let localOffset = 0;
  for (const part of localParts) {
    localData.set(part, localOffset);
    localOffset += part.length;
  }

  const endRecord: number[] = [];
  pushU32(endRecord, 0x06054b50);
  pushU16(endRecord, 0);
  pushU16(endRecord, 0);
  pushU16(endRecord, files.length);
  pushU16(endRecord, files.length);
  pushU32(endRecord, centralDirectory.length);
  pushU32(endRecord, localData.length);
  pushU16(endRecord, 0);

  const endRecordBytes = new Uint8Array(endRecord);
  const zip = new Uint8Array(localData.length + centralDirectory.length + endRecordBytes.length);
  zip.set(localData, 0);
  zip.set(centralDirectory, localData.length);
  zip.set(endRecordBytes, localData.length + centralDirectory.length);
  return zip;
};

/** Build the XLSX bytes without browser APIs so reports can also be inspected or stored. */
export const buildExcelWorkbook = (sheets: ExcelSheet[]): Uint8Array => {
  if (sheets.length === 0) throw new Error('An Excel workbook requires at least one sheet.');
  const styles = createWorkbookStyles();
  const worksheets = sheets.map(sheet => reportGroups(sheet).length
    ? buildReportWorksheet(sheet, styles)
    : { xml: buildWorksheetXml(sheet), relationships: undefined });
  const definedNames = sheets.flatMap((sheet, index) => {
    const groups = reportGroups(sheet);
    if (!groups.length) return [];
    const columnCount = groups.reduce((count, group) => count + group.columns.length, 0);
    const frozen = Math.min(columnCount, Math.max(0, Math.floor(sheet.report!.freezeColumns ?? 2)));
    const quotedName = `'${sheet.name.slice(0, 31).replace(/'/g, "''")}'`;
    const printTitles = `${quotedName}!$1:$5${frozen > 0 ? `,${quotedName}!$A:$${columnName(frozen - 1)}` : ''}`;
    const printArea = `${quotedName}!$A$1:$${columnName(columnCount - 1)}$${(sheet.rows?.length ?? 0) + 5}`;
    return [
      `<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${escapeXml(printTitles)}</definedName>`,
      `<definedName name="_xlnm.Print_Area" localSheetId="${index}">${escapeXml(printArea)}</definedName>`
    ];
  });

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets>
    ${sheets
      .map((sheet, index) => `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join('')}
  </sheets>
  ${definedNames.length ? `<definedNames>${definedNames.join('')}</definedNames>` : ''}
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
      .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
      .join('')}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${sheets
      .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('')}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const now = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Ziquala Abo School Portal</dc:creator>
  <cp:lastModifiedBy>Ziquala Abo School Portal</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Ziquala Abo School Portal</Application>
</Properties>`;

  const files = [
    { name: '[Content_Types].xml', content: textEncoder.encode(contentTypes) },
    { name: '_rels/.rels', content: textEncoder.encode(rootRels) },
    { name: 'docProps/core.xml', content: textEncoder.encode(coreXml) },
    { name: 'docProps/app.xml', content: textEncoder.encode(appXml) },
    { name: 'xl/workbook.xml', content: textEncoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', content: textEncoder.encode(workbookRels) },
    { name: 'xl/styles.xml', content: textEncoder.encode(styles.toXml()) },
    ...worksheets.flatMap((worksheet, index) => [
      { name: `xl/worksheets/sheet${index + 1}.xml`, content: textEncoder.encode(worksheet.xml) },
      ...(worksheet.relationships ? [{ name: `xl/worksheets/_rels/sheet${index + 1}.xml.rels`, content: textEncoder.encode(worksheet.relationships) }] : [])
    ])
  ];

  return buildZip(files);
};

export const exportToExcel = (sheets: ExcelSheet[], filename: string) => {
  if (sheets.length === 0) return;
  const zipBytes = buildExcelWorkbook(sheets);
  const blob = new Blob([new Uint8Array(zipBytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
