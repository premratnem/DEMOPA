/**
 * pages/people.js
 * Admin: จัดการบุคลากร (เพิ่ม/แก้ไข/ปิดใช้งาน/ลบ/นำเข้า CSV)
 * แบบประเมินของแต่ละคนจัดการแยกที่เมนู "แบบประเมิน" (templates.js) โดยเลือกบุคคลนั้นก่อน
 */

var Pages = window.Pages || {};
Pages.People = (function () {
  var esc = Pages.Dashboard.esc;
  var unitsCache = [];
  var typesCache = [];

  function render(content) {
    return Promise.all([
      Api.call('listUnits', {}),
      Api.call('listStaffTypes', {}),
      Api.call('listStaff', { filters: { includeInactive: true } })
    ]).then(function (results) {
      unitsCache = results[0];
      typesCache = results[1];
      var staff = results[2];
      content.innerHTML = template(staff);
      bind(content);
    });
  }

  function unitName(id) {
    var u = unitsCache.find(function (x) { return x.id === id; });
    return u ? u.name : '-';
  }
  function typeName(id) {
    var t = typesCache.find(function (x) { return x.id === id; });
    return t ? t.name : '-';
  }

  function unitOptions() {
    return unitsCache.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name) + '</option>'; }).join('');
  }
  function typeOptions() {
    return typesCache.map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + '</option>'; }).join('');
  }

  function template(staff) {
    var rows = staff.map(function (s) {
      var statusBadge = String(s.active) !== 'false'
        ? '<span class="badge badge-success">ใช้งาน</span>'
        : '<span class="badge badge-muted">ปิดใช้งาน</span>';
      return '<tr><td>' + esc(s.name) + '</td><td>' + esc(unitName(s.unitId)) + '</td><td>' + esc(typeName(s.staffTypeId)) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' +
        '<button class="btn-secondary" data-toggle="' + s.id + '" data-active="' + s.active + '">' +
        (String(s.active) !== 'false' ? 'ปิดใช้งาน' : 'เปิดใช้งาน') + '</button> ' +
        '<button class="btn-danger" data-delete="' + s.id + '" data-name="' + esc(s.name) + '">ลบ</button>' +
        '</td></tr>';
    }).join('');

    if (unitsCache.length === 0 || typesCache.length === 0) {
      return '<div class="card"><p class="muted">กรุณาเพิ่ม "สังกัด" และ "ประเภทบุคลากร" ก่อน จึงจะเพิ่มบุคลากรได้</p></div>';
    }

    return (
      '<div class="card"><h3>เพิ่มบุคลากรรายคน</h3>' +
      '<form id="formAddStaff" class="form-grid">' +
      '<label>ชื่อ-สกุล <input type="text" id="staffName" required /></label>' +
      '<label>สังกัด <select id="staffUnit">' + unitOptions() + '</select></label>' +
      '<label>ประเภทบุคลากร <select id="staffType">' + typeOptions() + '</select></label>' +
      '</form>' +
      '<p class="muted">ประเภทบุคลากรใช้สำหรับจัดกลุ่ม/กรองข้อมูลเท่านั้น หลังเพิ่มบุคลากรแล้ว ' +
      'ให้ไปที่เมนู "แบบประเมิน" เพื่อสร้างแบบประเมินให้คนนี้โดยเฉพาะ (ขั้นตอนที่ 2)</p>' +
      '<button id="btnSaveStaff" class="btn-primary">เพิ่มบุคลากร</button>' +
      '</div>' +

      '<div class="card"><h3>นำเข้าจาก CSV</h3>' +
      '<p class="muted">รูปแบบ: ชื่อ-สกุล,ชื่อสังกัด,ชื่อประเภทบุคลากร (บรรทัดแรกเป็นหัวตารางได้) — ถ้าสังกัด/ประเภทยังไม่มี ระบบจะสร้างให้อัตโนมัติ</p>' +
      '<textarea id="csvText" rows="6" style="width:100%" placeholder="สมหญิง ใจดี,MED1,พยาบาล"></textarea>' +
      '<div class="toolbar"><button id="btnImportCsv" class="btn-primary">นำเข้า</button><span id="importResult" class="muted"></span></div>' +
      '</div>' +

      '<div class="card"><h3>รายชื่อบุคลากรทั้งหมด</h3>' +
      '<p class="muted">"ปิดใช้งาน" เหมาะกับคนที่ย้ายสังกัด/พักงานชั่วคราว (ยังเก็บประวัติผลประเมินไว้) ' +
      'ส่วน "ลบ" คือการลบออกจากระบบจริง — ลบได้แม้จะมีคะแนนของรอบก่อนๆ ที่ปิดไปแล้วอยู่ (ประวัติรอบเก่ายังอยู่ครบ) ' +
      'แต่ถ้ามีคะแนนอยู่ในรอบที่ <strong>กำลังเปิดอยู่ตอนนี้</strong> ระบบจะไม่ให้ลบ จนกว่าจะปิดรอบนั้นก่อน</p>' +
      '<table><thead><tr><th>ชื่อ</th><th>สังกัด</th><th>ประเภท</th><th>สถานะ</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p id="peopleMsg" class="muted"></p>' +
      '</div>'
    );
  }

  function bind(content) {
    var btnSave = content.querySelector('#btnSaveStaff');
    if (btnSave) {
      btnSave.addEventListener('click', function () {
        var name = document.getElementById('staffName').value.trim();
        var unitId = document.getElementById('staffUnit').value;
        var staffTypeId = document.getElementById('staffType').value;
        if (!name) return;
        Api.call('saveStaff', { staff: { name: name, unitId: unitId, staffTypeId: staffTypeId } })
          .then(function () { render(content); });
      });
    }

    var btnImport = content.querySelector('#btnImportCsv');
    if (btnImport) {
      btnImport.addEventListener('click', function () {
        var csvText = document.getElementById('csvText').value.trim();
        if (!csvText) return;
        Api.call('importStaffCsv', { csvText: csvText }).then(function (result) {
          document.getElementById('importResult').textContent =
            'นำเข้าสำเร็จ ' + result.created + ' รายการ';
          render(content);
        });
      });
    }

    content.querySelectorAll('[data-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isActive = btn.dataset.active !== 'false';
        Api.call('setStaffActive', { staffId: btn.dataset.toggle, active: !isActive })
          .then(function () { render(content); });
      });
    });

    content.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var staffId = btn.dataset.delete;
        var name = btn.dataset.name;
        var msg = content.querySelector('#peopleMsg');

        if (!confirm('ยืนยันลบ "' + name + '" ออกจากระบบ? การลบนี้กู้คืนไม่ได้ (ใช้สำหรับคนที่ลาออกและยังไม่เคยมีคะแนนในระบบ)')) return;

        var typed = prompt('เพื่อป้องกันการลบผิดพลาด กรุณาพิมพ์ชื่อ "' + name + '" ให้ตรงกันเพื่อยืนยันอีกครั้ง:');
        if (typed === null) return;
        if (typed.trim() !== name.trim()) {
          msg.textContent = 'ชื่อที่พิมพ์ไม่ตรงกัน ยกเลิกการลบ';
          msg.className = 'error-text';
          return;
        }

        Api.call('deleteStaff', { staffId: staffId })
          .then(function () {
            render(content);
          })
          .catch(function (err) {
            msg.textContent = err.message;
            msg.className = 'error-text';
          });
      });
    });
  }

  return { render: render };
})();
