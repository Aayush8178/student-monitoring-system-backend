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
  savePreferences,
  getPreferences,
} = require("../controllers/StudentController");

const { authMiddleware } = require("../controllers/authController");

// admin routes
router.post("/", authMiddleware(["admin"]), addStudent);
router.get("/", authMiddleware(["admin"]), getStudents);

// student profile
router.get("/me", authMiddleware(["student"]), getMyProfile);

router.get("/preferences", authMiddleware(["student"]), getPreferences);

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

// Student preferences
router.post("/preferences", authMiddleware(["student"]), savePreferences);


module.exports = router;
