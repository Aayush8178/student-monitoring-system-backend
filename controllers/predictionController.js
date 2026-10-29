const PredictionService = require('../services/predictionService');
const { Student } = require('../db');

/**
 * Prediction Controller
 * Handles churn/risk prediction endpoints
 */

/**
 * Predict risk for a specific student
 * POST /api/prediction/predict/:studentId
 */
const predictStudentRisk = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const prediction = await PredictionService.predictStudentRisk(studentId);

    // Store prediction in student profile (optional)
    // Can be stored in a separate Prediction model if needed for history

    res.json(prediction);
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get student's own risk prediction
 * GET /api/prediction/my-risk
 */
const getMyRiskPrediction = async (req, res) => {
  try {
    const studentId = req.user.studentId; // From auth middleware

    const prediction = await PredictionService.predictStudentRisk(studentId);

    res.json(prediction);
  } catch (err) {
    console.error('My risk prediction error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get risk predictions for all students
 * GET /api/prediction/all-risks
 */
const getAllRiskPredictions = async (req, res) => {
  try {
    const students = await Student.find().select('_id name email');

    const predictions = await Promise.all(
      students.map(student =>
        PredictionService.predictStudentRisk(student._id)
          .catch(err => ({
            studentId: student._id,
            studentName: student.name,
            error: err.message
          }))
      )
    );

    // Sort by risk score descending
    const sorted = predictions.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

    res.json({
      totalStudents: students.length,
      criticalRisks: sorted.filter(p => p.riskLevel === 'CRITICAL').length,
      highRisks: sorted.filter(p => p.riskLevel === 'HIGH').length,
      predictions: sorted
    });
  } catch (err) {
    console.error('Get all predictions error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get risk predictions by threshold
 * GET /api/prediction/by-level/:level
 */
const getPredictionsByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const validLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    if (!validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({
        message: `Invalid level. Use one of: ${validLevels.join(', ')}`
      });
    }

    const students = await Student.find().select('_id name email');

    const predictions = await Promise.all(
      students.map(student =>
        PredictionService.predictStudentRisk(student._id)
          .catch(err => ({
            studentId: student._id,
            studentName: student.name,
            error: err.message
          }))
      )
    );

    const filtered = predictions.filter(p => p.riskLevel === level.toUpperCase());

    res.json({
      level: level.toUpperCase(),
      count: filtered.length,
      students: filtered
    });
  } catch (err) {
    console.error('Get predictions by level error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  predictStudentRisk,
  getMyRiskPrediction,
  getAllRiskPredictions,
  getPredictionsByLevel
};
