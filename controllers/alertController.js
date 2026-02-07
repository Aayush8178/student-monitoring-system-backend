const { Alert, Student } = require("../db");

// Get all alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate("studentId", "name guardian attendancePercentage averageScore")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
};

// Update alert status
exports.updateAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({ message: "Alert status updated", alert });
  } catch (err) {
    res.status(500).json({ message: "Failed to update alert status" });
  }
};
