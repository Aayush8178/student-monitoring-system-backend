const { Student, Attendance, Assessment } = require("../db");

// add a student (admin only)
exports.addStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.json({ message: "Student added", student });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// get all students (admin)
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get logged-in student profile
exports.getMyProfile = async (req, res) => {
  try {
    if (!req.user.studentId) {
      return res.status(404).json({ error: "Student not linked to user" });
    }

    const student = await Student.findById(req.user.studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get student by ID
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// update student
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student updated", student });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// delete student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔥student summary from their records
exports.recomputeStudentSummary = async (req, res) => {
  try {
    const studentId = req.params.id;

    // attendance summary
    const attendance = await Attendance.find({ studentId });
    const totalClasses = attendance.length;
    const attendedClasses = attendance.filter(a => a.status === "present").length;
    const attendancePercentage =
      totalClasses === 0
        ? 0
        : Math.round((attendedClasses / totalClasses) * 100);

    // assessment summary
    const assessments = await Assessment.find({ studentId });
    const totalTests = assessments.length;
    const averageScore =
      totalTests === 0
        ? 0
        : Math.round(
            assessments.reduce((sum, a) => sum + a.score, 0) / totalTests
          );

    const student = await Student.findByIdAndUpdate(
      studentId,
      {
        totalClasses,
        attendedClasses,
        attendancePercentage,
        totalTests,
        averageScore,
      },
      { new: true }
    );

    res.json({ message: "Student summary recomputed", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Store validated planner settings against the authenticated student.
exports.savePreferences = async (req, res) => {
  try {
    const preferences = require('../services/schedulePolicy').validatePreferences(req.body);
    if (!req.user.studentId) return res.status(404).json({ message: 'This account is not linked to a student profile. Contact your administrator.' });
    const student = await Student.findByIdAndUpdate(req.user.studentId, { $set: { preferences } }, { new:true, runValidators:true });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    res.json({ message:'Planner preferences saved', student });
  } catch (error) { res.status(400).json({ message:error.message }); }
};
exports.getPreferences = async (req, res) => {
  try {
    const student = await Student.findById(req.user.studentId);
    if (!student) return res.status(404).json({ message:'Student profile not found' });
    res.json({ preferences:student.preferences });
  } catch (error) { res.status(500).json({ message:'Unable to load preferences' }); }
};
