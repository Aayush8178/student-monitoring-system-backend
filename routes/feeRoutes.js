const express = require("express");
const { addFee, getFees } = require("../controllers/feeController");

const { authMiddleware } = require("../controllers/authController");

const router = express.Router();

// admin can add fee records
router.post("/", authMiddleware(["admin"]), addFee);

// admin sees all student sees their own
router.get("/", authMiddleware(["admin", "student"]), async (req, res, next) => {
  if (req.user.role === "student") {
    req.query.studentId = req.user.studentId;
  }
  next();
}, getFees);

module.exports = router;
