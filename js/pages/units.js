/**
 * pages/units.js
 * Admin: จัดการสังกัด (MED1, MED2, ...) เพิ่มได้ไม่จำกัด
 */

var Pages = window.Pages || {};
Pages.Units = (function () {
  var esc = Pages.Dashboard.esc;

  function render(content) {
    return Api.call('listUnits', {}).then(function (units) {
      content.innerHTML = template(units);
      bind(content);
    });
  }

  function template(units) {
    var rows = units.map(function (u) {
      return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.createdAt) + '</td></tr>';
    }).join('');

    return (
      '<div class="card"><h3>เพิ่มสังกัดใหม่</h3>' +
      '<form id="formAddUnit" class="toolbar">' +
      '<input type="text" id="newUnitName" placeholder="ชื่อสังกัด เช่น MED1" required />' +
      '<button type="submit" class="btn-primary">เพิ่ม</button>' +
      '</form></div>' +
      '<div class="card"><h3>รายการสังกัด</h3>' +
      '<table><thead><tr><th>ชื่อสังกัด</th><th>สร้างเมื่อ</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</div>'
    );
  }

  function bind(content) {
    content.querySelector('#formAddUnit').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('newUnitName').value.trim();
      if (!name) return;
      Api.call('saveUnit', { unit: { name: name } }).then(function () { render(content); });
    });
  }

  return { render: render };
})();
