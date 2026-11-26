/**
 * demo-app.js
 * ตัวเริ่มต้นของ "หน้าทดลอง" (demo.html) — ไม่มีหน้า login เข้าสู่ระบบตรงเลย
 * ใช้ Api/Auth ที่ถูก override โดย mock-api.js แล้ว (ข้อมูลอยู่ใน localStorage)
 */

(function () {
  var sidebar = document.getElementById('sidebar');
  var content = document.getElementById('content');
  var topbarPageTitle = document.getElementById('topbarPageTitle');

  var MENU = [
    { id: 'home', label: 'วิธีใช้งาน / เริ่มต้น', render: Pages.DemoHome.render },
    { id: 'dashboard', label: 'หน้าหลัก / ความคืบหน้า', render: Pages.Dashboard.render },
    { id: 'units', label: 'สังกัด (ทดลอง)', render: Pages.Units.render },
    { id: 'staffTypes', label: 'ประเภทบุคลากร (ทดลอง)', render: Pages.StaffTypes.render },
    { id: 'people', label: 'บุคลากร (ทดลอง)', render: Pages.People.render },
    { id: 'templates', label: 'แบบประเมิน/ตัวชี้วัด (ทดลอง)', render: Pages.Templates.render },
    { id: 'cycles', label: 'รอบประเมิน (ทดลอง)', render: Pages.Cycles.render },
    { id: 'score', label: 'ลงคะแนน (ทดลอง)', render: Pages.DemoScore.render },
    { id: 'report', label: 'ผลการประเมิน (ทดลอง)', render: Pages.Report.render }
  ];

  function buildSidebar() {
    sidebar.innerHTML = '';
    MENU.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.page = item.id;
      btn.innerHTML = '<span class="nav-icon"></span><span>' + item.label + '</span>';
      btn.addEventListener('click', function () { navigateTo(item.id); });
      sidebar.appendChild(btn);
    });
  }

  function navigateTo(pageId) {
    var page = MENU.find(function (m) { return m.id === pageId; });
    if (!page) return;

    document.querySelectorAll('.sidebar .nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    topbarPageTitle.textContent = page.label;

    content.innerHTML = '<p class="muted">กำลังโหลด...</p>';
    Promise.resolve(page.render(content, Auth.getSession())).catch(function (err) {
      content.innerHTML = '<p class="error-text">เกิดข้อผิดพลาด: ' + (err.message || err) + '</p>';
    });
  }

  buildSidebar();
  navigateTo('home');
})();
