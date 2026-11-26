/**
 * app.js
 * จุดเริ่มต้นของแอป: ควบคุมการสลับหน้าจอ login <-> app shell
 * และสร้างเมนู sidebar ตามบทบาทของผู้ใช้ที่ล็อกอิน
 */

(function () {
  var viewLogin = document.getElementById('viewLogin');
  var appShell = document.getElementById('appShell');
  var sidebar = document.getElementById('sidebar');
  var content = document.getElementById('content');
  var topbarUserName = document.getElementById('topbarUserName');
  var userAvatar = document.getElementById('userAvatar');
  var topbarPageTitle = document.getElementById('topbarPageTitle');
  var topbarRoleBadge = document.getElementById('topbarRoleBadge');
  var loginError = document.getElementById('loginError');

  // --- Login tabs ---
  var tabs = document.querySelectorAll('.login-tabs .tab');
  var formPassword = document.getElementById('formLoginPassword');
  var formCode = document.getElementById('formLoginCode');
  var descPassword = document.getElementById('loginTabDescPassword');
  var descCode = document.getElementById('loginTabDescCode');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var isPassword = tab.dataset.tab === 'password';
      formPassword.hidden = !isPassword;
      formCode.hidden = isPassword;
      descPassword.hidden = !isPassword;
      descCode.hidden = isPassword;
      loginError.hidden = true;
    });
  });

  formPassword.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value;
    loginError.hidden = true;
    Auth.loginWithPassword(username, password).then(onLoginSuccess).catch(onLoginError);
  });

  formCode.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = document.getElementById('loginCode').value.trim();
    loginError.hidden = true;
    Auth.loginWithCode(code).then(onLoginSuccess).catch(onLoginError);
  });

  document.getElementById('btnLogout').addEventListener('click', function () {
    Auth.logout().then(showLogin);
  });

  function onLoginError(err) {
    loginError.textContent = err.message || 'เข้าสู่ระบบไม่สำเร็จ';
    loginError.hidden = false;
  }

  function onLoginSuccess() {
    showApp();
  }

  function showLogin() {
    viewLogin.hidden = false;
    appShell.hidden = true;
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginCode').value = '';
  }

  function showApp() {
    viewLogin.hidden = true;
    appShell.hidden = false;

    var session = Auth.getSession();
    var label = labelForSession(session);
    topbarUserName.textContent = label;
    userAvatar.textContent = label.charAt(0);
    topbarRoleBadge.textContent = label;

    buildSidebar(session.role);
    navigateTo(defaultPageFor(session.role));
  }

  function labelForSession(session) {
    if (session.role === 'admin') return 'ผู้ดูแลระบบ';
    if (session.role === 'head') return 'หัวหน้าหน่วย (' + session.unitId + ')';
    if (session.role === 'recorder_senior') return 'ผู้บันทึกกลุ่ม Senior';
    if (session.role === 'recorder_peer') return 'ผู้บันทึกกลุ่มผู้ร่วมงาน';
    return session.role;
  }

  // --- Menu definition per role ---
  var MENUS = {
    admin: [
      { id: 'dashboard', label: 'หน้าหลัก / ความคืบหน้า', render: Pages.Dashboard.render },
      { id: 'units', label: 'สังกัด', render: Pages.Units.render },
      { id: 'staffTypes', label: 'ประเภทบุคลากร', render: Pages.StaffTypes.render },
      { id: 'people', label: 'บุคลากร', render: Pages.People.render },
      { id: 'templates', label: 'แบบประเมิน', render: Pages.Templates.render },
      { id: 'cycles', label: 'รอบประเมิน', render: Pages.Cycles.render },
      { id: 'settings', label: 'ผู้ใช้ระบบ', render: Pages.Settings.render }
    ],
    head: [
      { id: 'dashboard', label: 'หน้าหลัก / ความคืบหน้า', render: Pages.Dashboard.render },
      { id: 'score', label: 'ให้คะแนน (หัวหน้า)', render: Pages.Score.render },
      { id: 'report', label: 'ผลการประเมิน', render: Pages.Report.render }
    ],
    recorder_senior: [
      { id: 'score', label: 'กรอกคะแนนกลุ่ม Senior', render: Pages.Score.render }
    ],
    recorder_peer: [
      { id: 'score', label: 'กรอกคะแนนกลุ่มผู้ร่วมงาน', render: Pages.Score.render }
    ]
  };

  function defaultPageFor(role) {
    return MENUS[role][0].id;
  }

  function buildSidebar(role) {
    sidebar.innerHTML = '';
    (MENUS[role] || []).forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.page = item.id;
      btn.innerHTML = '<span class="nav-icon"></span><span>' + item.label + '</span>';
      btn.addEventListener('click', function () { navigateTo(item.id); });
      sidebar.appendChild(btn);
    });
  }

  function navigateTo(pageId) {
    var session = Auth.getSession();
    var menu = MENUS[session.role] || [];
    var page = menu.find(function (m) { return m.id === pageId; });
    if (!page) return;

    document.querySelectorAll('.sidebar .nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    topbarPageTitle.textContent = page.label;

    content.innerHTML = '<p class="muted">กำลังโหลด...</p>';
    Promise.resolve(page.render(content, session)).catch(function (err) {
      content.innerHTML = '<p class="error-text">เกิดข้อผิดพลาด: ' + (err.message || err) + '</p>';
    });
  }

  // --- เริ่มต้นแอป ---
  if (Auth.isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
})();
