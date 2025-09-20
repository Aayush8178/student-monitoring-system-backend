const express = require("express");
const {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

const { authMiddleware } = require("../controllers/authController");

const router = express.Router();

// ✅ Admin only
router.post("/", authMiddleware(["admin"]), addStudent);
router.get("/", authMiddleware(["admin"]), getStudents);

// ✅ Student fetches their own profile
router.get("/me", authMiddleware(["student"]), (req, res) => {
  res.json({ studentId: req.user.studentId });
});

// ✅ Admin or student (if matches ID)
router.get("/:id", authMiddleware(["admin", "student"]), getStudent);

router.put("/:id", authMiddleware(["admin"]), updateStudent);
router.delete("/:id", authMiddleware(["admin"]), deleteStudent);

module.exports = router;
