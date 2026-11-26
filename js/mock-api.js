/**
 * mock-api.js — ใช้สำหรับ "หน้าทดลอง" (demo.html) เท่านั้น
 * ==========================================================
 * จำลองพฤติกรรมของ backend (Apps Script) ทั้งหมดไว้ในเบราว์เซอร์ล้วนๆ
 * โดยเก็บข้อมูลลง localStorage แทน Google Sheets และ "ปลอมว่าล็อกอินเป็น Admin เสมอ"
 * เพื่อให้ทดลองกดเพิ่มสังกัด/ประเภทบุคลากร/บุคลากร/แบบประเมิน/ตัวชี้วัด/รอบประเมินได้ทันที
 * ไม่ต้องมี Apps Script หรือการล็อกอินจริง
 *
 * ไฟล์นี้ override ตัวแปร Api (จาก js/api.js) และ Auth (จาก js/auth.js) ที่ประกาศไว้ก่อนหน้า
 * เรียงลำดับการโหลดใน demo.html ให้ไฟล์นี้อยู่ "หลัง" api.js และ auth.js เสมอ
 *
 * คำเตือน: ข้อมูลในหน้าทดลองนี้เป็นข้อมูลปลอมในเครื่องนี้เท่านั้น ไม่เกี่ยวข้องกับระบบจริง
 * และไม่มีการเข้ารหัส/ตรวจสิทธิ์ใดๆ (เพื่อให้ทดลองทุกฟีเจอร์ได้ง่ายในบทบาทเดียว)
 *
 * หมายเหตุด้านสูตรคะแนน (ตรงกับ backend/Scoring.gs):
 * - 1 คนมีแบบประเมินได้ 1 ใบเท่านั้น (ผูกกับ staffId ตรงๆ ไม่ผูกกับประเภทบุคลากรอีกต่อไป)
 * - ไม่มีน้ำหนักตัวชี้วัดที่ใช้คำนวณจริง คะแนนของ 1 กลุ่มผู้ประเมิน = ค่าเฉลี่ยของทุกตัวชี้วัดในแบบประเมินนั้น
 * - คะแนนรวมสุดท้าย (เลขเดียว) = หัวหน้า×w1 + Senior×w2 + Peer×w3 ตามน้ำหนักกลุ่มผู้ประเมินที่ตั้งไว้ต่อรอบ
 */

