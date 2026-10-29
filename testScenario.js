const { Attendance, Timetable, Student, Alert } = require('./db');
const PredictionService = require('./services/predictionService');
const SchedulerService = require('./services/schedulerService');

// Mock data
const mockStudentId = '507f1f77bcf86cd799439011';

// We want exactly:
// Math: 52% (e.g. 52 present out of 100)
// Physics: 63% (e.g. 63 present out of 100)
// English: 78% (e.g. 78 present out of 100)

const mockAttendanceRecords = [];
function addRecords(subject, present, total) {
  for (let i = 0; i < present; i++) mockAttendanceRecords.push({ subject, status: 'present' });
  for (let i = 0; i < (total - present); i++) mockAttendanceRecords.push({ subject, status: 'absent' });
}
addRecords('Math', 52, 100);
addRecords('Physics', 63, 100);
addRecords('English', 78, 100);

const mockTimetable = {
  studentId: mockStudentId,
  schedule: [
    { subject: 'Math', day: 'Monday', time: '10:00' },
    { subject: 'Physics', day: 'Tuesday', time: '11:00' },
    { subject: 'English', day: 'Wednesday', time: '12:00' }
  ]
};

async function runTests() {
  // Mocks
  const _attendanceFind = Attendance.find;
  const _timetableFindOne = Timetable.findOne;
  const _studentFindById = Student.findById;
  const _studentUpdate = Student.findByIdAndUpdate;
  const _alertFindOne = Alert.findOne;
  const _alertCreate = Alert.create;

  Attendance.find = async () => mockAttendanceRecords;
  Timetable.findOne = async () => mockTimetable;
  Student.findById = async () => ({ _id: mockStudentId, name: 'Test Student' });
  Student.findByIdAndUpdate = async () => ({});
  Alert.findOne = async () => null;
  Alert.create = async () => ({});

  try {
    console.log("==========================================");
    console.log("STEP 6: VALIDATION & TESTING");
    console.log("Expected input: Math -> 52%, Physics -> 63%, English -> 78%");
    console.log("==========================================\n");

    const riskOutput = await PredictionService.predictStudentRisk(mockStudentId);
    
    console.log("--- RISK VERIFICATION ---");
    console.log(`Overall Risk: ${riskOutput.riskLevel} (Expected: HIGH_RISK)`);
    console.log(`Math Risk Status: ${riskOutput.riskFactors['Math'].riskStatus} (Expected: HIGH_RISK)`);
    console.log(`Physics Risk Status: ${riskOutput.riskFactors['Physics'].riskStatus} (Expected: MEDIUM_RISK)`);
    console.log(`English Risk Status: ${riskOutput.riskFactors['English'].riskStatus} (Expected: SAFE)`);
    console.log("Insights generated:");
    riskOutput.insights.forEach(i => console.log(` - [${i.severity}] ${i.message}`));
    
    console.log("\n--- SCHEDULER VERIFICATION ---");
    const scheduleOutput = await SchedulerService.generateRecommendations(mockStudentId, 0.75);
    console.log(`Scheduler Priority Level: ${scheduleOutput.priorityLevel} (Expected: CRITICAL)`);
    
    console.log("\nRecommendations Generated:");
    scheduleOutput.recommendations.forEach(r => {
      console.log(` -> Subject: ${r.subject}`);
      console.log(`    Current Attendance: ${r.currentAttendance}%`);
      console.log(`    Requires ${r.requiredSessions} more sessions to reach 75%`);
      console.log(`    Priority: ${r.priority}`);
      console.log(`    Mapped ${r.recommendedDates.length} upcoming date(s) from Timetable.\n`);
    });

  } catch (err) {
    console.error("Test Failed:", err);
  } finally {
    // Restore
    Attendance.find = _attendanceFind;
    Timetable.findOne = _timetableFindOne;
    Student.findById = _studentFindById;
    Student.findByIdAndUpdate = _studentUpdate;
    Alert.findOne = _alertFindOne;
    Alert.create = _alertCreate;
  }
}

runTests();
