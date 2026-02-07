const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../controllers/authController");
const {
  getOverviewStats,
  getAttendanceDistribution,
  getPerformanceDistribution,
} = require("../controllers/analyticsController");

router.get("/overview", authMiddleware(["admin"]), getOverviewStats);
router.get("/attendance-distribution", authMiddleware(["admin"]), getAttendanceDistribution);
router.get("/performance-distribution", authMiddleware(["admin"]), getPerformanceDistribution);

module.exports = router;
