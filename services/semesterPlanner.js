const { DAYS, minutes, dateAfter, dateValid, validateSchedule, validatePreferences } = require('./schedulePolicy');
const collegeCalendar = require('../config/collegeHolidays.json');
const keyFor = subject => subject.trim().toLowerCase().replace(/\s+/g, ' ');
const round = number => Math.round(number * 100) / 100;

// Integral max flow assigns the minimum required sessions by subject while
// respecting a shared daily limit. Schedule validation excludes time conflicts.
function allocate(subjects, dailyLimit) {
  const graph = [];
  const node = () => { graph.push([]); return graph.length - 1; };
  const source = node(), sink = node(), dates = new Map(), links = [];
  const edge = (from, to, capacity) => {
    const forward = { to, reverse:graph[to].length, capacity, original:capacity };
    const backward = { to:from, reverse:graph[from].length, capacity:0, original:0 };
    graph[from].push(forward); graph[to].push(backward);
    return forward;
  };
  for (const subject of subjects) {
    const subjectNode = node();
    edge(source, subjectNode, subject.requiredSessions);
    const groups = new Map();
    for (const session of subject.eligible) {
      if (!groups.has(session.date)) groups.set(session.date, []);
      groups.get(session.date).push(session);
    }
    for (const [date, sessions] of groups) {
      if (!dates.has(date)) { const dayNode = node(); dates.set(date, dayNode); edge(dayNode, sink, dailyLimit); }
      links.push({ subject, sessions, edge:edge(subjectNode, dates.get(date), sessions.length) });
    }
  }
  while (true) {
    const parents = Array(graph.length).fill(null), queue = [source];
    parents[source] = [-1, -1];
    for (let cursor = 0; cursor < queue.length && !parents[sink]; cursor++) {
      const from = queue[cursor];
      graph[from].forEach((e, index) => { if (e.capacity > 0 && !parents[e.to]) { parents[e.to] = [from, index]; queue.push(e.to); } });
    }
    if (!parents[sink]) break;
    let amount = Infinity;
    for (let at = sink; at !== source; at = parents[at][0]) amount = Math.min(amount, graph[parents[at][0]][parents[at][1]].capacity);
    for (let at = sink; at !== source; at = parents[at][0]) {
      const [from, index] = parents[at], e = graph[from][index];
      e.capacity -= amount; graph[at][e.reverse].capacity += amount;
    }
  }
  for (const {subject, sessions, edge:e} of links) subject.selected.push(...sessions.slice(0, e.original - e.capacity));
}

