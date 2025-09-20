const express = require("express");
const multer = require("multer");
const { uploadAssessmentExcel, getAssessmentSummary } = require("../controllers/assessmentController");
const { authMiddleware } = require("../controllers/authController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ Admin uploads assessments Excel
router.post("/upload", authMiddleware(["admin"]), upload.single("file"), uploadAssessmentExcel);

// ✅ Admin gets all summaries
router.get("/summary", authMiddleware(["admin"]), getAssessmentSummary);

// ✅ Student gets only their own summary
router.get("/summary/me", authMiddleware(["student"]), async (req, res) => {
  const { Student } = require("../db");
  const student = await Student.findById(req.user.studentId).select("name totalTests averageScore");
  res.json(student);
});

module.exports = router;
