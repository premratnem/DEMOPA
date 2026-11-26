/**
 * pages/settings.js
 * Admin: จัดการผู้ใช้ระบบ (admin, head) — ไม่รวมผู้บันทึกกลุ่ม Senior/Peer ซึ่งใช้รหัสเฉพาะรอบแทน
 */

var Pages = window.Pages || {};
Pages.Settings = (function () {
  var esc = Pages.Dashboard.esc;
  var unitsCache = [];

  function render(content) {
    return Promise.all([Api.call('listUsers', {}), Api.call('listUnits', {})]).then(function (results) {
      unitsCache = results[1];
      content.innerHTML = template(results[0]);
      bind(content);
    });
  }

  function roleLabel(role) {
    return { admin: 'ผู้ดูแลระบบ', head: 'หัวหน้าหน่วย', recorder_senior: 'ผู้บันทึก Senior', recorder_peer: 'ผู้บันทึกผู้ร่วมงาน' }[role] || role;
  }

  function unitName(id) {
    var u = unitsCache.find(function (x) { return x.id === id; });
    return u ? u.name : '-';
  }

  function template(users) {
    var rows = users.map(function (u) {
      var statusBadge = String(u.active) !== 'false'
        ? '<span class="badge badge-success">ใช้งาน</span>'
        : '<span class="badge badge-muted">ปิดใช้งาน</span>';
      return '<tr><td>' + esc(u.username) + '</td><td>' + esc(u.displayName) + '</td>' +
        '<td>' + roleLabel(u.role) + '</td><td>' + esc(unitName(u.unitId)) + '</td><td>' + statusBadge + '</td>' +
        '<td><button class="btn-secondary" data-toggle-user="' + u.id + '" data-active="' + u.active + '">' +
        (String(u.active) !== 'false' ? 'ปิดใช้งาน' : 'เปิดใช้งาน') + '</button></td></tr>';
    }).join('');

    var unitOptions = unitsCache.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name) + '</option>'; }).join('');

    return (
      '<div class="card"><h3>เพิ่มผู้ใช้ระบบ</h3>' +
      '<form id="formAddUser" class="form-grid">' +
      '<label>ชื่อผู้ใช้ <input type="text" id="newUsername" required /></label>' +
      '<label>รหัสผ่านตั้งต้น <input type="text" id="newPassword" required /></label>' +
      '<label>ชื่อที่แสดง <input type="text" id="newDisplayName" required /></label>' +
      '<label>บทบาท <select id="newRole">' +
      '<option value="admin">ผู้ดูแลระบบ</option>' +
      '<option value="head">หัวหน้าหน่วย</option>' +
      '</select></label>' +
      '<label>สังกัด (เฉพาะหัวหน้า) <select id="newUnit"><option value="">-</option>' + unitOptions + '</select></label>' +
      '</form>' +
      '<button id="btnSaveUser" class="btn-primary">เพิ่มผู้ใช้</button>' +
      '<span id="userMsg" class="muted"></span>' +
      '</div>' +

      '<div class="card"><h3>รายชื่อผู้ใช้ระบบ</h3>' +
      '<table><thead><tr><th>Username</th><th>ชื่อที่แสดง</th><th>บทบาท</th><th>สังกัด</th><th>สถานะ</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +

      '<div class="card"><p class="muted">หมายเหตุ: ผู้บันทึกกลุ่ม Senior และผู้ร่วมงาน ไม่ต้องสร้างบัญชีที่นี่ — ใช้ "รหัสเฉพาะรอบ" ที่สร้างจากหน้า "รอบประเมิน" แทน</p></div>'
    );
  }

  function bind(content) {
    content.querySelector('#btnSaveUser').addEventListener('click', function () {
      var msg = content.querySelector('#userMsg');
      Api.call('saveUser', {
        user: {
          username: document.getElementById('newUsername').value.trim(),
          password: document.getElementById('newPassword').value,
          displayName: document.getElementById('newDisplayName').value.trim(),
          role: document.getElementById('newRole').value,
          unitId: document.getElementById('newUnit').value
        }
      }).then(function () { render(content); })
        .catch(function (err) { msg.textContent = err.message; msg.className = 'error-text'; });
    });

    content.querySelectorAll('[data-toggle-user]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isActive = btn.dataset.active !== 'false';
        Api.call('saveUser', { user: { id: btn.dataset.toggleUser, active: !isActive } })
          .then(function () { render(content); });
      });
    });
  }

  return { render: render };
})();
