/**
 * calc.js
 * ฟังก์ชันคำนวณฝั่งหน้าเว็บ (เสริม การคำนวณจริง/การกรองสิทธิ์ทำที่ backend เสมอ)
 * ใช้สำหรับแสดงตัวอย่าง/คำนวณซ้ำบนข้อมูลที่ backend ส่งมาให้แล้วเท่านั้น
 */

var Calc = (function () {
  /**
   * คำนวณคะแนนถ่วงน้ำหนักของ 1 กลุ่ม จาก criteria + scores ที่กรอก (0-10)
   * criteria: [{id, weight, maxScore}]
   * scores: { criteriaId: value }
   */
  function weightedScoreForGroup(criteria, scores) {
    var total = 0;
    var answered = 0;
    criteria.forEach(function (c) {
      var val = scores[c.id];
      if (val !== undefined && val !== null && val !== '') {
        total += (Number(val) / Number(c.maxScore || 10)) * Number(c.weight || 0);
        answered++;
      }
    });
    return { total: total, answered: answered, isComplete: answered === criteria.length };
  }

  function finalScore(byGroupWeighted, groupWeights) {
    var groups = ['head', 'senior', 'peer'];
    if (!groups.every(function (g) { return byGroupWeighted[g] !== null && byGroupWeighted[g] !== undefined; })) {
      return null;
    }
    return groups.reduce(function (sum, g) {
      return sum + byGroupWeighted[g] * (Number(groupWeights[g] || 0) / 100);
    }, 0);
  }

  return { weightedScoreForGroup: weightedScoreForGroup, finalScore: finalScore };
})();
