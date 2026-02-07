const XLSX = require("xlsx");
const { Assessment, Student, Alert } = require("../db");
const transporter = require("../utils/email");

// upload assessments
exports.uploadAssessment = async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const studentsToNotify = new Set();

    for (const row of data) {
      const { studentId, subject, testDate, score } = row;
      if (!studentId) continue;

      await Assessment.create({ studentId, subject, testDate, score });

      const records = await Assessment.find({ studentId });
      const totalTests = records.length;
      const averageScore = Math.round(records.reduce((s, r) => s + r.score, 0) / totalTests);

      const student = await Student.findByIdAndUpdate(
        studentId,
        { totalTests, averageScore },
        { new: true }
      );

      if (averageScore < 40) {
        studentsToNotify.add(student._id.toString());

        const existing = await Alert.findOne({
          studentId: student._id,
          reason: "Low Academic Performance (<40%)"
        });

        if (!existing) {
          await Alert.create({
            studentId: student._id,
            reason: "Low Academic Performance (<40%)",
            status: "pending"
          });
        }
      }
    }

    res.json({ message: "Assessment uploaded successfully" });
  } catch (err) {
    res.status(500).json({ message: "Assessment upload failed" });
  }
};

// student assessment list
exports.getStudentAssessments = async (req, res) => {
  const records = await Assessment.find({ studentId: req.user.studentId }).sort({ testDate: -1 });
  res.json(records);
};

// Ttend 
exports.getAssessmentTrend = async (req, res) => {
  try {
    const records = await Assessment.find({ studentId: req.user.studentId }).sort({ testDate: 1 });

    const trend = records.map(r => ({
      date: new Date(r.testDate).toLocaleDateString(),
      score: r.score
    }));

    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trend data" });
  }
};
