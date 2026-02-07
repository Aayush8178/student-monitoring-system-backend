const { Student } = require("../db");

// overview 
exports.getOverviewStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const lowAttendance = await Student.countDocuments({ attendancePercentage: { $lt: 60 } });
    const lowPerformance = await Student.countDocuments({ averageScore: { $lt: 40 } });

    res.json({
      totalStudents,
      lowAttendance,
      lowPerformance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// attendance distribution
exports.getAttendanceDistribution = async (req, res) => {
  try {
    const safe = await Student.countDocuments({ attendancePercentage: { $gte: 60 } });
    const atRisk = await Student.countDocuments({ attendancePercentage: { $lt: 60 } });

    res.json([
      { name: "Safe Students", value: safe },
      { name: "At Risk", value: atRisk },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// performance distribution
exports.getPerformanceDistribution = async (req, res) => {
  try {
    const good = await Student.countDocuments({ averageScore: { $gte: 40 } });
    const low = await Student.countDocuments({ averageScore: { $lt: 40 } });

    res.json([
      { name: "Good Performance", value: good },
      { name: "Low Performance", value: low },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
