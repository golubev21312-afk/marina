/**
 * Файл Excel (.xlsx) из таблицы — без библиотек. xlsx — это zip с
 * несколькими XML; пишем zip без сжатия: товаров немного, файл и так мал.
 * Один лист, первая строка — жирные заголовки, закреплена и с фильтром.
 */

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const escapeXml = (text) =>
  String(text)
    // Управляющие символы XML не допускает — Excel не откроет файл
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Номер столбца → буква: 0 → A, 1 → B… (столбцов у нас меньше 26). */
const column = (index) => String.fromCharCode(65 + index);

/** Ячейка: число — числом (Excel посчитает сумму), строка — текстом, пусто — без ячейки. */
function cell(value, ref, style) {
  if (value === null || value === undefined || value === '') return '';
  const s = style ? ` s="${style}"` : '';
  if (typeof value === 'number') return `<c r="${ref}"${s}><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function sheetXml(columns, rows) {
  const last = `${column(columns.length - 1)}${rows.length + 1}`;
  const head = columns.map((col, i) => cell(col.title, `${column(i)}1`, 1)).join('');
  const body = rows
    .map((row, r) => {
      const cells = row.map((value, i) => cell(value, `${column(i)}${r + 2}`, columns[i].money ? 2 : 0)).join('');
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join('');
  const widths = columns
    .map((col, i) => `<col min="${i + 1}" max="${i + 1}" width="${col.width}" customWidth="1"/>`)
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths}</cols>` +
    `<sheetData><row r="1">${head}</row>${body}</sheetData>` +
    `<autoFilter ref="A1:${last}"/>` +
    '</worksheet>'
  );
}

// Стили: 0 — обычный, 1 — жирный заголовок, 2 — деньги «1 200 ₽»
const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0 &quot;₽&quot;"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

function parts(sheetName, columns, rows) {
  const name = escapeXml(sheetName);
  const range = `'${name}'!$A$1:$${column(columns.length - 1)}$${rows.length + 1}`;
  return {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
      `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${range}</definedName></definedNames>` +
      '</workbook>',
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
    'xl/styles.xml': STYLES,
    'xl/worksheets/sheet1.xml': sheetXml(columns, rows),
  };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Zip без сжатия (метод 0): заголовок + данные каждого файла, затем оглавление. */
function zip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const directory = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path);
    const data = encoder.encode(text);
    const crc = crc32(data);
    // Общая часть заголовков: версия, флаги, метод, время/дата (1.1.1980), crc, размеры, длина имени
    const common = (view, at) => {
      view.setUint16(at, 20, true);
      view.setUint16(at + 2, 0x0800, true); // имена в UTF-8
      view.setUint16(at + 4, 0, true);
      view.setUint16(at + 6, 0, true);
      view.setUint16(at + 8, 0x21, true);
      view.setUint32(at + 10, crc, true);
      view.setUint32(at + 14, data.length, true);
      view.setUint32(at + 18, data.length, true);
      view.setUint16(at + 22, name.length, true);
    };
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    common(local, 4);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    common(central, 6);
    central.setUint32(42, offset, true);
    directory.push(new Uint8Array(central.buffer), name);

    offset += 30 + name.length + data.length;
  }
  const size = directory.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return [...chunks, ...directory, new Uint8Array(end.buffer)];
}

/**
 * Таблица → Blob с файлом .xlsx.
 * columns: [{ title, width, money? }], rows: [[значение, …], …] — числа, строки, null.
 */
export function makeXlsx(sheetName, columns, rows) {
  return new Blob(zip(parts(sheetName, columns, rows)), { type: XLSX_TYPE });
}
