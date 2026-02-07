const express = require("express");
const router = express.Router();

const {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getMyProfile,
  recomputeStudentSummary,
} = require("../controllers/StudentController");

const { authMiddleware } = require("../controllers/authController");

// admin routes
router.post("/", authMiddleware(["admin"]), addStudent);
router.get("/", authMiddleware(["admin"]), getStudents);

// student profile
router.get("/me", authMiddleware(["student"]), getMyProfile);

// admin / student access by ID
router.get("/:id", authMiddleware(["admin", "student"]), getStudent);
router.put("/:id", authMiddleware(["admin"]), updateStudent);
router.delete("/:id", authMiddleware(["admin"]), deleteStudent);

//One-time recompute route
router.post(
  "/recompute/:id",
  authMiddleware(["admin"]),
  recomputeStudentSummary
);

module.exports = router;
