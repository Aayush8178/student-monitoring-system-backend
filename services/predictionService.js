const { Student, Alert } = require('../db');
const AttendanceService = require('./attendanceService');
const EmailService = require('../utils/emailService');

/**
 * Prediction Service (REBUILT)
 * Deterministic rule-based risk classification based strictly on attendance % per subject.
 */
class PredictionService {
  /**
   * Predict student dropout risk
   */
  static async predictStudentRisk(studentId) {
    try {
      const student = await Student.findById(studentId);
      if (!student) throw new Error('Student not found');

      // 1. Fetch Subject-wise attendance dynamically (No Caching)
      const subjectsAttendance = await AttendanceService.computeAllSubjectsAttendance(studentId, 0.75);
      
      let overallRiskLevel = 'SAFE';
      const riskFactors = {};
      const insights = [];

      // 2. Compute risk rules SUBJECT-WISE
      for (const [subject, data] of Object.entries(subjectsAttendance)) {
        let subjectRisk = 'SAFE';
        
        if (data.attendancePercentage < 60) {
          subjectRisk = 'HIGH_RISK';
          overallRiskLevel = 'HIGH_RISK'; // Worst subject dictates overall
          insights.push({
             type: 'ATTENDANCE',
             severity: 'CRITICAL',
             message: `Immediate action needed: ${subject} attendance is critically low (${data.attendancePercentage}%).`,
             action: 'Schedule meeting with student and parents'
          });
        } else if (data.attendancePercentage < 75) {
          subjectRisk = 'MEDIUM_RISK';
          if (overallRiskLevel === 'SAFE') overallRiskLevel = 'MEDIUM_RISK';
          insights.push({
             type: 'ATTENDANCE',
             severity: 'MEDIUM',
             message: `${subject} attendance is dropping (${data.attendancePercentage}%).`,
             action: 'Monitor attendance closely'
          });
        }
        
        riskFactors[subject] = {
           ...data,
           riskStatus: subjectRisk
        };
      }
      
      if (Object.keys(subjectsAttendance).length === 0) {
        overallRiskLevel = 'SAFE';
        insights.push({ type: 'GENERAL', severity: 'LOW', message: 'No attendance records found.', action: 'None' });
      } else if (overallRiskLevel === 'SAFE') {
        insights.push({ type: 'GENERAL', severity: 'LOW', message: 'All subjects are above minimum attendance threshold.', action: 'Continue tracking' });
      }

      // Update student record with new overall risk dynamically
      await Student.findByIdAndUpdate(studentId, { riskStatus: overallRiskLevel });

      // Trigger Email Alert immediately if HIGH_RISK is detected
      if (overallRiskLevel === 'HIGH_RISK') {
        await this.triggerEmailAlertIfNeeded(student, overallRiskLevel);
      }

      return {
        studentId,
        studentName: student.name,
        riskLevel: overallRiskLevel,
        riskFactors,
        insights,
        predictedAt: new Date()
      };
    } catch (err) {
      console.error('Prediction error:', err);
      throw err;
    }
  }

  static async triggerEmailAlertIfNeeded(student, riskLevel) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentAlert = await Alert.findOne({
        studentId: student._id,
        createdAt: { $gte: sevenDaysAgo },
        status: 'sent'
      });

      if (!recentAlert) {
         // Send enhanced email alert
         if (EmailService && EmailService.sendLowAttendanceAlert) {
           await EmailService.sendLowAttendanceAlert(student, 75).catch(err => {
             console.error('Failed to send automated alert email:', err);
           });
         }

         await Alert.create({
           studentId: student._id,
           reason: `Automated Risk Alert: ${riskLevel}`,
           status: 'sent'
         });
      }
    } catch (error) {
      console.error('Could not check/trigger email alert:', error);
    }
  }
}

module.exports = PredictionService;
