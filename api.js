/**
 * api.js
 * ชั้นเรียก Apps Script API ตัวเดียวสำหรับทุก action
 * ตั้งค่า API_URL เป็น URL ของ Web app deployment หลัง deploy backend/Code.gs แล้ว
 */

var API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

var Api = (function () {
  function call(action, params) {
    params = params || {};
    var token = Auth.getToken();
    var body = Object.assign({ action: action, token: token }, params);

    return fetch(API_URL, {
      method: 'POST',
      // ใช้ text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json.ok) {
          throw new Error(json.error || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
        }
        return json.data;
      });
  }

  return { call: call };
})();
