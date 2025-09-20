const { Attendance, Student } = require("../db");
const transporter = require("../utils/email");
const XLSX = require("xlsx");

// 📌 Upload & process Excel attendance
exports.uploadAttendanceExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Expected Excel columns: studentId, subject, date, status
    for (const row of sheet) {
      await Attendance.create({
        studentId: row.studentId,
        subject: row.subject,
        date: new Date(row.date),
        status: row.status.toLowerCase(), // "present" / "absent"
      });
    }

    // ✅ Update each student's summary
    const students = await Student.find();

    for (const student of students) {
      const totalClasses = await Attendance.countDocuments({ studentId: student._id });
      const attendedClasses = await Attendance.countDocuments({
        studentId: student._id,
        status: "present",
      });

      const percentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

      // ✅ Update Student collection
      student.totalClasses = totalClasses;
      student.attendedClasses = attendedClasses;
      student.attendancePercentage = percentage.toFixed(2);
      await student.save();

      // ✅ Send warning email if below 60%
      if (percentage < 60 && student.guardian) {
        const mailOptions = {
          from: `"School Admin" <${process.env.EMAIL_USER}>`,
          to: student.guardian,
          subject: "⚠️ Low Attendance Warning",
          text: `Dear Guardian,

This is to notify you that your ward **${student.name}** has an attendance percentage of ${percentage.toFixed(
            2
          )}% which is below the required 60%.

Kindly ensure regular attendance to avoid further disciplinary action.

Regards,  
School Administration`,
        };

        await transporter.sendMail(mailOptions);
        console.log(
          `📩 Low attendance email sent to guardian of ${student.name} (${percentage.toFixed(2)}%)`
        );
      }
    }

    res.json({ message: "Attendance uploaded & processed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Attendance Summary (from Student collection)
exports.getAttendanceSummary = async (req, res) => {
  try {
    const students = await Student.find().select("name guardian totalClasses attendedClasses attendancePercentage");

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
