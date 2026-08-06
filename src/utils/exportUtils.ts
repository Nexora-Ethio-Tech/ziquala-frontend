
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

type ExcelSheet = { name: string; rows: Record<string, any>[] };

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

const toCellXml = (ref: string, value: any) => {
  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}"/>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }

  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
};

const calculateColumnWidth = (value: any) => {
  const text = value == null ? '' : String(value);
  return Math.min(Math.max(text.length + 4, 12), 40);
};

const buildWorksheetXml = (rows: Record<string, any>[]) => {
  const dataRows = rows.length > 0 ? rows : [{}];
  const headerSet = new Set<string>();
  dataRows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key));
  });
  const headers = Array.from(headerSet);

  const columnWidths = headers.map((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...dataRows.map((row) => calculateColumnWidth(row[header]))
    );
    return Math.min(Math.max(maxLength, 12), 40);
  });

  const colXml = columnWidths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');

  const xmlRows = [];
  if (headers.length > 0) {
    xmlRows.push(
      `<row r="1">${headers.map((header, index) => toCellXml(`${columnName(index)}1`, header)).join('')}</row>`
    );

    dataRows.forEach((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      xmlRows.push(
        `<row r="${excelRow}">${headers
          .map((header, columnIndex) => toCellXml(`${columnName(columnIndex)}${excelRow}`, row[header]))
          .join('')}</row>`
      );
    });
  } else {
    xmlRows.push('<row r="1"/>');
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>${colXml}</cols>
  <sheetData>${xmlRows.join('')}</sheetData>
</worksheet>`;
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

export const exportToExcel = (sheets: ExcelSheet[], filename: string) => {
  if (sheets.length === 0) return;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map((sheet, index) => `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join('')}
  </sheets>
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

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;

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
    { name: 'xl/styles.xml', content: textEncoder.encode(stylesXml) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: textEncoder.encode(buildWorksheetXml(sheet.rows))
    }))
  ];

  const zipBytes = buildZip(files);
  const blob = new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
