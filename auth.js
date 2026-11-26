/**
 * auth.js
 * จัดการ token/session ฝั่งเบราว์เซอร์ (เก็บใน sessionStorage - หายเมื่อปิดแท็บ)
 * และฟังก์ชันล็อกอิน/ล็อกเอาท์
 */

var Auth = (function () {
  var STORAGE_KEY = 'pa_session';

  function getToken() {
    var s = getSession();
    return s ? s.token : null;
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function loginWithPassword(username, password) {
    return Api.call('login', { username: username, password: password }).then(function (data) {
      setSession(data);
      return data;
    });
  }

  function loginWithCode(code) {
    return Api.call('loginWithCode', { code: code }).then(function (data) {
      setSession(data);
      return data;
    });
  }

  function logout() {
    return Api.call('logout', {}).catch(function () {}).then(function () {
      clearSession();
    });
  }

  function role() {
    var s = getSession();
    return s ? s.role : null;
  }

  return {
    getToken: getToken,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    loginWithPassword: loginWithPassword,
    loginWithCode: loginWithCode,
    logout: logout,
    role: role
  };
})();