function generatePlan({ schedule, records, preferences, today }) {
  const prefs = validatePreferences(preferences);
  const timetable = validateSchedule(schedule);
  if (!timetable.length) return { status:'setup_required', setupRequired:true, recommendations:[], summary:'Upload or enter your timetable first.' };
  const start = prefs.semesterStart > today ? prefs.semesterStart : dateAfter(today);
  const holidayDates = new Set();
  for (let year = Number(prefs.semesterStart.slice(0,4)); year <= Number(prefs.semesterEnd.slice(0,4)); year++) {
    for (const suffix of ['01-26', '08-15', '10-02']) holidayDates.add(year + '-' + suffix);
  }
  for (const date of collegeCalendar.dates) {
    if (!dateValid(date)) throw new Error('Invalid date in the university holiday configuration.');
    holidayDates.add(date);
  }
  const subjects = new Map();
  const ensure = subject => {
    const key = keyFor(subject);
    if (!subjects.has(key)) subjects.set(key, {subject, held:0, attended:0, remaining:[], eligible:[], selected:[]});
    return subjects.get(key);
  };
  timetable.forEach(entry => ensure(entry.subject));
  for (const record of records) {
    const instant = new Date(record.date);
    if (Number.isNaN(instant.getTime()) || !record.subject || !['present','absent'].includes(record.status)) continue;
    // Attendance uploads are date-only records; use their stored calendar date.
    const date = instant.toISOString().slice(0,10);
    if (date < prefs.semesterStart || date > today || date > prefs.semesterEnd) continue;
    const subject = ensure(record.subject);
    subject.held++;
    if (record.status === 'present') subject.attended++;
  }
  for (let date = start; date <= prefs.semesterEnd; date = dateAfter(date)) {
    const index = new Date(date + 'T00:00:00Z').getUTCDay();
    if (index === 0 || index === 6 || holidayDates.has(date)) continue;
    const day = DAYS[index - 1];
    for (const entry of timetable.filter(e => e.day === day)) {
      const session = {subject:entry.subject, day, date, time:entry.time, duration:entry.duration};
      const subject = ensure(entry.subject);
      subject.remaining.push(session);
      const window = prefs.availability[day.slice(0,3)];
      if (window.enabled && minutes(entry.time) >= minutes(window.start) && minutes(entry.time) + entry.duration <= minutes(window.end)) subject.eligible.push(session);
    }
  }
  const ordered = [...subjects.values()].map(subject => ({
    ...subject,
    currentAttendance:subject.held ? round(100 * subject.attended / subject.held) : null,
    requiredSessions:Math.max(0, Math.ceil(prefs.targetAttendance / 100 * (subject.held + subject.remaining.length) - subject.attended - 1e-9)),
  })).sort((a,b) => (a.currentAttendance ?? 100) - (b.currentAttendance ?? 100));
  allocate(ordered, prefs.maxClassesPerDay);
  const recommendations = ordered.map(subject => {
    const denominator = subject.held + subject.remaining.length;
    const shortage = Math.max(0, subject.requiredSessions - subject.selected.length);
    const reason = !shortage ? null : subject.requiredSessions > subject.remaining.length
      ? 'Not enough classes remain in this semester, even with full availability.'
      : subject.requiredSessions > subject.eligible.length
        ? 'Widen your availability to include additional scheduled classes.'
        : 'Increase the daily class limit or widen availability to balance subjects across more days.';
    return {
      subject:subject.subject, currentAttendance:subject.currentAttendance,
      attended:subject.attended, held:subject.held, remainingClasses:subject.remaining.length,
      eligibleClasses:subject.eligible.length, requiredSessions:subject.requiredSessions,
      selectedClasses:subject.selected.length, shortage, reason,
      projectedAttendance:denominator ? round(100 * (subject.attended + subject.selected.length) / denominator) : null,
      priority:shortage ? 'CRITICAL' : subject.currentAttendance !== null && subject.currentAttendance < prefs.targetAttendance ? 'REQUIRED' : 'SAFE',
      recommendedDates:subject.selected.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)),
      additionalOptions:subject.remaining.filter(s=>!subject.eligible.includes(s)).slice(0,5),
    };
  });
  const sessions = recommendations.flatMap(subject => subject.recommendedDates).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const shortage = recommendations.reduce((sum,s)=>sum+s.shortage,0);
  const total = recommendations.reduce((sum,s)=>sum+s.held+s.remainingClasses,0);
  const attended = recommendations.reduce((sum,s)=>sum+s.attended,0);
  const holidays = [...holidayDates].filter(date=>date>=start&&date<=prefs.semesterEnd).sort();
  return {
    status:shortage ? 'infeasible' : start > prefs.semesterEnd ? 'complete' : 'ready',
    feasible:shortage===0, recommendations, sessions, shortage,
    planningStart:start, semesterStart:prefs.semesterStart, semesterEnd:prefs.semesterEnd,
    targetAttendance:prefs.targetAttendance, projectedAttendance:total ? round(100*(attended+sessions.length)/total) : null,
    holidays, priorityLevel:shortage?'CRITICAL':'SAFE',
    summary:shortage ? 'The saved plan falls short of the target by ' + shortage + ' class sessions. Review the subject-specific actions below.' : start > prefs.semesterEnd ? 'This semester has ended. Review your recorded attendance.' : 'A personalized plan has been generated for your saved availability and attendance target.',
    assumptions:[
      'Plans start tomorrow (India time), or on the semester start date if later. Today’s attendance must be up to date.',
      'Only recorded attendance within this semester is counted as past attendance. Future classes repeat the reviewed weekly timetable.',
      'Fixed national holidays (26 January, 15 August, 2 October) and configured university closures are excluded. Festival and other college holidays require entries in the university calendar.',
      'The target is applied to each subject. Predictions assume every recommended session is attended and the college timetable does not change.'
    ],
  };
}
module.exports = { generatePlan };
