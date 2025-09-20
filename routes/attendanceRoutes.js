// const express = require("express");
// const {
//   addAttendance,
//   getAttendance,
// } = require("../controllers/attendanceController");

// const { authMiddleware } = require("../controllers/authController");

// const router = express.Router();

// // ✅ Admin can add attendance
// router.post("/", authMiddleware(["admin"]), addAttendance);

// // ✅ Admin sees all attendance
// // ✅ Student sees only their own
// router.get("/", authMiddleware(["admin", "student"]), async (req, res, next) => {
//   if (req.user.role === "student") {
//     req.query.studentId = req.user.studentId; // filter by own ID
//   }
//   next();
// }, getAttendance);

// module.exports = router;


const express = require("express");
const multer = require("multer");
const { uploadAttendanceExcel, getAttendanceSummary } = require("../controllers/attendanceController");
const { authMiddleware } = require("../controllers/authController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ Admin uploads attendance Excel
router.post("/upload", authMiddleware(["admin"]), upload.single("file"), uploadAttendanceExcel);

// ✅ Admin views attendance summary
router.get("/summary", authMiddleware(["admin"]), getAttendanceSummary);

module.exports = router;
