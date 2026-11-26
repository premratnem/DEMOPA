/**
 * pages/report.js
 * หัวหน้าหน่วย: ดูผลคะแนนของบุคลากรทุกคนในสังกัด (1 แถวต่อ 1 คน)
 * แสดงคะแนนที่แต่ละกลุ่มผู้ประเมินให้ (หัวหน้า/Senior/ผู้ร่วมงาน) และคะแนนรวมสุดท้าย (เลขเดียว)
 * พร้อมปลดล็อกคะแนน และส่งออก Excel/PDF
 */

var Pages = window.Pages || {};
Pages.Report = (function () {
  var esc = Pages.Dashboard.esc;

  function render(content, session) {
    return Api.call('listCycles', {}).then(function (cycles) {
      content.innerHTML = cycleSelectTemplate(cycles);
      var select = content.querySelector('#reportCycleSelect');
      if (select) {
        select.addEventListener('change', function () { loadSummary(content, session, select.value); });
        if (cycles.length > 0) loadSummary(content, session, select.value);
      }
    });
  }

  function cycleSelectTemplate(cycles) {
    if (cycles.length === 0) return '<div class="card"><p class="muted">ยังไม่มีรอบประเมิน</p></div>';
    var options = cycles.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
    return '<div class="card"><label>เลือกรอบประเมิน <select id="reportCycleSelect">' + options + '</select></label></div>' +
      '<div id="summaryArea"></div>';
  }

  function loadSummary(content, session, cycleId) {
    var area = content.querySelector('#summaryArea');
    area.innerHTML = '<p class="muted">กำลังโหลด...</p>';

    Api.call('getUnitSummary', { cycleId: cycleId }).then(function (rows) {
      area.innerHTML = summaryTemplate(rows);
      bindSummary(area, session, cycleId, rows);
    });
  }

  function summaryTemplate(rows) {
    var trs = rows.map(function (r) {
      var detailBtn = r.hasTemplate
        ? '<button class="btn-secondary" data-detail="' + r.staffId + '">ดูรายละเอียด/ปลดล็อก</button>'
        : '<span class="muted">ไม่มีแบบประเมิน</span>';
      return '<tr><td>' + esc(r.name) + '</td>' +
        '<td>' + fmt(r.byGroup.head) + '</td>' +
        '<td>' + fmt(r.byGroup.senior) + '</td>' +
        '<td>' + fmt(r.byGroup.peer) + '</td>' +
        '<td><strong>' + fmt(r.finalScore) + '</strong></td>' +
        '<td>' + detailBtn + '</td></tr>';
    }).join('');

    return (
      '<div class="card"><h3>สรุปผลคะแนนของสังกัด</h3>' +
      '<p class="muted">คะแนนรวมสุดท้าย = หัวหน้า×น้ำหนัก + Senior×น้ำหนัก + ผู้ร่วมงาน×น้ำหนัก ตามที่ตั้งไว้ในรอบนี้</p>' +
      '<div class="toolbar">' +
      '<button id="btnExportCsv" class="btn-secondary">ส่งออก Excel (CSV)</button>' +
      '<button id="btnExportPdf" class="btn-secondary">ส่งออก PDF</button>' +
      '</div>' +
      '<table id="summaryTable"><thead><tr><th>ชื่อ</th><th>หัวหน้า</th><th>Senior</th><th>ผู้ร่วมงาน</th><th>คะแนนรวม</th><th></th></tr></thead>' +
      '<tbody>' + trs + '</tbody></table></div>' +
      '<div id="detailArea"></div>'
    );
  }

  function fmt(v) {
    return v === null || v === undefined ? '<span class="muted">-</span>' : Number(v).toFixed(2);
  }

  function bindSummary(area, session, cycleId, rows) {
    area.querySelectorAll('[data-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadDetail(area, session, cycleId, btn.dataset.detail);
      });
    });

    area.querySelector('#btnExportCsv').addEventListener('click', function () {
      var csvRows = rows.map(function (r) {
        return {
          name: r.name,
          head: fmtRaw(r.byGroup.head), senior: fmtRaw(r.byGroup.senior), peer: fmtRaw(r.byGroup.peer),
          finalScore: fmtRaw(r.finalScore)
        };
      });
      ExportUtil.downloadCsv('PA-report-' + cycleId + '.csv', csvRows, ['name', 'head', 'senior', 'peer', 'finalScore']);
    });

    area.querySelector('#btnExportPdf').addEventListener('click', function () {
      ExportUtil.printAsPdf('สรุปผลการประเมิน', area.querySelector('#summaryTable').outerHTML);
    });
  }

  function fmtRaw(v) { return v === null || v === undefined ? '' : Number(v).toFixed(2); }

  function loadDetail(area, session, cycleId, staffId) {
    var detailArea = area.querySelector('#detailArea');
    detailArea.innerHTML = '<p class="muted">กำลังโหลด...</p>';

    Api.call('getResults', { cycleId: cycleId, staffId: staffId }).then(function (result) {
      detailArea.innerHTML = detailTemplate(result);
      detailArea.querySelectorAll('[data-unlock]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('ปลดล็อกคะแนนกลุ่มนี้? ผู้บันทึกจะแก้ไขคะแนนได้อีกครั้ง')) return;
          Api.call('unlockScores', { cycleId: cycleId, staffId: staffId, group: btn.dataset.unlock })
            .then(function () { loadDetail(area, session, cycleId, staffId); });
        });
      });
    });
  }

  function detailTemplate(result) {
    var groupLabel = { head: 'หัวหน้าหน่วย', senior: 'Senior', peer: 'ผู้ร่วมงาน' };

    var summaryRows = ['head', 'senior', 'peer'].map(function (g) {
      var info = result.byGroup[g];
      var statusBadge = info.submitted
        ? (info.locked ? '<span class="badge badge-success">ยืนยันแล้ว (ล็อก)</span>' : '<span class="badge badge-muted">บันทึกร่างไว้</span>')
        : '<span class="badge badge-danger">ยังไม่ลงคะแนน</span>';
      var unlockBtn = info.locked ? '<button class="btn-secondary" data-unlock="' + g + '">ปลดล็อก</button>' : '';
      var scoreText = info.averageScore !== null ? Number(info.averageScore).toFixed(2) : '-';
      return '<tr><td>' + groupLabel[g] + '</td><td>' + statusBadge + '</td>' +
        '<td><strong>' + scoreText + '</strong></td><td>' + unlockBtn + '</td></tr>';
    }).join('');

    // ตารางรายละเอียดคะแนนแต่ละตัวชี้วัด แยกตามกลุ่มผู้ประเมิน (ใครให้กี่คะแนนในข้อไหน)
    var criteriaRows = result.criteria.map(function (c) {
      var headVal = result.byGroup.head.scores[c.id];
      var seniorVal = result.byGroup.senior.scores[c.id];
      var peerVal = result.byGroup.peer.scores[c.id];
      return '<tr><td>' + esc(c.title) + '</td>' +
        '<td>' + (c.weight ? esc(c.weight) + '%' : '<span class="muted">-</span>') + '</td>' +
        '<td>' + fmtCriteriaScore(headVal) + '</td>' +
        '<td>' + fmtCriteriaScore(seniorVal) + '</td>' +
        '<td>' + fmtCriteriaScore(peerVal) + '</td></tr>';
    }).join('');

    return (
      '<div class="card"><h3>รายละเอียด: ' + esc(result.staff.name) + ' — ' + esc(result.template.name) + '</h3>' +
      '<p>คะแนนรวมสุดท้าย: <strong>' + (result.finalScore !== null ? Number(result.finalScore).toFixed(2) : '-') + '</strong></p>' +
      '<table><thead><tr><th>กลุ่มผู้ประเมิน</th><th>สถานะ</th><th>คะแนนเฉลี่ย</th><th></th></tr></thead>' +
      '<tbody>' + summaryRows + '</tbody></table>' +
      '</div>' +
      '<div class="card"><h4>คะแนนแยกตามตัวชี้วัด (ใครให้กี่คะแนน)</h4>' +
      '<table><thead><tr><th>ตัวชี้วัด</th><th>น้ำหนัก (%)</th><th>หัวหน้า</th><th>Senior</th><th>ผู้ร่วมงาน</th></tr></thead>' +
      '<tbody>' + criteriaRows + '</tbody></table></div>'
    );
  }

  function fmtCriteriaScore(v) {
    return v === undefined || v === null ? '<span class="muted">-</span>' : esc(v);
  }

  return { render: render };
})();
