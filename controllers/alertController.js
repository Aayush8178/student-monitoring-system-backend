const { Alert } = require("../db");

exports.addAlert = async (req, res) => {
  try {
    const alert = await Alert.create(req.body);
    res.json({ message: "Alert created", alert });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().populate("studentId");
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
