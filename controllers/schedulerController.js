const SchedulerService = require('../services/schedulerService');
const { Student } = require('../db');

async function getPlan(studentId, requestedTarget) {
  if (!studentId) return {error:'This account is not linked to a student profile.',status:404};
  const student = await Student.findById(studentId);
  if (!student) return {error:'Student profile not found',status:404};
  const target = Number(requestedTarget ?? student.preferences?.targetAttendance ?? 75);
  if (!Number.isFinite(target) || target <= 0 || target > 100) return {error:'Attendance target must be greater than 0 and at most 100',status:400};
  const plan = await SchedulerService.generateRecommendations(studentId,target/100);
  return {student,plan,target};
}
async function respond(studentId, target, res, countsOnly=false) {
  try {
    const result = await getPlan(studentId,target);
    if (result.error) return res.status(result.status).json({message:result.error});
    const {student,plan} = result;
    res.json({
      studentId,studentName:student.name,currentAttendance:student.attendancePercentage,
      currentlyAttended:student.attendedClasses,totalClasses:student.totalClasses,
      ...plan,
      ...(countsOnly ? {targetThreshold:result.target,classesNeededToReachTarget:(plan.recommendations||[]).reduce((sum,subject)=>sum+subject.requiredSessions,0)} : {}),
    });
  } catch (error) { res.status(500).json({message:error.message || 'Could not generate your attendance plan'}); }
}
const getRecommendations = (req,res) => respond(req.params.studentId,req.query.threshold,res);
const getMyRecommendations = (req,res) => respond(req.user.studentId,req.query.threshold,res);
const getClassesNeeded = (req,res) => respond(req.params.studentId,req.query.targetThreshold,res,true);
module.exports = {getRecommendations,getMyRecommendations,getClassesNeeded};
