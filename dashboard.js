/**
 * pages/dashboard.js
 * หน้าหลัก: แสดงรอบประเมินที่เปิดอยู่ และความคืบหน้าการลงคะแนน (ไม่แสดงคะแนนจริง)
 */

var Pages = window.Pages || {};
Pages.Dashboard = (function () {

  function render(content, session) {
    content.innerHTML = '<p class="muted">กำลังโหลดรอบประเมิน...</p>';

    return Api.call('listCycles', {}).then(function (cycles) {
      var openCycles = cycles.filter(function (c) { return c.status === 'open'; });
      var draftCycles = cycles.filter(function (c) { return c.status === 'draft'; });
      var closedCycles = cycles.filter(function (c) { return c.status === 'closed'; });

      var html = '<div class="bento-grid">' +
        statCard('เปิดอยู่', openCycles.length, 'รอบประเมิน', true) +
        statCard('ร่าง', draftCycles.length, 'รอยังไม่เปิด', false) +
        statCard('ปิดแล้ว', closedCycles.length, 'รอบที่เสร็จสิ้น', false) +
        statCard('ทั้งหมด', cycles.length, 'รอบในระบบ', false) +
        '</div>';

      html += '<div class="card"><h3>รอบประเมินที่เปิดอยู่</h3>';
      if (openCycles.length === 0) {
        html += '<p class="muted">ยังไม่มีรอบประเมินที่เปิดอยู่</p>';
      } else {
        html += '<table><thead><tr><th>ชื่อรอบ</th><th>ปี</th><th>รอบที่</th><th>สถานะ</th><th></th></tr></thead><tbody>';
        openCycles.forEach(function (c) {
          html += '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.year) + '</td><td>' + esc(c.round) + '</td>' +
            '<td><span class="badge badge-success">เปิดอยู่</span></td>' +
            '<td><button class="btn-secondary" data-progress="' + c.id + '">ดูความคืบหน้า</button></td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div><div id="progressArea"></div>';
      content.innerHTML = html;

      content.querySelectorAll('[data-progress]').forEach(function (btn) {
        btn.addEventListener('click', function () { showProgress(btn.dataset.progress); });
      });

      if (openCycles.length === 1) showProgress(openCycles[0].id);
    });
  }

  function statCard(label, value, sub, accent) {
    return '<div class="bento-stat' + (accent ? ' accent' : '') + '">' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '<div class="stat-value">' + esc(value) + '</div>' +
      '<div class="stat-sub">' + esc(sub) + '</div>' +
      '</div>';
  }

  function showProgress(cycleId) {
    var area = document.getElementById('progressArea');
    area.innerHTML = '<p class="muted">กำลังโหลดความคืบหน้า...</p>';
    Api.call('getProgress', { cycleId: cycleId }).then(function (rows) {
      var doneCount = rows.filter(function (r) { return r.submitted.head && r.submitted.senior && r.submitted.peer; }).length;

      var html = '<div class="bento-grid">' +
        statCard('ครบทั้ง 3 กลุ่ม', doneCount, 'จาก ' + rows.length + ' คน', true) +
        statCard('บุคลากรทั้งหมด', rows.length, 'ในรอบนี้', false) +
        '</div>';

      html += '<div class="card"><h3>ความคืบหน้าการลงคะแนน</h3>';
      html += '<table><thead><tr><th>ชื่อ</th><th>หัวหน้า</th><th>Senior</th><th>ผู้ร่วมงาน</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr><td>' + esc(r.name) + '</td>' +
          statusCell(r.submitted.head) + statusCell(r.submitted.senior) + statusCell(r.submitted.peer) +
          '</tr>';
      });
      html += '</tbody></table></div>';
      area.innerHTML = html;
    });
  }

  function statusCell(submitted) {
    return submitted
      ? '<td><span class="badge badge-success">ลงแล้ว</span></td>'
      : '<td><span class="badge badge-muted">ยังไม่ลง</span></td>';
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return { render: render, esc: esc };
})();
