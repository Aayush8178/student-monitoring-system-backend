// Deferred regression checks. Do not run until application verification is authorized.
const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePlan } = require('./services/semesterPlanner');
const { validateSchedule, validatePreferences, indiaDate } = require('./services/schedulePolicy');
const TimetableParser = require('./services/timetableParser');
const { Student } = require('./db');
const SchedulerService = require('./services/schedulerService');
const schedulerController = require('./controllers/schedulerController');
const weekdays = ['Mon','Tue','Wed','Thu','Fri'];
const settings = overrides => ({targetAttendance:75,maxClassesPerDay:4,semesterStart:'2026-09-28',semesterEnd:'2026-10-02',availability:Object.fromEntries(weekdays.map(day=>[day,{enabled:true,start:'09:00',end:'18:00'}])),...overrides});
const classes = [
  {subject:'Math',day:'Monday',time:'09:00',duration:60},
  {subject:'Math',day:'Wednesday',time:'09:00',duration:60},
  {subject:'Math',day:'Friday',time:'09:00',duration:60},
];
const plan = (preferences, schedule=classes, records=[]) => generatePlan({schedule,records,preferences,today:'2026-09-27'});
test('all remaining classes count even when only Monday is available',()=>{
  const preferences=settings();for(const day of weekdays) preferences.availability[day].enabled=day==='Mon';
  const result=plan(preferences);
  assert.equal(result.recommendations[0].remainingClasses,2);
  assert.equal(result.recommendations[0].requiredSessions,2);
  assert.equal(result.sessions.length,1);
  assert.equal(result.shortage,1);
  assert.equal(result.feasible,false);
});
test('fixed holiday and semester end are excluded/included correctly',()=>{
  const result=plan(settings());
  assert.equal(result.sessions.length,2);
  assert.ok(result.holidays.includes('2026-10-02'));
  assert.ok(result.sessions.every(session=>session.date<='2026-10-02'&&session.day!=='Friday'));
  const lastDay=plan(settings({semesterEnd:'2026-09-28'}));
  assert.equal(lastDay.sessions[0].date,'2026-09-28');
});
test('daily capacity is shared between subjects',()=>{
  const timetable=[classes[0],{subject:'Physics',day:'Monday',time:'10:00',duration:60}];
  const prefs=settings({targetAttendance:100,semesterEnd:'2026-09-28',maxClassesPerDay:1});
  assert.equal(plan(prefs,timetable).shortage,1);
  assert.equal(plan({...prefs,maxClassesPerDay:2},timetable).feasible,true);
});
test('a full class must fit the daily window',()=>{
  const prefs=settings();prefs.availability.Mon.end='09:30';
  const result=plan(prefs);
  assert.ok(result.sessions.every(session=>session.day!=='Monday'));
  assert.equal(result.shortage,1);
});
test('100 percent with a recorded absence is finite and explicitly impossible',()=>{
  const result=generatePlan({schedule:classes,records:[{subject:'Math',date:'2026-09-25',status:'absent'}],preferences:settings({targetAttendance:100,semesterStart:'2026-09-01'}),today:'2026-09-27'});
  assert.equal(result.shortage,1);
  assert.match(result.recommendations[0].reason,/Not enough classes/);
  assert.equal(result.projectedAttendance,66.67);
});
test('classes already above the target still get future maintenance sessions',()=>{
  const records=Array.from({length:3},(_,i)=>({subject:'Math',date:'2026-09-'+(23+i),status:'present'}));
  const result=generatePlan({schedule:classes,records,preferences:settings({semesterStart:'2026-09-01'}),today:'2026-09-27'});
  assert.equal(result.recommendations[0].currentAttendance,100);
  assert.equal(result.recommendations[0].requiredSessions,1);
});
test('college hours, lunch and overlapping classes are validated',()=>{
  assert.throws(()=>validateSchedule([{...classes[0],time:'12:30'}]),/lunch/);
  assert.throws(()=>validateSchedule([{...classes[0],time:'17:30'}]),/18:00/);
  assert.throws(()=>validateSchedule([classes[0],{...classes[0],time:'09:30'}]),/Overlapping/);
  assert.throws(()=>validatePreferences(settings({semesterEnd:'2026-08-01'})),/dates/);
  assert.equal(indiaDate('2026-09-27T20:00:00Z'),'2026-09-28');
});
test('spreadsheet parser preserves subjects and supports numeric Excel times',()=>{
  const result=TimetableParser.extractRows([['Day','Subject','Time','Duration'],['Mon','Data Structures',0.375,60]]);
  assert.deepEqual(result,[{day:'Monday',subject:'Data Structures',time:'09:00',duration:60}]);
  const grid=TimetableParser.extractRows([['Day','09:00-10:00','13:30-14:30'],['Tuesday','Calculus','Physics']]);
  assert.equal(grid[1].time,'13:30');
});
test('own recommendations use the authenticated student and saved target',async t=>{
  let seen;
  t.mock.method(Student,'findById',async id=>{assert.equal(id,'student-1');return {preferences:{targetAttendance:80}};});
  t.mock.method(SchedulerService,'generateRecommendations',async(id,target)=>{seen={id,target};return {recommendations:[]};});
  await schedulerController.getMyRecommendations({user:{studentId:'student-1'},query:{}},{json:()=>{},status:()=>{throw new Error('Unexpected rejection');}});
  assert.deepEqual(seen,{id:'student-1',target:0.8});
});
