const transporter = require('./email');
const { Attendance } = require('../db');
const PredictionService = require('../services/predictionService');

/**
 * Enhanced Email Service
 * Provides template functions for sending rich emails with student data
 */
class EmailService {
  /**
   * Send low attendance alert email with detailed information
   */
  static async sendLowAttendanceAlert(student, threshold = 60) {
    try {
      if (!student.guardian) {
        console.log(`No guardian email for student ${student.name}`);
        return;
      }

      // Get subject-wise attendance
      const attendanceRecords = await Attendance.find({ studentId: student._id });
      const subjectAttendance = this.calculateSubjectAttendance(attendanceRecords);
      const atRiskSubjects = this.getAtRiskSubjects(subjectAttendance, threshold);

      // Get risk prediction
      let riskData = null;
      try {
        riskData = await PredictionService.predictStudentRisk(student._id);
      } catch (err) {
        console.warn(`Could not calculate risk for student ${student.name}:`, err.message);
      }

      const riskLevel = riskData?.riskLevel || 'MEDIUM';
      const riskColor = this.getRiskColor(riskLevel);

      // Build subject attendance HTML
      let subjectsHtml = '';
      Object.entries(subjectAttendance).forEach(([subject, data]) => {
        const percentage = Math.round((data.present / data.total) * 100);
        const isAtRisk = percentage < threshold;
        const statusColor = isAtRisk ? '#f87171' : '#4ade80';
        const indicator = isAtRisk ? '⚠️' : '✓';

        subjectsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${subject}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
              <strong style="color: ${statusColor};">${percentage}%</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
              ${data.present}/${data.total}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
              ${indicator}
            </td>
          </tr>
        `;
      });

      // Build recommendations HTML
      let recommendationsHtml = '';
      if (atRiskSubjects.length > 0) {
        recommendationsHtml += `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #92400e; margin-top: 0;">📋 Recommended Focus Areas</h4>
            <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
        `;

        atRiskSubjects.forEach(subject => {
          const data = subjectAttendance[subject];
          const needed = this.calculateClassesNeeded(data.present, data.total, threshold);
          recommendationsHtml += `
            <li>${subject}: Attend <strong>${needed} more classes</strong> to reach ${threshold}%</li>
          `;
        });

        recommendationsHtml += `
            </ul>
          </div>
        `;
      }

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📊 Academic Performance Alert</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Student Monitoring System</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px 20px;">
              <p style="margin: 0 0 20px 0;">Dear Parent/Guardian,</p>

              <p style="margin: 0 0 20px 0;">
                We hope this message finds you well. We are writing to bring important academic indicators of 
                <strong>${student.name}</strong> to your attention.
              </p>

              <!-- Risk Level Badge -->
              <div style="text-align: center; margin: 20px 0;">
                <span style="display: inline-block; background: ${riskColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                  ${riskLevel === 'CRITICAL' ? '🔴' : riskLevel === 'HIGH' ? '🟠' : '🟡'} Risk Level: ${riskLevel}
                </span>
              </div>

              <!-- Key Metrics -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Overall Attendance</div>
                  <div style="font-size: 28px; font-weight: bold; color: #1f2937;">${student.attendancePercentage}%</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${student.attendedClasses}/${student.totalClasses} classes</div>
                </div>

                <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #8b5cf6;">
                  <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px;">Academic Performance</div>
                  <div style="font-size: 28px; font-weight: bold; color: #1f2937;">${student.averageScore || 0}%</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${student.totalTests} assessments completed</div>
                </div>
              </div>

              <!-- Subject-wise Attendance -->
              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">Subject-wise Attendance:</h3>
                <table style="width: 100%; border-collapse: collapse; background: #f9fafb;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151;">Subject</th>
                      <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: #374151;">Percentage</th>
                      <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: #374151;">Classes</th>
                      <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: #374151;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subjectsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Recommendations -->
              ${recommendationsHtml}

              <!-- Action Items -->
              <div style="background: #dbeafe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h4 style="color: #0c4a6e; margin-top: 0;">✅ What You Can Do:</h4>
                <ul style="color: #0c4a6e; margin: 10px 0; padding-left: 20px;">
                  <li>Monitor your child's attendance regularly</li>
                  <li>Encourage consistent study habits</li>
                  <li>Schedule a meeting with teachers if needed</li>
                  <li>Track progress through the parent portal</li>
                </ul>
              </div>

              <!-- Call to Action -->
              <p style="margin: 20px 0; text-align: center;">
                <a href="${process.env.PARENT_PORTAL_URL || '#'}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Detailed Report
                </a>
              </p>

              <!-- Contact -->
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                If you have any questions or concerns, please contact our academic team at 
                <a href="mailto:${process.env.EMAIL_USER}" style="color: #667eea; text-decoration: none;">
                  ${process.env.EMAIL_USER}
                </a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
              <p style="margin: 0;">
                This is an automated message from the Student Monitoring System.<br/>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Student Monitoring System" <${process.env.EMAIL_USER}>`,
        to: student.guardian,
        subject: `Alert: ${student.name}'s Attendance Needs Attention`,
        html: html
      });

      return { sent: true, recipient: student.guardian };
    } catch (err) {
      console.error('Error sending low attendance alert:', err);
      throw err;
    }
  }

  /**
   * Calculate subject-wise attendance
   */
  static calculateSubjectAttendance(attendanceRecords) {
    const subjectData = {};

    for (const record of attendanceRecords) {
      if (!subjectData[record.subject]) {
        subjectData[record.subject] = { present: 0, absent: 0, total: 0 };
      }

      subjectData[record.subject].total++;
      if (record.status === 'present') {
        subjectData[record.subject].present++;
      } else {
        subjectData[record.subject].absent++;
      }
    }

    return subjectData;
  }

  /**
   * Get subjects below threshold
   */
  static getAtRiskSubjects(subjectAttendance, threshold) {
    const atRisk = [];

    for (const [subject, data] of Object.entries(subjectAttendance)) {
      const percentage = Math.round((data.present / data.total) * 100);
      if (percentage < threshold) {
        atRisk.push(subject);
      }
    }

    return atRisk;
  }

  /**
   * Calculate classes needed to reach threshold
   */
  static calculateClassesNeeded(present, total, threshold) {
    const currentPercentage = (present / total) * 100;
    if (currentPercentage >= threshold) return 0;

    // Simple approximation: classes needed if continuing to attend all
    let needed = 0;
    while (((present + needed + 1) / (total + needed + 1)) * 100 < threshold) {
      needed++;
      if (needed > 100) break; // Safety limit
    }
    return needed + 1;
  }

  /**
   * Get risk color for badge
   */
  static getRiskColor(riskLevel) {
    const colors = {
      CRITICAL: '#dc2626',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#22c55e'
    };
    return colors[riskLevel] || '#6b7280';
  }
}

module.exports = EmailService;
