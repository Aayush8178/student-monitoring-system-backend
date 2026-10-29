const SchedulerService = require('./services/schedulerService');

async function runTest() {
  const mockAttendanceBySubject = {
    'Math': { present: 52, absent: 48, total: 100, percentage: 52 },
    'Physics': { present: 63, absent: 37, total: 100, percentage: 63 },
    'English': { present: 78, absent: 22, total: 100, percentage: 78 }
  };

  const schedule = [
    { subject: 'Math', day: 'Monday', time: '10:00' },
    { subject: 'Math', day: 'Wednesday', time: '10:00' },
    { subject: 'Physics', day: 'Tuesday', time: '11:00' },
    { subject: 'English', day: 'Thursday', time: '09:00' }
  ];

  console.log("=== RUNNING TEST 1: SCHEDULER LOGIC ===");
  const atRisk = SchedulerService.identifyAtRiskSubjects(mockAttendanceBySubject, 75, schedule);
  console.log("At Risk Subjects Output:", JSON.stringify(atRisk, null, 2));

  console.log("\n=== RUNNING TEST 2: PRIORITY CLASSIFICATION ===");
  const mathPriority = SchedulerService.calculatePriority(52, 75);
  const physicsPriority = SchedulerService.calculatePriority(63, 75);
  const englishPriority = SchedulerService.calculatePriority(78, 75);
  
  console.log(`Math (52%): ${mathPriority} (Expected: CRITICAL)`);
  console.log(`Physics (63%): ${physicsPriority} (Expected: REQUIRED)`);
  console.log(`English (78%): ${englishPriority} (Expected: SAFE)`);
}

runTest();
