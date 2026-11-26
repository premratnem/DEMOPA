/**
 * export.js
 * ส่งออกรายงานเป็น Excel (CSV ที่ Excel เปิดได้โดยตรง) และ PDF (ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์)
 * ไม่พึ่งไลบรารีภายนอก เพื่อให้ทำงานได้แบบออฟไลน์/ไม่ต้องตั้งค่าเพิ่ม
 */

var ExportUtil = (function () {
  function toCsv(rows, headers) {
    var lines = [];
    lines.push(headers.map(csvEscape).join(','));
    rows.forEach(function (row) {
      lines.push(headers.map(function (h) { return csvEscape(row[h]); }).join(','));
    });
    // เติม BOM เพื่อให้ Excel เปิดภาษาไทยไม่เพี้ยน
    return '\uFEFF' + lines.join('\r\n');
  }

  function csvEscape(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(s)) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function downloadCsv(filename, rows, headers) {
    var csv = toCsv(rows, headers);
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * พิมพ์เป็น PDF: เปิดหน้าต่างใหม่ที่มี HTML ตารางพร้อมสั่ง print()
   * ผู้ใช้เลือก "Save as PDF" จากกล่องพิมพ์ของเบราว์เซอร์เอง
   */
  function printAsPdf(title, htmlContent) {
    var win = window.open('', '_blank');
    win.document.write(
      '<html><head><title>' + title + '</title>' +
      '<meta charset="UTF-8" />' +
      '<style>' +
      'body{font-family:Sarabun,Segoe UI,sans-serif;padding:24px;}' +
      'table{width:100%;border-collapse:collapse;font-size:13px;}' +
      'th,td{border:1px solid #333;padding:6px 8px;text-align:left;}' +
      'th{background:#eee;}' +
      'h2{margin-bottom:4px;}' +
      '</style></head><body>' +
      '<h2>' + title + '</h2>' +
      htmlContent +
      '</body></html>'
    );
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 300);
  }

  return { downloadCsv: downloadCsv, printAsPdf: printAsPdf };
})();
