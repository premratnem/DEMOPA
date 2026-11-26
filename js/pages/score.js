/**
 * pages/score.js
 * หน้ากรอกคะแนน ใช้ร่วมกันโดยหัวหน้า (head) และผู้บันทึกกลุ่ม (recorder_senior/recorder_peer)
 * แต่ละคนเห็น/กรอกเฉพาะ "ชุดคะแนนของกลุ่มตนเอง" เท่านั้น (บังคับจากฝั่ง backend)
 * เลือกบุคคลแล้วกรอกคะแนนได้เลย เพราะ 1 คนมีแบบประเมินเพียง 1 ใบ
 */

var Pages = window.Pages || {};
Pages.Score = (function () {
  var esc = Pages.Dashboard.esc;

  function render(content, session) {
    // สำหรับผู้บันทึกกลุ่ม: ใช้ cycleId จาก session (รหัสผูกกับรอบ) โดยตรง
    // สำหรับหัวหน้า: ให้เลือกจากรอบที่เปิดอยู่
    if (session.role === 'head') {
      return Api.call('listCycles', {}).then(function (cycles) {
        var openCycles = cycles.filter(function (c) { return c.status === 'open'; });
        content.innerHTML = cycleSelectTemplate(openCycles);
        var select = content.querySelector('#scoreCycleSelect');
        if (select) {
          select.addEventListener('change', function () { loadStaffList(content, session, select.value); });
          if (openCycles.length > 0) loadStaffList(content, session, openCycles[0].id);
        }
      });
    }

    if (!session.cycleId) {
      content.innerHTML = '<p class="error-text">ไม่พบรอบประเมินที่ผูกกับรหัสนี้</p>';
      return Promise.resolve();
    }
    return loadStaffList(content, session, session.cycleId);
  }

  function cycleSelectTemplate(cycles) {
    if (cycles.length === 0) return '<div class="card"><p class="muted">ไม่มีรอบประเมินที่เปิดอยู่</p></div>';
    var options = cycles.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
    return '<div class="card"><label>เลือกรอบประเมิน <select id="scoreCycleSelect">' + options + '</select></label></div>' +
      '<div id="staffListArea"></div>';
  }

  function loadStaffList(content, session, cycleId) {
    var area = content.querySelector('#staffListArea') || content;
    area.innerHTML = '<p class="muted">กำลังโหลดรายชื่อบุคลากร...</p>';

    return Promise.all([
      Api.call('listStaff', { filters: {} }),
      Api.call('getMyScoringStatus', { cycleId: cycleId })
    ]).then(function (results) {
      var staffList = results[0];
      var statusList = results[1];

      var html = '<div class="card"><h3>เลือกบุคลากรที่จะให้คะแนน</h3><table><thead><tr><th>ชื่อ</th><th>สถานะ</th><th></th></tr></thead><tbody>';
      staffList.forEach(function (s) {
        var status = statusList.find(function (st) { return st.staffId === s.id; });
        var disabled = !status || !status.hasTemplate;
        html += '<tr><td>' + esc(s.name) + '</td><td>' + statusBadge(status) + '</td>' +
          '<td><button class="btn-secondary" data-pick-staff="' + s.id + '"' + (disabled ? ' disabled title="ยังไม่มีแบบประเมิน"' : '') + '>กรอกคะแนน</button></td></tr>';
      });
      html += '</tbody></table></div><div id="scoreFormArea"></div>';
      area.innerHTML = html;

      area.querySelectorAll('[data-pick-staff]:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () { loadScoreForm(area, cycleId, btn.dataset.pickStaff); });
      });
    });
  }

  function statusBadge(status) {
    if (!status || !status.hasTemplate) return '<span class="badge badge-muted">ไม่มีแบบประเมิน</span>';
    if (status.submitted) return '<span class="badge badge-success">กรอกแล้ว</span>';
    return '<span class="badge badge-danger">ยังไม่กรอก</span>';
  }

  function loadScoreForm(area, cycleId, staffId, successMsg) {
    var formArea = area.querySelector('#scoreFormArea') || area;
    formArea.innerHTML = '<p class="muted">กำลังโหลดแบบประเมิน...</p>';

    Api.call('getScoreSheet', { cycleId: cycleId, staffId: staffId }).then(function (data) {
      formArea.innerHTML = formTemplate(data);
      bindForm(area, formArea, cycleId, staffId, data);
      if (successMsg) {
        var msgEl = formArea.querySelector('#scoreFormMsg');
        if (msgEl) { msgEl.textContent = successMsg; msgEl.className = 'success-text'; }
      }
    });
  }

  function formTemplate(data) {
    var lockedNote = data.locked
      ? '<div class="locked-note">คะแนนชุดนี้ถูกยืนยันและล็อกแล้ว ต้องให้หัวหน้าหน่วยปลดล็อกก่อนจึงแก้ไขได้</div>'
      : '';

    var rows = data.criteria.map(function (c) {
      var val = data.scores[c.id] !== undefined ? data.scores[c.id] : '';
      return '<tr><td>' + esc(c.title) + '</td>' +
        '<td>' + (c.weight ? esc(c.weight) + '%' : '<span class="muted">-</span>') + '</td>' +
        '<td>' + esc(c.maxScore || 10) + '</td>' +
        '<td><input type="number" class="score-input" data-criteria="' + c.id + '" min="1" max="10" value="' + esc(val) + '" ' +
        (data.locked ? 'disabled' : '') + ' /></td></tr>';
    }).join('');

    return (
      '<div class="card"><h3>' + esc(data.staff.name) + ' — ' + esc(data.template.name) + '</h3>' +
      lockedNote +
      '<table><thead><tr><th>ตัวชี้วัด</th><th>น้ำหนัก (%)</th><th>คะแนนเต็ม</th><th>คะแนน (1-10)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<div class="toolbar">' +
      (data.locked ? '' :
        '<button id="btnSaveDraft" class="btn-secondary">บันทึกร่าง</button>' +
        '<button id="btnFinalize" class="btn-primary">ยืนยันและล็อกคะแนน</button>') +
      '<span id="scoreFormMsg" class="muted"></span>' +
      '</div></div>'
    );
  }

  function collectValues(formArea) {
    var values = {};
    formArea.querySelectorAll('.score-input').forEach(function (input) {
      if (input.value !== '') values[input.dataset.criteria] = input.value;
    });
    return values;
  }

  function bindForm(area, formArea, cycleId, staffId, data) {
    var msg = formArea.querySelector('#scoreFormMsg');

    var btnDraft = formArea.querySelector('#btnSaveDraft');
    if (btnDraft) {
      btnDraft.addEventListener('click', function () {
        submit(false);
      });
    }
    var btnFinal = formArea.querySelector('#btnFinalize');
    if (btnFinal) {
      btnFinal.addEventListener('click', function () {
        if (!confirm('ยืนยันคะแนนชุดนี้? หลังยืนยันจะล็อกและแก้ไขไม่ได้ จนกว่าหัวหน้าจะปลดล็อก')) return;
        submit(true);
      });
    }

    function submit(finalize) {
      var values = collectValues(formArea);
      Api.call('submitScores', {
        cycleId: cycleId,
        staffId: staffId,
        scores: { values: values, _finalize: finalize }
      }).then(function () {
        loadScoreForm(area, cycleId, staffId, finalize ? 'ยืนยันและล็อกคะแนนสำเร็จ' : 'บันทึกร่างสำเร็จ');
      }).catch(function (err) {
        msg.textContent = err.message;
        msg.className = 'error-text';
      });
    }
  }

  return { render: render };
})();
