const XLSX = require("xlsx");
const { Attendance, Student, Alert } = require("../db");
const transporter = require("../utils/email");

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

    // sending one mail to guardians 
    for (const studentId of studentsToNotify) {
      const student = await Student.findById(studentId);
      if (student.guardian) {
        await transporter.sendMail({
          from: `"Student Monitoring System" <${process.env.EMAIL_USER}>`,
          to: student.guardian,
          subject: "Important Notice Regarding Student Attendance & Performance",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
                
                <h2 style="color: #1d4ed8; text-align: center;">
                  Student Performance Alert
                </h2>

                <p>Dear Parent / Guardian,</p>

                <p>
                  We would like to inform you that your ward’s recent academic indicators
                  require attention.
                </p>

                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Student Name</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${student.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Attendance Percentage</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${student.attendancePercentage}%</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Average Academic Score</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${student.averageScore || 0}%</td>
                  </tr>
                </table>

                <p>
                  Regular attendance and consistent academic performance are important for
                  overall success. We kindly request your support in helping improve both
                  attendance and study outcomes.
                </p>

                <p>
                  Please feel free to contact the institution if you would like further
                  details or guidance.
                </p>

                <p style="margin-top: 20px;">
                  Regards,<br />
                  <strong>Academic Monitoring Team</strong><br />
                  <span style="color: #555;">Student Monitoring System</span>
                </p>

                <hr style="margin-top: 30px;" />
                <p style="font-size: 12px; color: #777; text-align: center;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        });
      }
    }

    res.json({ message: "Attendance uploaded successfully" });
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
