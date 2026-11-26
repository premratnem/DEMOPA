/**
 * pages/cycles.js
 * Admin: สร้าง/เปิด/ปิดรอบประเมิน และสร้างรหัสเฉพาะรอบให้ผู้บันทึกคะแนน
 */

var Pages = window.Pages || {};
Pages.Cycles = (function () {
  var esc = Pages.Dashboard.esc;
  var unitsCache = [];

  function render(content) {
    return Promise.all([Api.call('listCycles', {}), Api.call('listUnits', {})]).then(function (results) {
      unitsCache = results[1];
      content.innerHTML = template(results[0]);
      bind(content);
    });
  }

  function template(cycles) {
    var currentBuddhistYear = new Date().getFullYear() + 543;
    var rows = cycles.map(function (c) {
      var statusBadge = c.status === 'open'
        ? '<span class="badge badge-success">เปิดอยู่</span>'
        : (c.status === 'closed' ? '<span class="badge badge-danger">ปิดแล้ว</span>' : '<span class="badge badge-muted">ร่าง</span>');
      var actions = '';
      if (c.status === 'draft') {
        actions += '<button class="btn-secondary" data-open="' + c.id + '">เปิดรอบ</button> ';
      }
      if (c.status === 'open') {
        actions += '<button class="btn-secondary" data-gencode="' + c.id + '">สร้างรหัสเฉพาะรอบ</button> ' +
          '<button class="btn-danger" data-close="' + c.id + '">ปิดรอบ</button>';
      }
      return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.year) + '/' + esc(c.round) + '</td>' +
        '<td>' + statusBadge + '</td><td>' + actions + '</td></tr>';
    }).join('');

    var unitOptions = unitsCache.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name) + '</option>'; }).join('');

    return (
      '<div class="card"><h3>สร้างรอบประเมินใหม่</h3>' +
      '<form id="formNewCycle" class="form-grid">' +
      '<label>ชื่อรอบ <input type="text" id="cycleName" placeholder="เช่น ประเมินกลางปี 2569" required /></label>' +
      '<label>ปี <input type="number" id="cycleYear" value="' + currentBuddhistYear + '" required /></label>' +
      '<label>รอบที่ <input type="number" id="cycleRound" value="1" required /></label>' +
      '<label>วันเริ่ม <input type="date" id="cycleStart" /></label>' +
      '<label>วันสิ้นสุด <input type="date" id="cycleEnd" /></label>' +
      '<label>น้ำหนักหัวหน้า (%) <input type="number" id="weightHead" value="10" /></label>' +
      '<label>น้ำหนัก Senior (%) <input type="number" id="weightSenior" value="40" /></label>' +
      '<label>น้ำหนักผู้ร่วมงาน (%) <input type="number" id="weightPeer" value="40" /></label>' +
      '</form>' +
      '<button id="btnSaveCycle" class="btn-primary">สร้างรอบ</button>' +
      '<span id="cycleMsg" class="muted"></span>' +
      '</div>' +

      '<div class="card"><h3>รายการรอบประเมิน</h3>' +
      '<table><thead><tr><th>ชื่อรอบ</th><th>ปี/รอบ</th><th>สถานะ</th><th>การจัดการ</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</div>' +

      '<div class="card" id="unitSelectForCodeCard" hidden><h3>เลือกสังกัดเพื่อสร้างรหัส</h3>' +
      '<select id="unitSelectForCode">' + unitOptions + '</select>' +
      '<button id="btnConfirmGenCode" class="btn-primary">สร้างรหัส</button>' +
      '<div id="codeResult" class="muted" style="margin-top:0.75rem"></div></div>'
    );
  }

  function bind(content) {
    content.querySelector('#btnSaveCycle').addEventListener('click', function () {
      var msg = content.querySelector('#cycleMsg');
      var weights = {
        head: Number(document.getElementById('weightHead').value),
        senior: Number(document.getElementById('weightSenior').value),
        peer: Number(document.getElementById('weightPeer').value)
      };
      Api.call('saveCycle', {
        cycle: {
          name: document.getElementById('cycleName').value.trim(),
          year: document.getElementById('cycleYear').value,
          round: document.getElementById('cycleRound').value,
          startDate: document.getElementById('cycleStart').value,
          endDate: document.getElementById('cycleEnd').value,
          groupWeights: weights
        }
      }).then(function () { render(content); })
        .catch(function (err) { msg.textContent = err.message; msg.className = 'error-text'; });
    });

    content.querySelectorAll('[data-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('เปิดรอบนี้? ระบบจะบันทึกรายชื่อบุคลากรและแบบประเมิน ณ ขณะนี้ไว้ใช้ตลอดรอบ')) return;
        Api.call('openCycle', { cycleId: btn.dataset.open }).then(function () { render(content); });
      });
    });

    content.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('ปิดรอบนี้? จะไม่สามารถกรอกคะแนนเพิ่มได้')) return;
        Api.call('closeCycle', { cycleId: btn.dataset.close }).then(function () { render(content); });
      });
    });

    var pendingCycleId = null;
    content.querySelectorAll('[data-gencode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pendingCycleId = btn.dataset.gencode;
        content.querySelector('#unitSelectForCodeCard').hidden = false;
      });
    });

    var btnConfirm = content.querySelector('#btnConfirmGenCode');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', function () {
        var unitId = content.querySelector('#unitSelectForCode').value;
        Api.call('generateAccessCodes', { cycleId: pendingCycleId, unitId: unitId }).then(function (codes) {
          content.querySelector('#codeResult').innerHTML =
            '<strong>รหัส Senior:</strong> ' + esc(codes.senior) + '<br/>' +
            '<strong>รหัส ผู้ร่วมงาน:</strong> ' + esc(codes.peer) + '<br/>' +
            '<span class="error-text">บันทึกรหัสนี้ไว้ให้ดี จะไม่แสดงซ้ำอีก</span>';
        });
      });
    }
  }

  return { render: render };
})();
