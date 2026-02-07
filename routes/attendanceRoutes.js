const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const {
  uploadAttendance,
  getStudentAttendance
} = require("../controllers/attendanceController");

const { authMiddleware } = require("../controllers/authController");

// upload (admin)
router.post(
  "/upload",
  authMiddleware(["admin"]),
  upload.single("file"),
  uploadAttendance
);

//get logged-in student attendance history
router.get(
  "/my",
  authMiddleware(["student"]),
  getStudentAttendance
);

module.exports = router;
