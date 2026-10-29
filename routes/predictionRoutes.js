const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../controllers/authController');

const {
  predictStudentRisk,
  getMyRiskPrediction,
  getAllRiskPredictions,
  getPredictionsByLevel
} = require('../controllers/predictionController');

/**
 * Predict risk for a specific student
 * POST /api/prediction/predict/:studentId
 * Admin only
 */
router.post(
  '/predict/:studentId',
  authMiddleware(['admin']),
  predictStudentRisk
);

/**
 * Get my (student) risk prediction
 * GET /api/prediction/my-risk
 * Student only
 */
router.get(
  '/my-risk',
  authMiddleware(['student']),
  getMyRiskPrediction
);

/**
 * Get all students' risk predictions
 * GET /api/prediction/all-risks
 * Admin only
 */
router.get(
  '/all-risks',
  authMiddleware(['admin']),
  getAllRiskPredictions
);

/**
 * Get risk predictions filtered by level
 * GET /api/prediction/by-level/:level
 * Admin only
 */
router.get(
  '/by-level/:level',
  authMiddleware(['admin']),
  getPredictionsByLevel
);

module.exports = router;
