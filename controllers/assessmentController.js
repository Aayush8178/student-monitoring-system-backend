const { Assessment, Student } = require("../db");
const transporter = require("../utils/email");
const XLSX = require("xlsx");

// 📌 Upload & process Excel assessments
exports.uploadAssessmentExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Expected Excel columns: studentId, subject, testDate, score, attempt
    for (const row of sheet) {
      await Assessment.create({
        studentId: row.studentId,
        subject: row.subject,
        testDate: new Date(row.testDate),
        score: row.score,
        attempt: row.attempt || 1,
      });
    }

    // ✅ Update each student's average
    const students = await Student.find();

    for (const student of students) {
      const tests = await Assessment.find({ studentId: student._id });

      if (tests.length > 0) {
        const totalScore = tests.reduce((acc, t) => acc + t.score, 0);
        const average = totalScore / tests.length;

        student.totalTests = tests.length;
        student.averageScore = average.toFixed(2);
        await student.save();

        // ✅ Send warning if average < 40
        if (average < 40 && student.guardian) {
          const mailOptions = {
            from: `"School Admin" <${process.env.EMAIL_USER}>`,
            to: student.guardian,
            subject: "⚠️ Academic Warning: Low Average Score",
            text: `Dear Guardian,

This is to inform you that your ward **${student.name}** has an average score of ${average.toFixed(
              2
            )}% across ${tests.length} tests.

This is below the required threshold. Kindly provide support for improvement.

Regards,  
School Administration`,
          };

          await transporter.sendMail(mailOptions);
          console.log(`📩 Low score email sent to guardian of ${student.name}`);
        }
      }
    }

    res.json({ message: "Assessments uploaded & processed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Assessment Summary (admin or student)
exports.getAssessmentSummary = async (req, res) => {
  try {
    const students = await Student.find().select("name guardian totalTests averageScore");
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
