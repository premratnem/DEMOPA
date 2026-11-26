/**
 * pages/demoScore.js
 * หน้า "ลงคะแนน (ทดลอง)" สำหรับ demo.html เท่านั้น
 * เนื่องจากหน้าทดลองล็อกอินเป็น Admin เสมอ (ไม่มีบทบาทหัวหน้า/ผู้บันทึกจริง)
 * หน้านี้จึงให้เลือก "สวมบทบาทกลุ่มผู้ประเมิน" (หัวหน้า/Senior/ผู้ร่วมงาน) เองได้
 * เลือกบุคคลแล้วกรอกคะแนนได้เลย เพราะ 1 คนมีแบบประเมินเพียง 1 ใบ
 */

var Pages = window.Pages || {};
Pages.DemoScore = (function () {
  var esc = Pages.Dashboard.esc;
  var currentGroup = 'head';

  function render(content) {
    return Api.call('listCycles', {}).then(function (cycles) {
      var openCycles = cycles.filter(function (c) { return c.status === 'open'; });
      content.innerHTML = template(openCycles);
      bind(content);
      if (openCycles.length > 0) loadStaffList(content, openCycles[0].id);
    });
  }

  function template(cycles) {
    if (cycles.length === 0) {
      return '<div class="card"><p class="muted">ยังไม่มีรอบประเมินที่เปิดอยู่ — ไปที่เมนู "รอบประเมิน (ทดลอง)" เพื่อสร้างและเปิดรอบก่อน</p></div>';
    }
    var options = cycles.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');

    return (
      '<div class="card">' +
      '<h3>ขั้นตอนที่ 1: เลือกรอบประเมิน และสวมบทบาทผู้ประเมิน</h3>' +
      '<div class="form-grid">' +
      '<label>รอบประเมิน <select id="demoCycleSelect">' + options + '</select></label>' +
      '<label>สวมบทบาทเป็นกลุ่ม ' +
      '<select id="demoGroupSelect">' +
      '<option value="head">หัวหน้าหน่วย</option>' +
      '<option value="senior">Senior</option>' +
      '<option value="peer">ผู้ร่วมงาน (Peer)</option>' +
      '</select></label>' +
      '</div>' +
      '<p class="muted">ในระบบจริง แต่ละกลุ่มจะล็อกอินแยกบัญชี/รหัสกัน และเห็นเฉพาะคะแนนกลุ่มตนเอง ส่วนในหน้าทดลองนี้ สวมบทบาทสลับกันได้เพื่อทดลองขั้นตอนครบวงจร</p>' +
      '</div>' +
      '<div id="staffListArea"></div>'
    );
  }

  function bind(content) {
    var cycleSelect = content.querySelector('#demoCycleSelect');
    var groupSelect = content.querySelector('#demoGroupSelect');
    if (!cycleSelect) return;

    cycleSelect.addEventListener('change', function () { loadStaffList(content, cycleSelect.value); });
    groupSelect.addEventListener('change', function () {
      currentGroup = groupSelect.value;
      loadStaffList(content, cycleSelect.value);
    });
  }

  function loadStaffList(content, cycleId) {
    var area = content.querySelector('#staffListArea');
    area.innerHTML = '<p class="muted">กำลังโหลดรายชื่อบุคลากร...</p>';

    Promise.all([
      Api.call('listStaff', { filters: {} }),
      Api.call('getMyScoringStatus', { cycleId: cycleId, _demoGroup: currentGroup })
    ]).then(function (results) {
      var staffList = results[0];
      var statusList = results[1];

      var html = '<div class="card"><h3>ขั้นตอนที่ 2: เลือกบุคลากรที่จะให้คะแนน</h3>';
      if (staffList.length === 0) {
        html += '<p class="muted">ยังไม่มีบุคลากรในระบบ — ไปที่เมนู "บุคลากร (ทดลอง)" เพื่อเพิ่มก่อน</p>';
      } else {
        html += '<table><thead><tr><th>ชื่อ</th><th>สถานะ</th><th></th></tr></thead><tbody>';
        staffList.forEach(function (s) {
          var status = statusList.find(function (st) { return st.staffId === s.id; });
          var disabled = !status || !status.hasTemplate;
          html += '<tr><td>' + esc(s.name) + '</td><td>' + statusBadge(status) + '</td>' +
            '<td><button class="btn-secondary" data-pick-staff="' + s.id + '"' + (disabled ? ' disabled title="ยังไม่มีแบบประเมิน"' : '') + '>กรอกคะแนน</button></td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div><div id="scoreFormArea"></div>';
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
    var formArea = area.querySelector('#scoreFormArea');
    formArea.innerHTML = '<p class="muted">กำลังโหลดแบบประเมิน...</p>';

    Api.call('getScoreSheet', { cycleId: cycleId, staffId: staffId, _demoGroup: currentGroup }).then(function (data) {
      formArea.innerHTML = formTemplate(data);
      bindForm(area, formArea, cycleId, staffId, data);
      if (successMsg) {
        var msgEl = formArea.querySelector('#scoreFormMsg');
        if (msgEl) { msgEl.textContent = successMsg; msgEl.className = 'success-text'; }
      }
    });
  }

  function formTemplate(data) {
    var groupLabel = { head: 'หัวหน้าหน่วย', senior: 'Senior', peer: 'ผู้ร่วมงาน (Peer)' }[data.group];
    var lockedNote = data.locked
      ? '<div class="locked-note">คะแนนชุดนี้ถูกยืนยันและล็อกแล้ว (บทบาท: ' + groupLabel + ') — ไปที่เมนู "ผลการประเมิน (ทดลอง)" เพื่อปลดล็อก</div>'
      : '<div class="locked-note">กำลังกรอกคะแนนในฐานะ: <strong>' + groupLabel + '</strong></div>';

    var rows = data.criteria.map(function (c) {
      var val = data.scores[c.id] !== undefined ? data.scores[c.id] : '';
      return '<tr><td>' + esc(c.title) + '</td>' +
        '<td>' + (c.weight ? esc(c.weight) + '%' : '<span class="muted">-</span>') + '</td>' +
        '<td>' + esc(c.maxScore || 10) + '</td>' +
        '<td><input type="number" class="score-input" data-criteria="' + c.id + '" min="1" max="10" value="' + esc(val) + '" ' +
        (data.locked ? 'disabled' : '') + ' /></td></tr>';
    }).join('');

    return (
      '<div class="card"><h3>ขั้นตอนที่ 3: ' + esc(data.staff.name) + ' — ' + esc(data.template.name) + '</h3>' +
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
    if (btnDraft) btnDraft.addEventListener('click', function () { submit(false); });

    var btnFinal = formArea.querySelector('#btnFinalize');
    if (btnFinal) {
      btnFinal.addEventListener('click', function () {
        if (!confirm('ยืนยันคะแนนชุดนี้? หลังยืนยันจะล็อกและแก้ไขไม่ได้ จนกว่าจะปลดล็อกจากหน้า "ผลการประเมิน (ทดลอง)"')) return;
        submit(true);
      });
    }

    function submit(finalize) {
      var values = collectValues(formArea);
      Api.call('submitScores', {
        cycleId: cycleId, staffId: staffId, _demoGroup: currentGroup,
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