(function () {
  var STORE_KEY = 'pa_demo_db_v3';

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function loadDb() {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* fallthrough to seed */ }
    }
    return seedDb();
  }

  function saveDb(db) {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  }

  function seedDb() {
    var now = new Date().toISOString();
    var unitMed1 = { id: uuid(), name: 'MED1', createdAt: now };
    var unitMed2 = { id: uuid(), name: 'MED2', createdAt: now };
    var typeNurse = { id: uuid(), name: 'พยาบาล', createdAt: now };
    var typeAssist = { id: uuid(), name: 'ผู้ช่วยพยาบาล', createdAt: now };

    var staff1 = { id: uuid(), name: 'สมหญิง ใจดี', unitId: unitMed1.id, staffTypeId: typeNurse.id, active: true, createdAt: now, updatedAt: now };
    var staff2 = { id: uuid(), name: 'สมชาย มั่นคง', unitId: unitMed1.id, staffTypeId: typeAssist.id, active: true, createdAt: now, updatedAt: now };

    // ตัวอย่าง: สร้างแบบประเมินให้สมหญิงไว้แล้ว 1 ใบ (เฉพาะบุคคล) เพื่อสาธิตขั้นตอนลงคะแนนได้ทันที
    var template1 = { id: uuid(), name: 'แบบประเมินของสมหญิง ใจดี', staffId: staff1.id, createdAt: now };
    var criteria1 = [
      { id: uuid(), templateId: template1.id, title: 'ความถูกต้องในการปฏิบัติงาน', weight: 40, maxScore: 10, sortOrder: 0 },
      { id: uuid(), templateId: template1.id, title: 'การดูแลผู้ป่วยด้วยความเอาใจใส่', weight: 30, maxScore: 10, sortOrder: 1 },
      { id: uuid(), templateId: template1.id, title: 'การทำงานเป็นทีม', weight: 30, maxScore: 10, sortOrder: 2 }
    ];

    var db = {
      units: [unitMed1, unitMed2],
      staffTypes: [typeNurse, typeAssist],
      staff: [staff1, staff2],
      users: [],
      templates: [template1],
      criteria: criteria1,
      cycles: [],
      scores: [],
      auditLog: []
    };
    saveDb(db);
    return db;
  }

  function resetDb() {
    localStorage.removeItem(STORE_KEY);
    return seedDb();
  }

  // ---------- Helper ----------

  function findById(list, id) { return list.find(function (x) { return x.id === id; }) || null; }

  function generateDemoCode() {
    // รหัสอ่านง่าย 8 ตัวอักษร ตัดอักขระที่สับสนง่าย (0/O, 1/I) ให้ตรงกับระบบจริง
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * หาแบบประเมินของบุคคลหนึ่งจาก snapshot (คืน null ถ้ายังไม่มี)
   */
  function resolveTemplateForStaffDemo(snap, staffSnap) {
    return snap.templates.find(function (t) { return t.staffId === staffSnap.id; }) || null;
  }

  // ---------- Mock Api ----------

  window.Api = {
    call: function (action, params) {
      params = params || {};
      var db = loadDb();

      try {
        var data = handle(action, params, db);
        saveDb(db);
        return Promise.resolve(data);
      } catch (err) {
        return Promise.reject(err instanceof Error ? err : new Error(String(err)));
      }
    },
    resetDemoData: resetDb
  };

  function handle(action, p, db) {
    switch (action) {
      case 'ping':
        return { pong: true, time: new Date().toISOString() };

      case 'listUnits':
        return db.units;
      case 'saveUnit': {
        var unit = p.unit;
        if (unit.id) {
          var existing = findById(db.units, unit.id);
          existing.name = unit.name;
          return existing;
        }
        var row = { id: uuid(), name: unit.name, createdAt: new Date().toISOString() };
        db.units.push(row);
        return row;
      }

      case 'listStaffTypes':
        return db.staffTypes;
      case 'saveStaffType': {
        var st = p.staffType;
        if (st.id) {
          var existingT = findById(db.staffTypes, st.id);
          existingT.name = st.name;
          return existingT;
        }
        var rowT = { id: uuid(), name: st.name, createdAt: new Date().toISOString() };
        db.staffTypes.push(rowT);
        return rowT;
      }

      case 'listStaff': {
        var filters = p.filters || {};
        var rows = db.staff.slice();
        if (filters.unitId) rows = rows.filter(function (s) { return s.unitId === filters.unitId; });
        if (filters.staffTypeId) rows = rows.filter(function (s) { return s.staffTypeId === filters.staffTypeId; });
        if (!filters.includeInactive) rows = rows.filter(function (s) { return s.active !== false; });
        return rows;
      }
      case 'saveStaff': {
        var staffInput = p.staff;
        var now = new Date().toISOString();
        if (staffInput.id) {
          var existingS = findById(db.staff, staffInput.id);
          existingS.name = staffInput.name;
          existingS.unitId = staffInput.unitId;
          existingS.staffTypeId = staffInput.staffTypeId;
          existingS.updatedAt = now;
          return existingS;
        }
        var rowS = {
          id: uuid(), name: staffInput.name, unitId: staffInput.unitId, staffTypeId: staffInput.staffTypeId,
          active: true, createdAt: now, updatedAt: now
        };
        db.staff.push(rowS);
        return rowS;
      }
      case 'setStaffActive': {
        var s = findById(db.staff, p.staffId);
        if (s) { s.active = !!p.active; s.updatedAt = new Date().toISOString(); }
        return { ok: true };
      }
      case 'deleteStaff': {
        var target = findById(db.staff, p.staffId);
        if (!target) throw new Error('ไม่พบบุคลากร');
        var openCycleIds = db.cycles.filter(function (c) { return c.status === 'open'; }).map(function (c) { return c.id; });
        var hasScoresInOpenCycle = db.scores.some(function (sc) {
          return sc.staffId === p.staffId && openCycleIds.indexOf(sc.cycleId) !== -1;
        });
        if (hasScoresInOpenCycle) {
          throw new Error('ไม่สามารถลบได้ เนื่องจากบุคลากรนี้มีคะแนนอยู่ในรอบประเมินที่กำลังเปิดอยู่ กรุณาปิดรอบก่อน หรือใช้ "ปิดใช้งาน" แทน');
        }
        db.staff = db.staff.filter(function (s2) { return s2.id !== p.staffId; });
        db.auditLog = db.auditLog || [];
        db.auditLog.push({
          id: uuid(), timestamp: new Date().toISOString(), action: 'deleteStaff',
          detail: { staffId: target.id, name: target.name, unitId: target.unitId, staffTypeId: target.staffTypeId }
        });
        return { ok: true };
      }
      case 'importStaffCsv': {
        var lines = p.csvText.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        var created = 0;
        lines.forEach(function (line, idx) {
          var cols = line.split(',').map(function (c) { return c.trim(); });
          if (idx === 0 && /name|ชื่อ/i.test(cols[0])) return;
          if (cols.length < 3 || !cols[0]) return;
          var name = cols[0], unitName = cols[1], typeName = cols[2];

          var unitRow = db.units.find(function (u) { return u.name === unitName; });
          if (!unitRow) { unitRow = { id: uuid(), name: unitName, createdAt: new Date().toISOString() }; db.units.push(unitRow); }
          var typeRow = db.staffTypes.find(function (t) { return t.name === typeName; });
          if (!typeRow) { typeRow = { id: uuid(), name: typeName, createdAt: new Date().toISOString() }; db.staffTypes.push(typeRow); }

          var now2 = new Date().toISOString();
          db.staff.push({ id: uuid(), name: name, unitId: unitRow.id, staffTypeId: typeRow.id, active: true, createdAt: now2, updatedAt: now2 });
          created++;
        });
        return { created: created, totalLines: lines.length };
      }

      case 'listUsers':
        return db.users;
      case 'saveUser': {
        var u = p.user;
        if (u.id) {
          var existingU = findById(db.users, u.id);
          if (!existingU) throw new Error('ไม่พบผู้ใช้');
          if (u.username !== undefined) existingU.username = u.username;
          if (u.role !== undefined) existingU.role = u.role;
          if (u.unitId !== undefined) existingU.unitId = u.unitId;
          if (u.displayName !== undefined) existingU.displayName = u.displayName;
          if (u.active !== undefined) existingU.active = u.active !== false;
          return { id: existingU.id };
        }
        var rowU = {
          id: uuid(), username: u.username, role: u.role, unitId: u.unitId || '',
          displayName: u.displayName || u.username, active: true, createdAt: new Date().toISOString()
        };
        db.users.push(rowU);
        return { id: rowU.id };
      }

      case 'listTemplates': {
        var tf = p.filters || {};
        var tRows = db.templates.slice();
        if (tf.staffId) tRows = tRows.filter(function (t) { return t.staffId === tf.staffId; });
        return tRows;
      }
      case 'saveTemplate': {
        var tpl = p.template;
        if (tpl.id) {
          var existingTpl = findById(db.templates, tpl.id);
          existingTpl.name = tpl.name;
          return existingTpl;
        }
        var alreadyHas = db.templates.some(function (t) { return t.staffId === tpl.staffId; });
        if (alreadyHas) {
          throw new Error('บุคคลนี้มีแบบประเมินอยู่แล้ว (1 คนมีได้ 1 แบบประเมิน) กรุณาแก้ไขแบบประเมินเดิมแทนการสร้างใหม่');
        }
        var rowTpl = { id: uuid(), name: tpl.name, staffId: tpl.staffId, createdAt: new Date().toISOString() };
        db.templates.push(rowTpl);
        return rowTpl;
      }
      case 'deleteTemplate': {
        var tplToDelete = findById(db.templates, p.templateId);
        if (!tplToDelete) throw new Error('ไม่พบแบบประเมิน');

        var openCyclesD = db.cycles.filter(function (c) { return c.status === 'open'; });
        var usedInOpenCycle = openCyclesD.some(function (c) {
          if (!c.snapshotJson) return false;
          var snapD;
          try { snapD = JSON.parse(c.snapshotJson); } catch (e) { return false; }
          return (snapD.templates || []).some(function (t) { return t.id === p.templateId; });
        });
        if (usedInOpenCycle) {
          throw new Error('ไม่สามารถลบได้ เนื่องจากแบบประเมินนี้ถูกใช้อยู่ในรอบประเมินที่กำลังเปิดอยู่ กรุณาปิดรอบก่อนจึงลบได้');
        }

        db.templates = db.templates.filter(function (t) { return t.id !== p.templateId; });
        db.criteria = db.criteria.filter(function (c) { return c.templateId !== p.templateId; });
        db.auditLog = db.auditLog || [];
        db.auditLog.push({
          id: uuid(), timestamp: new Date().toISOString(), action: 'deleteTemplate',
          detail: { templateId: tplToDelete.id, name: tplToDelete.name, staffId: tplToDelete.staffId }
        });
        return { ok: true };
      }
      case 'listCriteria': {
        return db.criteria
          .filter(function (c) { return c.templateId === p.templateId; })
          .sort(function (a, b) { return Number(a.sortOrder || 0) - Number(b.sortOrder || 0); });
      }
      case 'saveCriteria': {
        // weight เป็นค่าแสดงผล/อ้างอิงเท่านั้น ไม่ใช้คำนวณ ไม่บังคับรวม = 100
        db.criteria = db.criteria.filter(function (c) { return c.templateId !== p.templateId; });
        p.criteria.forEach(function (c, idx) {
          db.criteria.push({
            id: c.id || uuid(), templateId: p.templateId, title: c.title,
            weight: c.weight || 0, maxScore: c.maxScore || 10, sortOrder: idx
          });
        });
        return { ok: true, count: p.criteria.length };
      }

      case 'listCycles':
        return db.cycles.map(function (c) {
          return { id: c.id, name: c.name, year: c.year, round: c.round, status: c.status, groupWeights: c.groupWeights, startDate: c.startDate, endDate: c.endDate };
        });
      case 'saveCycle': {
        // ไม่บังคับว่าน้ำหนักกลุ่มผู้ประเมินต้องรวมกันได้ 100 เสมอไป
        // เพราะส่วนที่เหลืออาจเป็นคะแนนประเมินตนเองที่กรอกผ่านช่องทางอื่นนอกระบบนี้
        var cyc = p.cycle;
        var weights = cyc.groupWeights || { head: 10, senior: 40, peer: 40 };

        if (cyc.id) {
          var existingC = findById(db.cycles, cyc.id);
          existingC.name = cyc.name; existingC.year = cyc.year; existingC.round = cyc.round;
          existingC.groupWeights = JSON.stringify(weights);
          existingC.startDate = cyc.startDate; existingC.endDate = cyc.endDate;
          return { id: existingC.id };
        }
        var rowC = {
          id: uuid(), name: cyc.name, year: cyc.year, round: cyc.round, status: 'draft',
          groupWeights: JSON.stringify(weights), startDate: cyc.startDate, endDate: cyc.endDate,
          snapshotJson: '', createdAt: new Date().toISOString()
        };
        db.cycles.push(rowC);
        return rowC;
      }
      case 'openCycle': {
        var cycle = findById(db.cycles, p.cycleId);
        if (!cycle) throw new Error('ไม่พบรอบประเมิน');
        if (cycle.status === 'open') throw new Error('รอบนี้เปิดอยู่แล้ว');
        var activeStaff = db.staff.filter(function (s) { return s.active !== false; });
        cycle.status = 'open';
        cycle.snapshotJson = JSON.stringify({ staff: activeStaff, templates: db.templates, criteria: db.criteria, snapshotAt: new Date().toISOString() });
        return { ok: true, staffCount: activeStaff.length };
      }
      case 'closeCycle': {
        var cycleC = findById(db.cycles, p.cycleId);
        if (!cycleC) throw new Error('ไม่พบรอบประเมิน');
        cycleC.status = 'closed';
        return { ok: true };
      }
      case 'generateAccessCodes': {
        var cycle3 = findById(db.cycles, p.cycleId);
        if (!cycle3) throw new Error('ไม่พบรอบประเมิน');
        var codes = { senior: generateDemoCode(), peer: generateDemoCode() };
        db.accessCodes = db.accessCodes || [];
        ['senior', 'peer'].forEach(function (g) {
          db.accessCodes.push({ code: codes[g], cycleId: p.cycleId, unitId: p.unitId, group: g, used: false });
        });
        return codes;
      }

      case 'getMyScoringStatus': {
        var snapMS = getSnapshot(db, p.cycleId);
        var groupMS = p._demoGroup || 'head';
        var scoresMS = db.scores.filter(function (sc) { return sc.cycleId === p.cycleId && sc.group === groupMS; });
        return snapMS.staff.map(function (s) {
          var template = resolveTemplateForStaffDemo(snapMS, s);
          var submitted = !!template && scoresMS.some(function (sc) { return sc.staffId === s.id; });
          return { staffId: s.id, hasTemplate: !!template, submitted: submitted };
        });
      }

      case 'getScoreSheet': {
        var snap = getSnapshot(db, p.cycleId);
        var staffSnap = snap.staff.find(function (s) { return s.id === p.staffId; });
        if (!staffSnap) throw new Error('บุคลากรนี้ไม่อยู่ใน snapshot ของรอบนี้');
        var tpl2 = resolveTemplateForStaffDemo(snap, staffSnap);
        if (!tpl2) throw new Error('บุคคลนี้ยังไม่มีแบบประเมิน กรุณาให้ Admin เพิ่มแบบประเมินก่อน');
        var crit2 = snap.criteria.filter(function (c) { return c.templateId === tpl2.id; });
        var group = p._demoGroup || 'head';
        var rowsExisting = db.scores.filter(function (sc) {
          return sc.cycleId === p.cycleId && sc.staffId === p.staffId && sc.group === group;
        });
        var scoresByCrit = {};
        var locked = false;
        rowsExisting.forEach(function (r) { scoresByCrit[r.criteriaId] = r.value; if (r.locked) locked = true; });
        return { staff: { id: staffSnap.id, name: staffSnap.name }, template: { id: tpl2.id, name: tpl2.name }, criteria: crit2, scores: scoresByCrit, group: group, locked: locked };
      }
      case 'submitScores': {
        var snapSub = getSnapshot(db, p.cycleId);
        var staffSnapSub = snapSub.staff.find(function (s) { return s.id === p.staffId; });
        if (!staffSnapSub) throw new Error('บุคลากรนี้ไม่อยู่ใน snapshot ของรอบนี้');
        var tplSub = resolveTemplateForStaffDemo(snapSub, staffSnapSub);
        if (!tplSub) throw new Error('บุคคลนี้ยังไม่มีแบบประเมิน กรุณาให้ Admin เพิ่มแบบประเมินก่อน');

        var group2 = p._demoGroup || 'head';
        var existingForGroup = db.scores.filter(function (sc) {
          return sc.cycleId === p.cycleId && sc.staffId === p.staffId && sc.group === group2;
        });
        if (existingForGroup.some(function (sc) { return sc.locked; })) {
          throw new Error('คะแนนชุดนี้ถูกยืนยันและล็อกแล้ว ต้องปลดล็อกก่อนจึงแก้ไขได้');
        }
        var finalize = !!p.scores._finalize;
        var values = p.scores.values || p.scores;
        Object.keys(values).forEach(function (critId) {
          var num = Number(values[critId]);
          if (isNaN(num) || num < 1 || num > 10) throw new Error('คะแนนต้องเป็นตัวเลข 1-10');
          var ex = existingForGroup.find(function (sc) { return sc.criteriaId === critId; });
          if (ex) { ex.value = num; ex.locked = finalize; }
          else { db.scores.push({ id: uuid(), cycleId: p.cycleId, staffId: p.staffId, group: group2, criteriaId: critId, value: num, locked: finalize }); }
        });
        return { ok: true, locked: finalize };
      }
      case 'unlockScores': {
        db.scores.filter(function (sc) { return sc.cycleId === p.cycleId && sc.staffId === p.staffId && sc.group === p.group; })
          .forEach(function (sc) { sc.locked = false; });
        return { ok: true };
      }

      case 'getProgress': {
        var snapP = getSnapshot(db, p.cycleId);
        return snapP.staff.map(function (s) {
          var template = resolveTemplateForStaffDemo(snapP, s);
          var submitted = {};
          ['head', 'senior', 'peer'].forEach(function (g) {
            submitted[g] = !!template && db.scores.some(function (sc) { return sc.cycleId === p.cycleId && sc.staffId === s.id && sc.group === g; });
          });
          return { staffId: s.id, name: s.name, unitId: s.unitId, submitted: submitted, hasTemplate: !!template };
        });
      }
      case 'getResults':
        return getResultsDemo(db, p.cycleId, p.staffId);
      case 'getUnitSummary': {
        var snapU = getSnapshot(db, p.cycleId);
        return snapU.staff.map(function (s) {
          var template = resolveTemplateForStaffDemo(snapU, s);
          if (!template) {
            return { staffId: s.id, name: s.name, hasTemplate: false, finalScore: null, byGroup: { head: null, senior: null, peer: null } };
          }
          var r = getResultsDemo(db, p.cycleId, s.id);
          return {
            staffId: s.id, name: s.name, hasTemplate: true,
            finalScore: r.finalScore,
            byGroup: { head: r.byGroup.head.averageScore, senior: r.byGroup.senior.averageScore, peer: r.byGroup.peer.averageScore }
          };
        });
      }

      default:
        throw new Error('(โหมดทดลอง) ไม่รู้จักคำสั่ง: ' + action);
    }
  }

  function getSnapshot(db, cycleId) {
    var cycle = findById(db.cycles, cycleId);
    if (!cycle) throw new Error('ไม่พบรอบประเมิน');
    if (!cycle.snapshotJson) throw new Error('รอบนี้ยังไม่ได้เปิด (ไม่มี snapshot)');
    return JSON.parse(cycle.snapshotJson);
  }

  /**
   * ผลคะแนนของบุคคลหนึ่ง: ถอดรหัสครบทุกกลุ่ม + คะแนนรวมสุดท้าย (เลขเดียว) ถ่วงน้ำหนักกลุ่มผู้ประเมิน
   */
  function getResultsDemo(db, cycleId, staffId) {
    var snap = getSnapshot(db, cycleId);
    var staffSnap = snap.staff.find(function (s) { return s.id === staffId; });
    if (!staffSnap) throw new Error('บุคลากรนี้ไม่อยู่ใน snapshot ของรอบนี้');
    var tpl = resolveTemplateForStaffDemo(snap, staffSnap);
    if (!tpl) throw new Error('บุคคลนี้ยังไม่มีแบบประเมินในรอบนี้');
    var criteria = snap.criteria.filter(function (c) { return c.templateId === tpl.id; });
    var cycle = findById(db.cycles, cycleId);
    var weights = cycle.groupWeights ? JSON.parse(cycle.groupWeights) : { head: 10, senior: 40, peer: 40 };

    var byGroup = {};
    ['head', 'senior', 'peer'].forEach(function (g) {
      var rowsForGroup = db.scores.filter(function (sc) { return sc.cycleId === cycleId && sc.staffId === staffId && sc.group === g; });
      var scoresMap = {};
      rowsForGroup.forEach(function (r) { scoresMap[r.criteriaId] = r.value; });

      var sum = 0, count = 0;
      criteria.forEach(function (c) {
        var val = scoresMap[c.id];
        if (val !== undefined) { sum += val; count++; }
      });
      var average = count > 0 ? sum / count : null;

      byGroup[g] = { scores: scoresMap, submitted: rowsForGroup.length > 0, locked: rowsForGroup.some(function (r) { return r.locked; }), averageScore: average };
    });

    var finalScore = null;
    if (['head', 'senior', 'peer'].every(function (g) { return byGroup[g].averageScore !== null; })) {
      finalScore = ['head', 'senior', 'peer'].reduce(function (sum, g) { return sum + byGroup[g].averageScore * (Number(weights[g] || 0) / 100); }, 0);
    }

    return { staff: { id: staffSnap.id, name: staffSnap.name }, template: { id: tpl.id, name: tpl.name }, criteria: criteria, groupWeights: weights, byGroup: byGroup, finalScore: finalScore };
  }

  // ---------- Mock Auth: ถือว่าล็อกอินเป็น Admin ตลอดในหน้าทดลอง ----------

  window.Auth = {
    getToken: function () { return 'demo-token'; },
    getSession: function () { return { token: 'demo-token', role: 'admin', unitId: '', displayName: 'ผู้ทดลองระบบ (Demo)', username: 'demo' }; },
    isLoggedIn: function () { return true; },
    loginWithPassword: function () { return Promise.resolve(window.Auth.getSession()); },
    loginWithCode: function () { return Promise.resolve(window.Auth.getSession()); },
    logout: function () { return Promise.resolve(); },
    role: function () { return 'admin'; }
  };

  window.DemoDb = { reset: resetDb };
})();
