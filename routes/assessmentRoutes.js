const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const {
  uploadAssessment,
  getStudentAssessments,
  getAssessmentTrend
} = require("../controllers/assessmentController");

const { authMiddleware } = require("../controllers/authController");

// upload (admin)
router.post(
  "/upload",
  authMiddleware(["admin"]),
  upload.single("file"),
  uploadAssessment
);

// get logged-in student assessments
router.get(
  "/my",
  authMiddleware(["student"]),
  getStudentAssessments
);

// student performance trend(safe & unsafe)
router.get(
  "/trend/my",
  authMiddleware(["student"]),
  getAssessmentTrend
);

module.exports = router;
