const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../controllers/authController');

const {
  getRecommendations,
  getMyRecommendations,
  getClassesNeeded
} = require('../controllers/schedulerController');

/**
 * Get personalized attendance recommendations for a student
 * GET /api/scheduler/recommendations/:studentId
 * Admin only
 */
router.get(
  '/recommendations/:studentId',
  authMiddleware(['admin']),
  getRecommendations
);

/**
 * Get my (student) recommendations
 * GET /api/scheduler/my-recommendations
 * Student only
 */
router.get(
  '/my-recommendations',
  authMiddleware(['student']),
  getMyRecommendations
);

/**
 * Calculate classes needed to reach target attendance
 * GET /api/scheduler/classes-needed/:studentId
 * Admin only
 */
router.get(
  '/classes-needed/:studentId',
  authMiddleware(['admin']),
  getClassesNeeded
);

module.exports = router;
