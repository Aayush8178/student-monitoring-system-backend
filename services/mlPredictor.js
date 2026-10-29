/**
 * A basic heuristic ML classification model to predict student churn/performance risk.
 * In a real-world scenario, this can be swapped with a scikit-learn model spawned via child_process
 * or a TensorFlow.js model.
 * 
 * Features:
 * - Attendance %
 * - Internal marks (Average Score)
 * - Assignment completion rate (if available, we use engagement score)
 * - Previous results (if available)
 * - Engagement score (mocked if not present)
 */

const calculateRisk = (studentStats) => {
  const {
    attendancePercentage = 100,
    averageScore = 0,
    engagementScore = 50, // default mid engagement
    assignmentCompletionRate = 50 // default
  } = studentStats;

  // Let's create a weighted risk score (0 to 100, higher is riskier)
  // Attendance is heavily weighted for "Risk" of churning/failing
  const attendanceFactor = (100 - attendancePercentage) * 0.4; // max 40
  const scoreFactor = (100 - averageScore) * 0.3; // max 30
  const engagementFactor = (100 - engagementScore) * 0.15; // max 15
  const assignmentFactor = (100 - assignmentCompletionRate) * 0.15; // max 15

  const totalRiskScore = attendanceFactor + scoreFactor + engagementFactor + assignmentFactor;

  let riskLabel = "LOW RISK";
  if (totalRiskScore > 50) {
    riskLabel = "HIGH RISK";
  } else if (totalRiskScore > 30) {
    riskLabel = "MEDIUM RISK";
  }

  return {
    riskScore: totalRiskScore.toFixed(2),
    riskLabel
  };
};

module.exports = { calculateRisk };
