const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../controllers/authController");
const {
  getAlerts,
  updateAlertStatus
} = require("../controllers/alertController");

// view all alerts (admin only)
router.get("/", authMiddleware(["admin"]), getAlerts);

// update alert status (admin only )
router.put("/:id/status", authMiddleware(["admin"]), updateAlertStatus);

module.exports = router;
