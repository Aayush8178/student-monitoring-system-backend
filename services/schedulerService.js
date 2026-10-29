const { Timetable, Student, Attendance } = require('../db');
const { generatePlan } = require('./semesterPlanner');
const { indiaDate } = require('./schedulePolicy');
class SchedulerService {
  static async generateRecommendations(studentId, threshold) {
    const [student, timetable, records] = await Promise.all([
      Student.findById(studentId), Timetable.findOne({studentId}), Attendance.find({studentId})
    ]);
    if (!student) throw new Error('Student profile not found');
    const plain = student.toObject ? student.toObject({ flattenMaps:true }) : student;
    const preferences = {...plain.preferences};
    if (threshold !== undefined) preferences.targetAttendance = threshold * 100;
    if (!timetable?.schedule?.length || !preferences.semesterStart || !preferences.semesterEnd || !preferences.availability) {
      return {status:'setup_required',setupRequired:true,recommendations:[],sessions:[],summary:'Upload and review your timetable, then save semester dates and weekday availability to generate a plan.'};
    }
    try {
      return generatePlan({schedule:timetable.schedule,records,preferences,today:indiaDate(new Date())});
    } catch (error) {
      return {status:'review_required',setupRequired:true,recommendations:[],sessions:[],summary:error.message};
    }
  }
}
module.exports = SchedulerService;
