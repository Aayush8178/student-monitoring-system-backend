const { Fee } = require("../db");

exports.addFee = async (req, res) => {
  try {
    const fee = await Fee.create(req.body);
    res.json({ message: "Fee record added", fee });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getFees = async (req, res) => {
  try {
    const fees = await Fee.find().populate("studentId");
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
