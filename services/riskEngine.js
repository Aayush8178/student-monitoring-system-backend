const { Attendance, Assessment, Fee, Alert } = require("../db");

async function runRiskEngine(studentId) {
  const alerts = [];

  // attendance check
  const attendanceRecords = await Attendance.find({ studentId });
  if (attendanceRecords.length > 0) {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(a => a.status === "present").length;
    const percent = (present / total) * 100;
    if (percent < 70) alerts.push("Low Attendance (<70%)");
  }

  // assessment check
  const failed = await Assessment.find({ studentId, score: { $lt: 40 } });
  if (failed.length >= 3) alerts.push("More than 3 failed tests");

  // fee check
  const unpaid = await Fee.find({ studentId, status: "unpaid" });
  if (unpaid.some(f => new Date(f.dueDate) < new Date())) {
    alerts.push("Fee overdue");
  }

  // save alerts
  for (let reason of alerts) {
    await Alert.create({ studentId, reason, status: "pending" });
  }

  return alerts;
}

module.exports = { runRiskEngine };
