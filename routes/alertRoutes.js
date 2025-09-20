const express = require("express");
const { addAlert, getAlerts } = require("../controllers/alertController");

const { authMiddleware } = require("../controllers/authController");

const router = express.Router();

// ✅ Admin can create alerts manually
router.post("/", authMiddleware(["admin"]), addAlert);

// ✅ Admin sees all alerts
// ✅ Student only sees their own alerts
router.get("/", authMiddleware(["admin", "student"]), async (req, res, next) => {
  if (req.user.role === "student") {
    req.query.studentId = req.user.studentId;
  }
  next();
}, getAlerts);

module.exports = router;
