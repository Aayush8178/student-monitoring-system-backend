const { Attendance, Timetable } = require('../db');

/**
 * Single source of truth for all attendance calculations.
 * Ensures float math, correct rounding, and deterministic logic.
 */
class AttendanceService {
  /**
   * Compute accurate attendance for a specific subject
   * @param {string} studentId - The ID of the student
   * @param {string} subject - The subject name
   * @param {number} threshold - The target threshold (e.g., 0.75 for 75%)
   * @returns {Promise<object>} Computed statistics
   */
  static async computeSubjectAttendance(studentId, subject, threshold = 0.75) {
    // Normalize subject name to handle any casing issues though DB should match
    const records = await Attendance.find({ studentId });
    const targetSubjectLower = subject.trim().toLowerCase();
    
    // Filter records for the specific subject using normalized comparison
    const subjectRecords = records.filter(
      r => (r.subject || '').trim().toLowerCase() === targetSubjectLower
    );

    let present = 0;
    let absent = 0;

    subjectRecords.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
    });

    // Timetable parsed classes increase totalConductedClasses
    const totalConductedClasses = present + absent;
    let attendancePercentage = 100.0;

    if (totalConductedClasses > 0) {
      attendancePercentage = (present / totalConductedClasses) * 100;
    }

    // Required classes formula: ceil((threshold * totalConductedClasses - attendedClasses) / (1 - threshold))
    let requiredClassesToReachThreshold = 0;
    if (attendancePercentage < (threshold * 100)) {
      requiredClassesToReachThreshold = Math.ceil(
        ((threshold * totalConductedClasses) - present) / (1 - threshold)
      );
    }

    const result = {
      subject,
      totalConductedClasses,
      attendedClasses: present,
      absentClasses: absent,
      attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
      requiredClassesToReachThreshold
    };

    // Logging for debug tracking as requested by Task 1
    console.log(`[Attendance Debug] Subj: ${subject} | present: ${present} | total: ${totalConductedClasses} | %: ${result.attendancePercentage} | requiredToReach${threshold*100}%: ${requiredClassesToReachThreshold}`);

    return result;
  }

  /**
   * Compute attendance for all subjects relevant to the student
   */
  static async computeAllSubjectsAttendance(studentId, threshold = 0.75) {
    const timetable = await Timetable.findOne({ studentId });
    const attendanceRecords = await Attendance.find({ studentId });
    
    const subjectSet = new Set();

    // Include all subjects from timetable
    if (timetable && timetable.schedule) {
      timetable.schedule.forEach(s => {
        if (s.subject) subjectSet.add(s.subject.trim());
      });
    }

    // Include any subjects explicitly in attendance records
    attendanceRecords.forEach(r => {
      if (r.subject) subjectSet.add(r.subject.trim());
    });

    const results = {};
    for (const subj of subjectSet) {
      results[subj] = await this.computeSubjectAttendance(studentId, subj, threshold);
    }

    return results;
  }
}

module.exports = AttendanceService;
