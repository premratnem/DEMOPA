/**
 * pages/staffTypes.js
 * Admin: จัดการประเภทบุคลากร (พยาบาล, ผู้ช่วยพยาบาล, พนักงาน พม., พนักงาน พศ., ...)
 */

var Pages = window.Pages || {};
Pages.StaffTypes = (function () {
  var esc = Pages.Dashboard.esc;

  function render(content) {
    return Api.call('listStaffTypes', {}).then(function (types) {
      content.innerHTML = template(types);
      bind(content);
    });
  }

  function template(types) {
    var rows = types.map(function (t) {
      return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.createdAt) + '</td></tr>';
    }).join('');

    return (
      '<div class="card"><h3>เพิ่มประเภทบุคลากรใหม่</h3>' +
      '<form id="formAddType" class="toolbar">' +
      '<input type="text" id="newTypeName" placeholder="เช่น พยาบาล, ผู้ช่วยพยาบาล" required />' +
      '<button type="submit" class="btn-primary">เพิ่ม</button>' +
      '</form></div>' +
      '<div class="card"><h3>รายการประเภทบุคลากร</h3>' +
      '<table><thead><tr><th>ชื่อประเภท</th><th>สร้างเมื่อ</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</div>'
    );
  }

  function bind(content) {
    content.querySelector('#formAddType').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('newTypeName').value.trim();
      if (!name) return;
      Api.call('saveStaffType', { staffType: { name: name } }).then(function () { render(content); });
    });
  }

  return { render: render };
})();
