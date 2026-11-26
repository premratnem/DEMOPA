/**
 * pages/templates.js
 * Admin: จัดการแบบประเมิน (Templates) และตัวชี้วัด (Criteria) ของบุคคลหนึ่งโดยเฉพาะ
 * ขั้นตอน: เลือกบุคคล -> สร้าง/แก้ไขแบบประเมินของคนนั้น -> กำหนดตัวชี้วัด
 * 1 คนมีแบบประเมินได้ 1 ใบเท่านั้น
 */

var Pages = window.Pages || {};
Pages.Templates = (function () {
  var esc = Pages.Dashboard.esc;
  var unitsCache = [];
  var typesCache = [];
  var staffCache = [];

  function render(content) {
    return Promise.all([
      Api.call('listUnits', {}),
      Api.call('listStaffTypes', {}),
      Api.call('listStaff', { filters: {} })
    ]).then(function (results) {
      unitsCache = results[0];
      typesCache = results[1];
      staffCache = results[2];
      content.innerHTML = template();
      bind(content);
      if (staffCache.length > 0) loadTemplateForStaff(content, staffCache[0].id);
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

  function template() {
    if (staffCache.length === 0) {
      return '<div class="card"><p class="muted">กรุณาเพิ่ม "บุคลากร" ก่อน (เมนูบุคลากร) จึงจะสร้างแบบประเมินได้</p></div>';
    }
    var options = staffCache.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name) + ' — ' + esc(unitName(s.unitId)) + ' / ' + esc(typeName(s.staffTypeId)) + '</option>';
    }).join('');
    return (
      '<div class="card"><h3>เลือกบุคลากร</h3>' +
      '<p class="muted">แบบประเมินเป็นของเฉพาะบุคคลนี้คนเดียว ไม่ใช้ร่วมกับคนอื่น</p>' +
      '<select id="selectStaff">' + options + '</select>' +
      '</div>' +
      '<div id="templateArea"></div>'
    );
  }

  function bind(content) {
    var select = content.querySelector('#selectStaff');
    if (select) {
      select.addEventListener('change', function () { loadTemplateForStaff(content, select.value); });
    }
  }

  function loadTemplateForStaff(content, staffId) {
    var area = content.querySelector('#templateArea');
    area.innerHTML = '<p class="muted">กำลังโหลด...</p>';

    Api.call('listTemplates', { filters: { staffId: staffId } }).then(function (templates) {
      var existing = templates[0] || null;
      var html = '<div class="card"><h3>แบบประเมินของบุคคลนี้</h3>';

      if (!existing) {
        html += '<form id="formNewTemplate" class="toolbar">' +
          '<input type="text" id="newTemplateName" placeholder="ชื่อแบบประเมิน" required />' +
          '<button type="submit" class="btn-primary">สร้างแบบประเมิน</button></form>' +
          '<p class="muted">บุคคลนี้ยังไม่มีแบบประเมิน — สร้างใหม่ได้ที่นี่</p>';
      } else {
        html += '<table><thead><tr><th>ชื่อแบบประเมิน</th><th></th></tr></thead><tbody>' +
          '<tr><td>' + esc(existing.name) + '</td>' +
          '<td><button class="btn-danger" data-delete-template="' + existing.id + '" data-name="' + esc(existing.name) + '">ลบแบบประเมิน</button></td></tr>' +
          '</tbody></table>' +
          '<p class="muted">ตัวชี้วัดของแบบประเมินนี้แสดงและแก้ไขได้ในตารางด้านล่างได้ทันที</p>';
      }
      html += '<p id="templateListMsg" class="muted"></p>';
      html += '</div><div id="criteriaArea"></div>';
      area.innerHTML = html;

      var formNew = area.querySelector('#formNewTemplate');
      if (formNew) {
        formNew.addEventListener('submit', function (e) {
          e.preventDefault();
          var name = document.getElementById('newTemplateName').value.trim();
          if (!name) return;
          Api.call('saveTemplate', { template: { name: name, staffId: staffId } })
            .then(function (newTpl) { loadCriteria(content, newTpl.id, staffId); loadTemplateForStaff(content, staffId); });
        });
      }

      area.querySelectorAll('[data-delete-template]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var msg = area.querySelector('#templateListMsg');
          if (!confirm('ยืนยันลบแบบประเมิน "' + btn.dataset.name + '"? การลบนี้กู้คืนไม่ได้ (ลบได้เฉพาะแบบที่ไม่ได้ใช้ในรอบที่เปิดอยู่)')) return;
          Api.call('deleteTemplate', { templateId: btn.dataset.deleteTemplate })
            .then(function () { loadTemplateForStaff(content, staffId); })
            .catch(function (err) {
              msg.textContent = err.message;
              msg.className = 'error-text';
            });
        });
      });

      if (existing) loadCriteria(content, existing.id, staffId);
    });
  }

  function loadCriteria(content, templateId, staffId) {
    var area = content.querySelector('#criteriaArea');
    area.innerHTML = '<p class="muted">กำลังโหลดตัวชี้วัด...</p>';

    Api.call('listCriteria', { templateId: templateId }).then(function (criteria) {
      area.innerHTML = criteriaTemplate(criteria);
      bindCriteria(area, templateId, staffId, content);
    });
  }

  function criteriaTemplate(criteria) {
    var rowsHtml = criteria.map(function (c, idx) { return criteriaRow(c, idx); }).join('');
    return (
      '<div class="card"><h3>ตัวชี้วัด</h3>' +
      '<p class="muted">ใส่น้ำหนัก (%) ของตัวชี้วัดแต่ละข้อไว้เป็นข้อมูลอ้างอิง/แสดงผลเท่านั้น — ' +
      'คะแนนจริงคิดจากค่าเฉลี่ยของทุกตัวชี้วัด (ไม่ได้นำน้ำหนักนี้ไปคำนวณ) ไม่บังคับว่าต้องรวมเป็น 100</p>' +
      '<table id="criteriaTable"><thead><tr><th>ตัวชี้วัด</th><th>น้ำหนัก (%) — อ้างอิงเท่านั้น</th><th>คะแนนเต็ม</th><th></th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="toolbar">' +
      '<button id="btnAddCriteriaRow" class="btn-secondary">+ เพิ่มตัวชี้วัด</button>' +
      '<button id="btnSaveCriteria" class="btn-primary">บันทึกตัวชี้วัดทั้งหมด</button>' +
      '<span id="criteriaMsg" class="muted"></span>' +
      '</div></div>'
    );
  }

  function criteriaRow(c, idx) {
    c = c || { title: '', weight: '', maxScore: 10 };
    return '<tr data-row="' + idx + '">' +
      '<td><input type="text" class="crit-title" value="' + esc(c.title) + '" /></td>' +
      '<td><input type="number" class="crit-weight" value="' + esc(c.weight || '') + '" min="0" max="100" style="width:80px" /></td>' +
      '<td><input type="number" class="crit-max" value="' + esc(c.maxScore || 10) + '" min="1" style="width:70px" /></td>' +
      '<td><button class="btn-danger" data-remove-row>ลบ</button></td></tr>';
  }

  function bindCriteria(area, templateId, staffId, content) {
    area.querySelector('#btnAddCriteriaRow').addEventListener('click', function () {
      var tbody = area.querySelector('#criteriaTable tbody');
      var tr = document.createElement('tr');
      tr.innerHTML = criteriaRow(null, tbody.children.length);
      tbody.appendChild(tr);
      bindRemove(tr);
    });

    area.querySelectorAll('[data-remove-row]').forEach(function (btn) { bindRemove(btn.closest('tr')); });

    function bindRemove(tr) {
      var btn = tr.querySelector('[data-remove-row]');
      btn.addEventListener('click', function () { tr.remove(); });
    }

    area.querySelector('#btnSaveCriteria').addEventListener('click', function () {
      var rows = Array.from(area.querySelectorAll('#criteriaTable tbody tr'));
      var criteriaList = rows.map(function (tr) {
        return {
          title: tr.querySelector('.crit-title').value.trim(),
          weight: Number(tr.querySelector('.crit-weight').value) || 0,
          maxScore: Number(tr.querySelector('.crit-max').value) || 10
        };
      });

      var msg = area.querySelector('#criteriaMsg');
      Api.call('saveCriteria', { templateId: templateId, criteria: criteriaList })
        .then(function () {
          msg.textContent = 'บันทึกสำเร็จ';
          msg.className = 'success-text';
          loadCriteria(content, templateId, staffId);
        })
        .catch(function (err) {
          msg.textContent = err.message;
          msg.className = 'error-text';
        });
    });
  }

  return { render: render };
})();
