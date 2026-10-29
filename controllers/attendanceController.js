const XLSX = require("xlsx");
const { Attendance, Student, Alert } = require("../db");
const transporter = require("../utils/email");
const EmailService = require("../utils/emailService");

const uploadAttendance = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const studentsToNotify = new Set();

    for (const row of data) {
      const { studentId, subject, date, status } = row;
      if (!studentId || !subject || !date || !status) continue;

      await Attendance.create({ studentId, subject, date, status });

      const records = await Attendance.find({ studentId });
      const totalClasses = records.length;
      const attendedClasses = records.filter(r => r.status === "present").length;
      const percentage = totalClasses === 0 ? 0 : Math.round((attendedClasses / totalClasses) * 100);

      const student = await Student.findByIdAndUpdate(
        studentId,
        { totalClasses, attendedClasses, attendancePercentage: percentage },
        { new: true }
      );

      if (percentage < 60) {
        studentsToNotify.add(student._id.toString());

        const existing = await Alert.findOne({
          studentId: student._id,
          reason: "Low Attendance (<60%)",
        });

        if (!existing) {
          await Alert.create({
            studentId: student._id,
            reason: "Low Attendance (<60%)",
            status: "pending",
          });
        }
      }
    }

    // Send enhanced emails to guardians
    const emailResults = [];
    for (const studentId of studentsToNotify) {
      const student = await Student.findById(studentId);
      if (student.guardian) {
        try {
          const result = await EmailService.sendLowAttendanceAlert(student, 60);
          emailResults.push(result);
          
          // Mark alert as sent
          await Alert.updateOne(
            { studentId: student._id, reason: "Low Attendance (<60%)" },
            { status: "sent" }
          );
        } catch (err) {
          console.error(`Failed to send email for student ${student.name}:`, err);
          emailResults.push({ sent: false, error: err.message, studentId });
        }
      }
    }

    res.json({ 
      message: "Attendance uploaded successfully",
      notifiedStudents: studentsToNotify.size,
      emailsSent: emailResults.filter(r => r.sent).length,
      details: emailResults
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Attendance upload failed" });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const records = await Attendance.find({ studentId }).sort({ date: -1 }).limit(10);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance history" });
  }
};

module.exports = { uploadAttendance, getStudentAttendance };
